import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email configuration
const EMAIL_CONFIG = {
  welcomeFrom: "ShelVey <welcome@shelvey.pro>",
  supportFrom: "ShelVey Support <support@shelvey.pro>",
  adminFrom: "ShelVey <admin@shelvey.pro>",
  notificationsFrom: "ShelVey Notifications <notifications@shelvey.pro>",
};

// Email templates
const getWelcomeEmailHtml = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #10B981; }
    .content { background: #f9fafb; padding: 30px; border-radius: 12px; }
    .button { display: inline-block; background: #10B981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SHEL<span style="color: #059669;">VEY</span></div>
    </div>
    <div class="content">
      <h1>Welcome to ShelVey, ${name}! 🎉</h1>
      <p>Thank you for joining ShelVey – your autonomous AI workforce is ready to start building your business.</p>
      <p>Here's what you can do next:</p>
      <ul>
        <li>✅ Meet your CEO Agent and discuss your business idea</li>
        <li>✅ Set up your API keys for enhanced agent capabilities</li>
        <li>✅ Start your first business project</li>
      </ul>
      <p>Your 14-day trial has started. During this time, you'll have full access to all our features.</p>
      <a href="https://shelvey.pro/dashboard" class="button">Go to Dashboard</a>
      <p>If you have any questions, our support team is here to help at support@shelvey.pro.</p>
      <p>Best regards,<br>The ShelVey Team</p>
    </div>
    <div class="footer">
      <p>ShelVey, LLC | 131 Continental Dr Suite 305, Newark, DE, 19713 US</p>
      <p>© ${new Date().getFullYear()} ShelVey. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const getVerificationEmailHtml = (name: string, verifyUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #10B981; }
    .content { background: #f9fafb; padding: 30px; border-radius: 12px; }
    .button { display: inline-block; background: #10B981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SHEL<span style="color: #059669;">VEY</span></div>
    </div>
    <div class="content">
      <h1>Verify Your Email</h1>
      <p>Hi ${name},</p>
      <p>Thanks for signing up for ShelVey! Please verify your email address to get started.</p>
      <a href="${verifyUrl}" class="button">Verify Email Address</a>
      <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>ShelVey, LLC | 131 Continental Dr Suite 305, Newark, DE, 19713 US</p>
    </div>
  </div>
</body>
</html>
`;

const getPasswordResetEmailHtml = (name: string, resetUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #10B981; }
    .content { background: #f9fafb; padding: 30px; border-radius: 12px; }
    .button { display: inline-block; background: #10B981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SHEL<span style="color: #059669;">VEY</span></div>
    </div>
    <div class="content">
      <h1>Reset Your Password</h1>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Click the button below to choose a new password.</p>
      <a href="${resetUrl}" class="button">Reset Password</a>
      <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>ShelVey, LLC | 131 Continental Dr Suite 305, Newark, DE, 19713 US</p>
    </div>
  </div>
</body>
</html>
`;

const getActivityEmailHtml = (name: string, activity: string, details: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #10B981; }
    .content { background: #f9fafb; padding: 30px; border-radius: 12px; }
    .activity-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10B981; margin: 20px 0; }
    .button { display: inline-block; background: #10B981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SHEL<span style="color: #059669;">VEY</span></div>
    </div>
    <div class="content">
      <h1>${activity}</h1>
      <p>Hi ${name},</p>
      <div class="activity-box">
        ${details}
      </div>
      <a href="https://shelvey.pro/dashboard" class="button">View in Dashboard</a>
    </div>
    <div class="footer">
      <p>ShelVey, LLC | 131 Continental Dr Suite 305, Newark, DE, 19713 US</p>
    </div>
  </div>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  console.log("[auth-email-handler] Function invoked");
  console.log("[auth-email-handler] Method:", req.method);
  
  if (req.method === "OPTIONS") {
    console.log("[auth-email-handler] Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[auth-email-handler] Request body:", JSON.stringify(body));
    
    const { type, userId, email, name, data } = body;
    console.log(`[auth-email-handler] Processing ${type} email for:`, email || userId);
    
    // Check if RESEND_API_KEY is configured
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("[auth-email-handler] RESEND_API_KEY is not configured!");
      throw new Error("Email service not configured - missing RESEND_API_KEY");
    }
    console.log("[auth-email-handler] RESEND_API_KEY is configured (length:", resendKey.length, ")");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let toEmail = email;
    let userName = name || "there";

    // If userId provided, fetch user details
    if (userId && !email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
        .single();
      
      if (profile) {
        toEmail = profile.email;
        userName = profile.full_name || "there";
      }
    }

    if (!toEmail) {
      throw new Error("No email address provided");
    }

    let emailResponse;

    console.log("[auth-email-handler] Sending email type:", type, "to:", toEmail, "name:", userName);
    
    switch (type) {
      case "welcome":
        console.log("[auth-email-handler] Preparing welcome email...");
        console.log("[auth-email-handler] From:", EMAIL_CONFIG.welcomeFrom);
        emailResponse = await resend.emails.send({
          from: EMAIL_CONFIG.welcomeFrom,
          to: [toEmail],
          subject: "Welcome to ShelVey – Your AI Workforce Awaits! 🚀",
          html: getWelcomeEmailHtml(userName),
        });
        console.log("[auth-email-handler] Welcome email response:", JSON.stringify(emailResponse));
        break;

      case "verification":
        const verifyUrl = data?.verifyUrl || `${Deno.env.get("SITE_URL") || "https://shelvey.pro"}/auth/verify`;
        emailResponse = await resend.emails.send({
          from: EMAIL_CONFIG.adminFrom,
          to: [toEmail],
          subject: "Verify Your ShelVey Account",
          html: getVerificationEmailHtml(userName, verifyUrl),
        });
        break;

      case "password_reset":
        const resetUrl = data?.resetUrl || `${Deno.env.get("SITE_URL") || "https://shelvey.pro"}/reset-password`;
        emailResponse = await resend.emails.send({
          from: EMAIL_CONFIG.supportFrom,
          to: [toEmail],
          subject: "Reset Your ShelVey Password",
          html: getPasswordResetEmailHtml(userName, resetUrl),
        });
        break;

      case "subscription_started":
        emailResponse = await resend.emails.send({
          from: EMAIL_CONFIG.adminFrom,
          to: [toEmail],
          subject: "Subscription Activated – Welcome to ShelVey Pro! 🎉",
          html: getActivityEmailHtml(userName, "Subscription Activated", `
            <p>Your subscription is now active!</p>
            <p><strong>Plan:</strong> ${data?.plan || "Standard"}</p>
            <p>You now have full access to all ShelVey features. Your AI agents are ready to start building your business.</p>
          `),
        });
        break;

      case "subscription_cancelled":
        emailResponse = await resend.emails.send({
          from: EMAIL_CONFIG.supportFrom,
          to: [toEmail],
          subject: "Subscription Cancelled – We're Sorry to See You Go",
          html: getActivityEmailHtml(userName, "Subscription Cancelled", `
            <p>Your subscription has been cancelled.</p>
            <p>You'll continue to have access until the end of your billing period.</p>
            <p>If you have any feedback or questions, please don't hesitate to reach out to us at support@shelvey.pro.</p>
          `),
        });
        break;

      case "project_created":
        emailResponse = await resend.emails.send({
          from: EMAIL_CONFIG.notificationsFrom,
          to: [toEmail],
          subject: `New Project Created: ${data?.projectName || "Your Project"}`,
          html: getActivityEmailHtml(userName, "Project Created Successfully", `
            <p>Your new project "<strong>${data?.projectName || "New Project"}</strong>" has been created.</p>
            <p>Your AI agents are now analyzing your business idea and preparing to start work.</p>
          `),
        });
        break;

      case "phase_started":
        emailResponse = await resend.emails.send({
          from: EMAIL_CONFIG.notificationsFrom,
          to: [toEmail],
          subject: `Phase ${data?.phaseNumber || ""} Started: ${data?.phaseName || ""}`,
          html: getActivityEmailHtml(userName, `Phase ${data?.phaseNumber || ""} Started`, `
            <p>A new phase has begun for your project.</p>
            <p><strong>Phase:</strong> ${data?.phaseName || "New Phase"}</p>
            <p><strong>Project:</strong> ${data?.projectName || "Your Project"}</p>
            <p>Your AI team is now working on this phase. You'll receive updates as deliverables are completed.</p>
          `),
        });
        break;

      case "deliverable_ready":
        emailResponse = await resend.emails.send({
          from: EMAIL_CONFIG.notificationsFrom,
          to: [toEmail],
          subject: "Deliverable Ready for Review 📋",
          html: getActivityEmailHtml(userName, "Deliverable Ready for Review", `
            <p>A deliverable is ready for your review.</p>
            <p><strong>Deliverable:</strong> ${data?.deliverableName || "New Deliverable"}</p>
            <p><strong>Type:</strong> ${data?.deliverableType || "Document"}</p>
            <p>Please review and approve to continue progress on your project.</p>
          `),
        });
        break;

      case "website_generated":
        emailResponse = await resend.emails.send({
          from: EMAIL_CONFIG.notificationsFrom,
          to: [toEmail],
          subject: "Your Website Has Been Generated! 🌐",
          html: getActivityEmailHtml(userName, "Website Generated", `
            <p>Exciting news! Your website has been generated and is ready for review.</p>
            <p><strong>Website:</strong> ${data?.websiteName || "Your Website"}</p>
            <p>Review your website and provide feedback if any changes are needed.</p>
          `),
        });
        break;

      case "login_notification":
        emailResponse = await resend.emails.send({
          from: EMAIL_CONFIG.supportFrom,
          to: [toEmail],
          subject: "New Login to Your ShelVey Account",
          html: getActivityEmailHtml(userName, "New Login Detected", `
            <p>We detected a new login to your account.</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>IP Address:</strong> ${data?.ip || "Unknown"}</p>
            <p>If this wasn't you, please change your password immediately and contact support.</p>
          `),
        });
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    console.log("[auth-email-handler] Email sent successfully:", JSON.stringify(emailResponse));

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[auth-email-handler] ERROR:", error.message);
    console.error("[auth-email-handler] Full error:", JSON.stringify(error));
    return new Response(
      JSON.stringify({ error: error.message, details: error }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
