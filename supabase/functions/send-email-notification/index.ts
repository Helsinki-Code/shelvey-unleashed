import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-EMAIL] ${step}${detailsStr}`);
};

interface EmailNotificationRequest {
  userId: string;
  type: 'ceo_review' | 'phase_completion' | 'deliverable_approved' | 'project_created' | 'subscription_update';
  data: {
    projectName?: string;
    deliverableName?: string;
    phaseName?: string;
    phaseNumber?: number;
    approved?: boolean;
    feedback?: string;
    nextPhaseName?: string;
  };
}

const getEmailTemplate = (type: string, data: any, email: string): { subject: string; html: string } => {
  switch (type) {
    case 'ceo_review':
      return {
        subject: `CEO Review: ${data.deliverableName} - ${data.approved ? 'Approved' : 'Needs Revision'}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0a3d2e 0%, #1a5c45 100%); padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #22c55e; font-size: 28px; margin: 0;">ShelVey</h1>
              <p style="color: #9ca3af; margin-top: 5px;">AI Business Building Platform</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.2);">
              <h2 style="color: #fff; margin-top: 0;">CEO Agent Review Complete</h2>
              <p style="color: #d1d5db; line-height: 1.6;">
                The CEO Agent has reviewed your deliverable <strong style="color: #22c55e;">${data.deliverableName}</strong>
                ${data.projectName ? ` for project <strong style="color: #22c55e;">${data.projectName}</strong>` : ''}.
              </p>
              <div style="background: ${data.approved ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${data.approved ? '#22c55e' : '#ef4444'};">
                <p style="color: ${data.approved ? '#22c55e' : '#ef4444'}; font-weight: bold; margin: 0 0 10px 0;">
                  ${data.approved ? '✓ Approved' : '✗ Needs Revision'}
                </p>
                ${data.feedback ? `<p style="color: #d1d5db; margin: 0; font-style: italic;">"${data.feedback}"</p>` : ''}
              </div>
              <a href="https://shelvey.pro/dashboard" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View in Dashboard</a>
            </div>
          </div>
        `,
      };
    
    case 'phase_completion':
      return {
        subject: `Phase ${data.phaseNumber} Complete: ${data.phaseName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0a3d2e 0%, #1a5c45 100%); padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #22c55e; font-size: 28px; margin: 0;">ShelVey</h1>
              <p style="color: #9ca3af; margin-top: 5px;">AI Business Building Platform</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.2);">
              <h2 style="color: #fff; margin-top: 0;">🎉 Phase Complete!</h2>
              <p style="color: #d1d5db; line-height: 1.6;">
                Great news! <strong style="color: #22c55e;">Phase ${data.phaseNumber}: ${data.phaseName}</strong> has been completed
                ${data.projectName ? ` for your project <strong style="color: #22c55e;">${data.projectName}</strong>` : ''}.
              </p>
              ${data.nextPhaseName ? `
                <div style="background: rgba(34, 197, 94, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
                  <p style="color: #22c55e; font-weight: bold; margin: 0 0 5px 0;">Next Up:</p>
                  <p style="color: #d1d5db; margin: 0;">Phase ${data.phaseNumber + 1}: ${data.nextPhaseName}</p>
                </div>
              ` : `
                <div style="background: rgba(168, 85, 247, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #a855f7;">
                  <p style="color: #a855f7; font-weight: bold; margin: 0;">🚀 All Phases Complete!</p>
                  <p style="color: #d1d5db; margin: 5px 0 0 0;">Your business is ready to launch!</p>
                </div>
              `}
              <a href="https://shelvey.pro/pipeline" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Pipeline</a>
            </div>
          </div>
        `,
      };

    case 'deliverable_approved':
      return {
        subject: `Deliverable Approved: ${data.deliverableName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0a3d2e 0%, #1a5c45 100%); padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #22c55e; font-size: 28px; margin: 0;">ShelVey</h1>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.2);">
              <h2 style="color: #fff; margin-top: 0;">✓ Deliverable Fully Approved</h2>
              <p style="color: #d1d5db; line-height: 1.6;">
                <strong style="color: #22c55e;">${data.deliverableName}</strong> has been approved by both the CEO Agent and you!
              </p>
              <a href="https://shelvey.pro/pipeline" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Progress</a>
            </div>
          </div>
        `,
      };

    default:
      return {
        subject: `ShelVey Notification`,
        html: `<p>You have a new notification from ShelVey.</p>`,
      };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, type, data }: EmailNotificationRequest = await req.json();

    if (!userId || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("Processing email notification", { userId, type });

    // Get user email from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.email) {
      logStep("User profile not found or no email", { error: profileError?.message });
      return new Response(
        JSON.stringify({ error: 'User email not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { subject, html } = getEmailTemplate(type, data, profile.email);

    logStep("Sending email", { to: profile.email, subject });

    const emailResponse = await resend.emails.send({
      from: 'ShelVey <notifications@shelvey.pro>',
      to: [profile.email],
      subject,
      html,
    });

    if (emailResponse.error) {
      logStep("Email send error", { error: emailResponse.error });
      throw new Error(emailResponse.error.message);
    }

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    // Also create an in-app notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title: subject,
      message: data.feedback || `${type.replace(/_/g, ' ')} notification`,
      metadata: data,
      read: false,
    });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
