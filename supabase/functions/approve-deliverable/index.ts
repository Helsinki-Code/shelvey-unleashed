import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CEO Review result with full details
interface CEOReviewResult {
  approved: boolean;
  feedback: string;
  quality_score: number;
  strengths: string[];
  improvements: string[];
}

// CEO Review function using AI - returns full review details
async function performCEOReview(deliverable: any, lovableApiKey: string): Promise<CEOReviewResult> {
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
  "feedback": "<constructive CEO comment explaining your decision>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>"]
}

Only approve if quality_score is 7 or higher. Be specific in your feedback about what needs to change if not approved.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a discerning CEO with high standards. Be constructive but thorough in your reviews. Always provide actionable feedback." },
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
        quality_score: review.quality_score || 0,
        strengths: review.strengths || [],
        improvements: review.improvements || [],
      };
    }
  } catch (e) {
    console.error('Failed to parse CEO review:', e);
  }

  // Fallback
  return {
    approved: false,
    feedback: 'Unable to parse review. Please try again.',
    quality_score: 0,
    strengths: [],
    improvements: [],
  };
}

// Send notification helper
async function sendNotification(supabaseUrl: string, supabaseKey: string, userId: string, type: string, title: string, message: string, metadata: any = {}) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ userId, type, title, message, metadata }),
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

// Check phase completion and trigger next phase - FIXED: accepts phaseId and userId directly
async function checkPhaseCompletion(supabase: any, phaseId: string, userId: string, supabaseUrl: string, supabaseKey: string) {
  console.log(`[checkPhaseCompletion] START - Checking phase ${phaseId} for user ${userId}`);
  
  try {
  
  // Re-query ALL deliverables with FRESH data from the database
  const { data: phaseDeliverables, error: delError } = await supabase
    .from('phase_deliverables')
    .select('id, name, ceo_approved, user_approved, status')
    .eq('phase_id', phaseId);

  if (delError) {
    console.error('[checkPhaseCompletion] Error fetching deliverables:', delError);
    return { phaseCompleted: false };
  }

  console.log('[checkPhaseCompletion] Fresh deliverables data:', JSON.stringify(phaseDeliverables, null, 2));

  const allApproved = phaseDeliverables?.every((d: any) => 
    d.ceo_approved === true && d.user_approved === true
  );

  console.log(`[checkPhaseCompletion] All approved: ${allApproved}, count: ${phaseDeliverables?.length}`);

  if (allApproved && phaseDeliverables?.length > 0) {
    // Get phase info
    const { data: phase, error: phaseError } = await supabase
      .from('business_phases')
      .select('*, business_projects(name)')
      .eq('id', phaseId)
      .single();

    if (phaseError) {
      console.error('[checkPhaseCompletion] Error fetching phase:', phaseError);
      return { phaseCompleted: false };
    }

    console.log(`[checkPhaseCompletion] Phase ${phase.phase_number} (${phase.phase_name}) - completing...`);

    if (phase) {
      // Complete current phase
      const { error: updateError } = await supabase
        .from('business_phases')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        })
        .eq('id', phase.id);

      if (updateError) {
        console.error('[checkPhaseCompletion] Error completing phase:', updateError);
      } else {
        console.log(`[checkPhaseCompletion] Phase ${phase.phase_number} marked as completed`);
      }

      // Send phase completion notification
      await sendNotification(
        supabaseUrl,
        supabaseKey,
        userId,
        'phase_completed',
        `Phase ${phase.phase_number} Complete!`,
        `${phase.phase_name} has been completed for ${phase.business_projects?.name || 'your project'}.`,
        { phaseId: phase.id, phaseName: phase.phase_name, phaseNumber: phase.phase_number }
      );

      // Activate next phase
      const nextPhaseNumber = phase.phase_number + 1;
      console.log(`[checkPhaseCompletion] Activating phase ${nextPhaseNumber}...`);
      
      const { data: nextPhase, error: nextPhaseError } = await supabase
        .from('business_phases')
        .update({ 
          status: 'active', 
          started_at: new Date().toISOString() 
        })
        .eq('project_id', phase.project_id)
        .eq('phase_number', nextPhaseNumber)
        .select()
        .single();

      if (nextPhaseError) {
        console.log(`[checkPhaseCompletion] No next phase or error: ${nextPhaseError.message}`);
      } else if (nextPhase) {
        console.log(`[checkPhaseCompletion] Phase ${nextPhaseNumber} (${nextPhase.phase_name}) activated!`);
        
        // Send next phase started notification
        await sendNotification(
          supabaseUrl,
          supabaseKey,
          userId,
          'phase_started',
          `Phase ${nextPhaseNumber} Started!`,
          `${nextPhase.phase_name} is now active. Your agents are ready to work.`,
          { phaseId: nextPhase.id, phaseName: nextPhase.phase_name, phaseNumber: nextPhaseNumber }
        );
      }

        console.log(`[checkPhaseCompletion] SUCCESS: Phase ${phase.phase_number} completed. Phase ${nextPhaseNumber} activated.`);
        
        // Trigger phase-auto-worker to start work on the new phase
        if (nextPhase) {
          console.log(`[checkPhaseCompletion] Triggering phase-auto-worker for phase ${nextPhaseNumber}...`);
          try {
            await fetch(`${supabaseUrl}/functions/v1/phase-auto-worker`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                action: 'start_phase_work',
                userId: userId,
                projectId: phase.project_id,
                phaseId: nextPhase.id,
              }),
            });
            console.log(`[checkPhaseCompletion] phase-auto-worker triggered successfully`);
          } catch (workerError) {
            console.error('[checkPhaseCompletion] Failed to trigger phase-auto-worker:', workerError);
            // Don't fail the whole operation, phase is still activated
          }
        }
        
        return { phaseCompleted: true, nextPhase: nextPhaseNumber };
      }
    }

    console.log('[checkPhaseCompletion] Phase not yet complete');
    return { phaseCompleted: false };
  } catch (error) {
    console.error('[checkPhaseCompletion] CRITICAL ERROR:', error);
    return { phaseCompleted: false, error: String(error) };
  }
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
        
        // Store FULL CEO review details in feedback_history
        const ceoReviewEntry = {
          source: 'CEO Agent',
          type: 'ceo_review',
          feedback: review.feedback,
          quality_score: review.quality_score,
          strengths: review.strengths,
          improvements: review.improvements,
          approved: review.approved,
          timestamp: new Date().toISOString(),
        };
        
        const feedbackHistory = [...(deliverable.feedback_history || []), ceoReviewEntry];

        // Update deliverable with CEO review and set status based on approval
        await supabase
          .from('phase_deliverables')
          .update({
            ceo_approved: review.approved,
            reviewed_by: 'CEO Agent',
            feedback_history: feedbackHistory,
            status: review.approved ? 'review' : 'revision_requested',
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

        // Send email notification for CEO review
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              userId: user.id,
              type: 'ceo_review',
              data: {
                deliverableName: deliverable.name,
                approved: review.approved,
                feedback: review.feedback,
              },
            }),
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }

        // Send notification for deliverable ready for review
        await sendNotification(
          supabaseUrl,
          supabaseKey,
          user.id,
          'deliverable_reviewed',
          review.approved ? 'Deliverable Approved by CEO!' : 'Deliverable Needs Revision',
          `${deliverable.name} has been ${review.approved ? 'approved' : 'reviewed'} by CEO Agent. ${review.approved ? 'Awaiting your approval.' : 'Please review feedback.'}`,
          { deliverableId, deliverableName: deliverable.name, approved: review.approved }
        );

        // Check phase completion if approved - use phase_id and user.id directly
        let phaseStatus = { phaseCompleted: false };
        if (review.approved && deliverable.user_approved) {
          console.log(`[ceo_review] Both CEO and user approved, checking phase completion...`);
          phaseStatus = await checkPhaseCompletion(supabase, deliverable.phase_id, user.id, supabaseUrl, supabaseKey);
        }

        return new Response(JSON.stringify({
          success: true,
          ceoApproved: review.approved,
          feedback: review.feedback,
          quality_score: review.quality_score,
          strengths: review.strengths,
          improvements: review.improvements,
          requiresRegeneration: !review.approved,
          ...phaseStatus,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle user approval
      if (action === 'user_approve') {
        console.log(`[user_approve] Processing user approval for deliverable ${deliverableId}`);
        
        const feedbackHistory = [...(deliverable.feedback_history || [])];
        if (feedback) {
          feedbackHistory.push({
            source: 'User',
            feedback,
            timestamp: new Date().toISOString(),
            approved: true,
          });
        }

        // Update the deliverable with user approval
        const { error: updateError } = await supabase
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

        if (updateError) {
          console.error('[user_approve] Error updating deliverable:', updateError);
          throw updateError;
        }

        console.log(`[user_approve] Deliverable updated, ceo_approved was: ${deliverable.ceo_approved}`);

        // RE-FETCH the deliverable to get confirmed fresh data after update
        const { data: freshDeliverable, error: refetchError } = await supabase
          .from('phase_deliverables')
          .select('id, phase_id, ceo_approved, user_approved')
          .eq('id', deliverableId)
          .single();

        if (refetchError) {
          console.error('[user_approve] Error re-fetching deliverable:', refetchError);
        }

        console.log(`[user_approve] Fresh deliverable data: ceo_approved=${freshDeliverable?.ceo_approved}, user_approved=${freshDeliverable?.user_approved}`);

        // Check phase completion with FRESH data
        let phaseStatus = { phaseCompleted: false };
        if (freshDeliverable?.ceo_approved && freshDeliverable?.user_approved) {
          console.log(`[user_approve] Both approvals confirmed, triggering phase completion check...`);
          phaseStatus = await checkPhaseCompletion(supabase, freshDeliverable.phase_id, user.id, supabaseUrl, supabaseKey);
        }

        return new Response(JSON.stringify({
          success: true,
          userApproved: true,
          fullyApproved: freshDeliverable?.ceo_approved && freshDeliverable?.user_approved,
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
