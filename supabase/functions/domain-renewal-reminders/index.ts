import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Find domains expiring in 30, 7, and 1 days that haven't been reminded
    const { data: expiringDomains, error: fetchError } = await supabase
      .from('user_domains')
      .select('*, profiles!inner(email, full_name)')
      .eq('status', 'active')
      .or(`expires_at.lte.${thirtyDaysFromNow.toISOString()},expires_at.lte.${sevenDaysFromNow.toISOString()},expires_at.lte.${oneDayFromNow.toISOString()}`)
      .is('reminder_sent_at', null);

    if (fetchError) {
      console.error('Error fetching domains:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiringDomains?.length || 0} domains needing renewal reminders`);

    const results = [];

    for (const domain of expiringDomains || []) {
      const expiresAt = new Date(domain.expires_at);
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine urgency level
      let urgency = 'upcoming';
      let subject = `Your domain ${domain.domain_name} expires in ${daysUntilExpiry} days`;
      
      if (daysUntilExpiry <= 1) {
        urgency = 'critical';
        subject = `⚠️ URGENT: ${domain.domain_name} expires TOMORROW!`;
      } else if (daysUntilExpiry <= 7) {
        urgency = 'warning';
        subject = `⏰ Reminder: ${domain.domain_name} expires in ${daysUntilExpiry} days`;
      }

      const userEmail = (domain as any).profiles?.email;
      const userName = (domain as any).profiles?.full_name || 'there';

      if (!userEmail) {
        console.log(`No email found for domain ${domain.domain_name}`);
        continue;
      }

      // Generate renewal link
      const renewalUrl = `https://shelvey.pro/domains?renew=${domain.id}`;

      try {
        await resend.emails.send({
          from: 'ShelVey Domains <notifications@shelvey.pro>',
          to: [userEmail],
          subject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #ffffff; padding: 40px 20px;">
              <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(34, 197, 94, 0.2);">
                <img src="https://shelvey.pro/logo.png" alt="ShelVey" style="height: 40px; margin-bottom: 24px;">
                
                <h1 style="margin: 0 0 16px; font-size: 24px; color: ${urgency === 'critical' ? '#ef4444' : urgency === 'warning' ? '#f59e0b' : '#22c55e'};">
                  ${urgency === 'critical' ? '⚠️ Domain Expiring Tomorrow!' : urgency === 'warning' ? '⏰ Domain Expiring Soon' : '📅 Domain Renewal Reminder'}
                </h1>
                
                <p style="color: #a1a1aa; margin-bottom: 24px; line-height: 1.6;">
                  Hi ${userName},
                </p>
                
                <p style="color: #a1a1aa; margin-bottom: 24px; line-height: 1.6;">
                  Your domain <strong style="color: #ffffff;">${domain.domain_name}</strong> will expire on 
                  <strong style="color: ${urgency === 'critical' ? '#ef4444' : '#22c55e'};">
                    ${expiresAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </strong>.
                </p>
                
                <p style="color: #a1a1aa; margin-bottom: 32px; line-height: 1.6;">
                  To keep your domain active and avoid losing it, please renew it before the expiration date.
                </p>
                
                <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 32px;">
                  <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 14px;">Renewal Price</p>
                  <p style="margin: 0; font-size: 28px; font-weight: bold; color: #22c55e;">
                    $${(domain.renewal_price || domain.our_price)?.toFixed(2)}/year
                  </p>
                </div>
                
                <a href="${renewalUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Renew Now →
                </a>
                
                <p style="color: #71717a; font-size: 12px; margin-top: 32px; line-height: 1.6;">
                  If you no longer wish to keep this domain, you can let it expire. 
                  Manage all your domains at <a href="https://shelvey.pro/domains" style="color: #22c55e;">shelvey.pro/domains</a>
                </p>
              </div>
              
              <p style="text-align: center; color: #52525b; font-size: 12px; margin-top: 24px;">
                © ${new Date().getFullYear()} ShelVey, LLC. All rights reserved.<br>
                131 Continental Dr Suite 305, Newark, DE 19713
              </p>
            </body>
            </html>
          `,
        });

        // Mark reminder as sent
        await supabase
          .from('user_domains')
          .update({ reminder_sent_at: now.toISOString() })
          .eq('id', domain.id);

        results.push({ domain: domain.domain_name, status: 'sent', urgency });
        console.log(`Reminder sent for ${domain.domain_name} (${urgency})`);
      } catch (emailError) {
        console.error(`Failed to send reminder for ${domain.domain_name}:`, emailError);
        results.push({ domain: domain.domain_name, status: 'failed', error: String(emailError) });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Domain renewal reminder error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
