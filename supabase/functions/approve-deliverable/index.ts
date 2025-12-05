import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

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

    const { deliverableId, websiteId, approver, approved, feedback } = await req.json();

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

      // If not approved, add feedback and request regeneration
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

      // Handle approval
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

      // Check if both approved
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

      // Handle CEO auto-review if requested
      if (approver === 'ceo' && !approved) {
        // Generate CEO feedback using AI
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { 
                role: 'system', 
                content: `You are a CEO reviewing a website for your company. Provide constructive feedback in 2-3 short bullet points. Be specific about design, messaging, and UX improvements.` 
              },
              { 
                role: 'user', 
                content: `Review this website HTML and provide feedback:\n${website.html_content?.substring(0, 3000)}` 
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const ceoFeedback = aiData.choices?.[0]?.message?.content || 'Looks good overall.';

          const feedbackHistory = [...(website.feedback_history || []), {
            from: 'ceo',
            feedback: ceoFeedback,
            timestamp: new Date().toISOString(),
            version: website.version,
          }];

          await supabase
            .from('generated_websites')
            .update({ feedback_history: feedbackHistory })
            .eq('id', websiteId);

          return new Response(JSON.stringify({
            success: true,
            ceoFeedback,
            feedbackHistory,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Handle approval
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
