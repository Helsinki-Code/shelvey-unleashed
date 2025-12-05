import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CEO Review function using AI
async function performCEOReview(deliverable: any, lovableApiKey: string): Promise<{ approved: boolean; feedback: string }> {
  const reviewPrompt = `You are the CEO Agent reviewing a ${deliverable.deliverable_type} deliverable for a business project.

Deliverable Name: ${deliverable.name}
Description: ${deliverable.description || 'No description provided'}
Generated Content: ${JSON.stringify(deliverable.generated_content || deliverable.content, null, 2)}

As CEO, evaluate this deliverable on:
1. Quality and professionalism (is it market-ready?)
2. Brand consistency and messaging
3. Strategic alignment with business goals
4. Technical execution

Respond in JSON format only:
{
  "quality_score": <1-10>,
  "approved": <true/false>,
  "feedback": "<constructive feedback>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"]
}

Only approve if quality_score is 7 or higher.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a discerning CEO with high standards. Be constructive but thorough in your reviews." },
        { role: "user", content: reviewPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get CEO review from AI');
  }

  const aiResponse = await response.json();
  const reviewText = aiResponse.choices?.[0]?.message?.content || '';
  
  try {
    const jsonMatch = reviewText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const review = JSON.parse(jsonMatch[0]);
      return {
        approved: review.approved === true && review.quality_score >= 7,
        feedback: review.feedback || 'Review completed',
      };
    }
  } catch (e) {
    console.error('Failed to parse CEO review:', e);
  }

  // Fallback
  return {
    approved: false,
    feedback: 'Unable to parse review. Please try again.',
  };
}

// Check phase completion and trigger next phase
async function checkPhaseCompletion(supabase: any, deliverable: any) {
  // Check if all deliverables in this phase are approved
  const { data: phaseDeliverables } = await supabase
    .from('phase_deliverables')
    .select('*')
    .eq('phase_id', deliverable.phase_id);

  const allApproved = phaseDeliverables?.every((d: any) => 
    d.ceo_approved === true && d.user_approved === true
  );

  if (allApproved && phaseDeliverables?.length > 0) {
    // Get phase info
    const { data: phase } = await supabase
      .from('business_phases')
      .select('*')
      .eq('id', deliverable.phase_id)
      .single();

    if (phase) {
      // Complete current phase
      await supabase
        .from('business_phases')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        })
        .eq('id', phase.id);

      // Activate next phase
      const nextPhaseNumber = phase.phase_number + 1;
      await supabase
        .from('business_phases')
        .update({ 
          status: 'active', 
          started_at: new Date().toISOString() 
        })
        .eq('project_id', phase.project_id)
        .eq('phase_number', nextPhaseNumber);

      console.log(`Phase ${phase.phase_number} completed. Phase ${nextPhaseNumber} activated.`);
      
      return { phaseCompleted: true, nextPhase: nextPhaseNumber };
    }
  }

  return { phaseCompleted: false };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const userSupabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { deliverableId, websiteId, action, approver, approved, feedback } = await req.json();

    // Handle deliverable approval
    if (deliverableId) {
      const { data: deliverable, error: fetchError } = await supabase
        .from('phase_deliverables')
        .select('*')
        .eq('id', deliverableId)
        .single();

      if (fetchError || !deliverable) {
        return new Response(JSON.stringify({ error: 'Deliverable not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle CEO auto-review
      if (action === 'ceo_review') {
        const review = await performCEOReview(deliverable, lovableApiKey);
        
        const feedbackHistory = [...(deliverable.feedback_history || []), {
          source: 'CEO Agent',
          feedback: review.feedback,
          timestamp: new Date().toISOString(),
          approved: review.approved,
        }];

        await supabase
          .from('phase_deliverables')
          .update({
            ceo_approved: review.approved,
            reviewed_by: 'CEO Agent',
            feedback_history: feedbackHistory,
            updated_at: new Date().toISOString(),
          })
          .eq('id', deliverableId);

        // Log activity
        await supabase.from('user_agent_activity').insert({
          user_id: user.id,
          agent_id: 'ceo-agent',
          agent_name: 'CEO Agent',
          action: `Reviewed ${deliverable.deliverable_type}: ${review.approved ? 'Approved' : 'Needs revision'}`,
          status: 'completed',
          result: { deliverableId, approved: review.approved },
        });

        // Check phase completion if approved
        let phaseStatus = { phaseCompleted: false };
        if (review.approved && deliverable.user_approved) {
          phaseStatus = await checkPhaseCompletion(supabase, deliverable);
        }

        return new Response(JSON.stringify({
          success: true,
          ceoApproved: review.approved,
          feedback: review.feedback,
          ...phaseStatus,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle user approval
      if (action === 'user_approve') {
        const feedbackHistory = [...(deliverable.feedback_history || [])];
        if (feedback) {
          feedbackHistory.push({
            source: 'User',
            feedback,
            timestamp: new Date().toISOString(),
            approved: true,
          });
        }

        await supabase
          .from('phase_deliverables')
          .update({
            user_approved: true,
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            feedback_history: feedbackHistory,
            status: deliverable.ceo_approved ? 'approved' : deliverable.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', deliverableId);

        // Check phase completion
        let phaseStatus = { phaseCompleted: false };
        if (deliverable.ceo_approved) {
          phaseStatus = await checkPhaseCompletion(supabase, deliverable);
        }

        return new Response(JSON.stringify({
          success: true,
          userApproved: true,
          fullyApproved: deliverable.ceo_approved,
          ...phaseStatus,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle user rejection with feedback
      if (action === 'user_reject' && feedback) {
        const feedbackHistory = [...(deliverable.feedback_history || []), {
          source: 'User',
          feedback,
          timestamp: new Date().toISOString(),
          approved: false,
        }];

        await supabase
          .from('phase_deliverables')
          .update({
            feedback_history: feedbackHistory,
            status: 'revision_requested',
            updated_at: new Date().toISOString(),
          })
          .eq('id', deliverableId);

        return new Response(JSON.stringify({
          success: true,
          message: 'Feedback submitted, revision requested',
          requiresRegeneration: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Legacy approval handling
      if (!approved && feedback) {
        const feedbackHistory = [...(deliverable.feedback_history || []), {
          from: approver,
          feedback,
          timestamp: new Date().toISOString(),
          approved: false,
        }];

        await supabase
          .from('phase_deliverables')
          .update({
            feedback_history: feedbackHistory,
            status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', deliverableId);

        return new Response(JSON.stringify({
          success: true,
          message: 'Feedback added, regeneration requested',
          requiresRegeneration: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle direct approval
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (approver === 'ceo') {
        updateData.ceo_approved = true;
        updateData.reviewed_by = 'CEO Agent';
      } else if (approver === 'user') {
        updateData.user_approved = true;
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
      }

      const willBeCeoApproved = approver === 'ceo' ? true : deliverable.ceo_approved;
      const willBeUserApproved = approver === 'user' ? true : deliverable.user_approved;

      if (willBeCeoApproved && willBeUserApproved) {
        updateData.status = 'approved';
      }

      const { data: updatedDeliverable, error: updateError } = await supabase
        .from('phase_deliverables')
        .update(updateData)
        .eq('id', deliverableId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log activity
      await supabase.from('user_agent_activity').insert({
        user_id: user.id,
        project_id: deliverable.phase_id,
        agent_id: approver === 'ceo' ? 'ceo-agent' : 'user',
        agent_name: approver === 'ceo' ? 'CEO Agent' : 'User',
        action: `Approved ${deliverable.deliverable_type} deliverable`,
        status: 'completed',
        result: { deliverableId, approver },
      });

      return new Response(JSON.stringify({
        success: true,
        deliverable: updatedDeliverable,
        fullyApproved: willBeCeoApproved && willBeUserApproved,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle website approval
    if (websiteId) {
      const { data: website, error: fetchError } = await supabase
        .from('generated_websites')
        .select('*')
        .eq('id', websiteId)
        .single();

      if (fetchError || !website) {
        return new Response(JSON.stringify({ error: 'Website not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle CEO auto-review for website
      if (action === 'ceo_review') {
        const reviewPrompt = `Review this website HTML for quality, design, UX, and brand alignment. Respond with JSON: { "quality_score": 1-10, "approved": true/false, "feedback": "your feedback" }

Website Name: ${website.name}
HTML (truncated): ${website.html_content?.substring(0, 4000)}`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a CEO reviewing websites. Be constructive and professional.' },
              { role: 'user', content: reviewPrompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const reviewText = aiData.choices?.[0]?.message?.content || '';
          
          let ceoApproved = false;
          let ceoFeedback = 'Review completed';
          
          try {
            const jsonMatch = reviewText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const review = JSON.parse(jsonMatch[0]);
              ceoApproved = review.approved && review.quality_score >= 7;
              ceoFeedback = review.feedback;
            }
          } catch {
            ceoFeedback = reviewText.slice(0, 500);
          }

          const feedbackHistory = [...(website.feedback_history || []), {
            source: 'CEO Agent',
            feedback: ceoFeedback,
            timestamp: new Date().toISOString(),
            approved: ceoApproved,
            version: website.version,
          }];

          await supabase
            .from('generated_websites')
            .update({ 
              feedback_history: feedbackHistory,
              ceo_approved: ceoApproved,
            })
            .eq('id', websiteId);

          return new Response(JSON.stringify({
            success: true,
            ceoApproved,
            ceoFeedback,
            feedbackHistory,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Handle user approval for website
      if (action === 'user_approve') {
        const willBeFullyApproved = website.ceo_approved;
        
        await supabase
          .from('generated_websites')
          .update({
            user_approved: true,
            status: willBeFullyApproved ? 'approved' : website.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', websiteId);

        return new Response(JSON.stringify({
          success: true,
          userApproved: true,
          fullyApproved: willBeFullyApproved,
          readyForHosting: willBeFullyApproved,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle user rejection
      if (action === 'user_reject' && feedback) {
        const feedbackHistory = [...(website.feedback_history || []), {
          source: 'User',
          feedback,
          timestamp: new Date().toISOString(),
          approved: false,
          version: website.version,
        }];

        await supabase
          .from('generated_websites')
          .update({
            feedback_history: feedbackHistory,
            status: 'revision_requested',
            updated_at: new Date().toISOString(),
          })
          .eq('id', websiteId);

        return new Response(JSON.stringify({
          success: true,
          message: 'Feedback submitted for website revision',
          requiresRegeneration: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Legacy approval handling for website
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (approver === 'ceo') {
        updateData.ceo_approved = true;
      } else if (approver === 'user') {
        updateData.user_approved = true;
      }

      const willBeCeoApproved = approver === 'ceo' ? true : website.ceo_approved;
      const willBeUserApproved = approver === 'user' ? true : website.user_approved;

      if (willBeCeoApproved && willBeUserApproved) {
        updateData.status = 'approved';
      }

      const { data: updatedWebsite, error: updateError } = await supabase
        .from('generated_websites')
        .update(updateData)
        .eq('id', websiteId)
        .select()
        .single();

      if (updateError) throw updateError;

      return new Response(JSON.stringify({
        success: true,
        website: updatedWebsite,
        fullyApproved: willBeCeoApproved && willBeUserApproved,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'No deliverableId or websiteId provided' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in approve-deliverable:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
