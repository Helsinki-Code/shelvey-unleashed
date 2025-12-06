import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const logStep = (step: string, details?: any) => {
  console.log(`[GENERATE-CEO-WELCOME] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user's CEO configuration
    const { data: ceoData, error: ceoError } = await supabaseAdmin
      .from("user_ceos")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (ceoError || !ceoData) {
      throw new Error("CEO not found: " + (ceoError?.message || "No data"));
    }

    logStep("CEO data fetched", { ceoName: ceoData.ceo_name, persona: ceoData.persona });

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name, subscription_tier")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    logStep("Profile fetched", { email: profile.email, tier: profile.subscription_tier });

    // Generate personalized welcome message using AI
    const personaPrompts: Record<string, string> = {
      friendly: "You are warm, enthusiastic, and use casual language with emojis. You're excited to meet new people.",
      professional: "You are polished, formal, and business-focused. You maintain professionalism while being approachable.",
      direct: "You are straightforward, efficient, and get to the point. No fluff, just clear communication.",
      nurturing: "You are supportive, patient, and caring. You make people feel comfortable and encouraged.",
      visionary: "You are inspiring, big-picture thinking, and motivational. You paint exciting futures.",
    };

    const stylePrompts: Record<string, string> = {
      casual: "Use casual language, contractions, and occasional emojis.",
      formal: "Use formal language, proper grammar, and no emojis.",
      inspirational: "Use motivating language, powerful words, and encourage big dreams.",
      "data-driven": "Use facts, metrics, and logical reasoning in your communication.",
    };

    const planName = profile.subscription_tier === 'dfy' ? 'DFY (Done-For-You) Plan' : 'Standard Plan';
    const planFeatures = profile.subscription_tier === 'dfy' 
      ? [
          "Pre-configured API keys (no setup needed)",
          "All 25 AI Agents at your service",
          "27+ MCP Server integrations",
          "Premium analytics dashboard",
          "24/7 priority support"
        ]
      : [
          "Full access to 25 AI Agents",
          "27+ MCP Server integrations",
          "AI website generation & hosting",
          "6-phase business building pipeline",
          "Real-time agent monitoring"
        ];

    const aiPrompt = `You are ${ceoData.ceo_name}, an AI CEO at ShelVey. ${personaPrompts[ceoData.persona] || personaPrompts.friendly} ${stylePrompts[ceoData.communication_style] || stylePrompts.casual}

Write a personalized welcome email to ${profile.full_name || 'our new team member'} who just subscribed to the ${planName}.

The email should:
1. Introduce yourself by name
2. Express excitement about working together
3. Mention their plan: ${planName}
4. Highlight key features they now have access to
5. Encourage them to start their first business project
6. End with a warm closing

Keep it under 300 words. Be authentic to your persona. Sign with your name.

Features to mention:
${planFeatures.map(f => `- ${f}`).join('\n')}`;

    logStep("Generating AI welcome message");

    // Generate welcome text using Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You write personalized emails in the voice and style given." },
          { role: "user", content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI generation failed: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const welcomeText = aiData.choices?.[0]?.message?.content || "";
    logStep("Welcome text generated", { length: welcomeText.length });

    // Generate voice greeting using ElevenLabs
    const voiceGreeting = `Hey ${profile.full_name || 'there'}! I'm ${ceoData.ceo_name}, your AI CEO here at ShelVey. I'm so excited to welcome you aboard! We're going to build something amazing together. Head over to your dashboard and let's get started on your first business project. I can't wait to see what we create!`;

    logStep("Generating voice with ElevenLabs", { voiceId: ceoData.voice_id });

    let welcomeAudioUrl = null;

    if (ELEVENLABS_API_KEY) {
      try {
        const voiceResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ceoData.voice_id}`, {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: voiceGreeting,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8,
              style: 0.5,
              use_speaker_boost: true,
            },
          }),
        });

        if (voiceResponse.ok) {
          const audioBuffer = await voiceResponse.arrayBuffer();
          const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
          
          // Upload to Supabase storage
          const audioFileName = `${userId}/welcome-${Date.now()}.mp3`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from("ceo-assets")
            .upload(audioFileName, new Uint8Array(audioBuffer), {
              contentType: "audio/mpeg",
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrl } = supabaseAdmin.storage
              .from("ceo-assets")
              .getPublicUrl(audioFileName);
            welcomeAudioUrl = publicUrl.publicUrl;
            logStep("Audio uploaded", { url: welcomeAudioUrl });

            // Update CEO record with audio URL
            await supabaseAdmin
              .from("user_ceos")
              .update({ welcome_audio_url: welcomeAudioUrl })
              .eq("user_id", userId);
          }
        } else {
          logStep("Voice generation failed", { status: voiceResponse.status });
        }
      } catch (voiceErr) {
        logStep("Voice generation error", { error: String(voiceErr) });
      }
    }

    // Send welcome email via Resend
    logStep("Sending welcome email via Resend");

    const audioPlayerHtml = welcomeAudioUrl 
      ? `
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
          <p style="color: white; margin: 0 0 12px 0; font-size: 14px;">🎧 Listen to ${ceoData.ceo_name}'s Personal Welcome</p>
          <audio controls style="width: 100%; max-width: 400px;">
            <source src="${welcomeAudioUrl}" type="audio/mpeg">
            Your browser does not support the audio element.
          </audio>
        </div>
      ` 
      : '';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <img src="${ceoData.ceo_image_url}" alt="${ceoData.ceo_name}" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 16px; border: 3px solid #10b981;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${ceoData.ceo_name}</h1>
      <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 14px;">Your AI CEO at ShelVey</p>
    </div>

    ${audioPlayerHtml}

    <!-- Email Content -->
    <div style="background: #1a1a1a; border-radius: 12px; padding: 32px; border: 1px solid #333;">
      <div style="color: #e5e5e5; font-size: 16px; line-height: 1.7; white-space: pre-wrap;">${welcomeText}</div>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin-top: 32px;">
      <a href="https://shelvey.pro/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Go to Dashboard →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #333;">
      <img src="https://isoafhjneixsoygrpgtt.supabase.co/storage/v1/object/public/ceo-assets/shelvey-logo.png" alt="ShelVey" style="height: 32px; margin-bottom: 12px;">
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        ShelVey, LLC | 131 Continental Dr Suite 305, Newark, DE 19713
      </p>
      <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0 0;">
        <a href="https://shelvey.pro/dashboard" style="color: #10b981; text-decoration: none;">Dashboard</a> • 
        <a href="https://shelvey.pro/support" style="color: #10b981; text-decoration: none;">Support</a> • 
        <a href="https://shelvey.pro/terms" style="color: #10b981; text-decoration: none;">Terms</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    if (RESEND_API_KEY) {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${ceoData.ceo_name} <ceo@shelvey.pro>`,
          to: [profile.email],
          subject: `Hey ${profile.full_name || 'there'}! Welcome to ShelVey 🚀`,
          html: emailHtml,
        }),
      });

      if (resendResponse.ok) {
        logStep("Welcome email sent successfully");
        
        // Mark welcome email as sent
        await supabaseAdmin
          .from("user_ceos")
          .update({ welcome_email_sent: true })
          .eq("user_id", userId);
      } else {
        const errText = await resendResponse.text();
        logStep("Resend error", { error: errText });
      }
    }

    return new Response(JSON.stringify({ success: true, welcomeAudioUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
