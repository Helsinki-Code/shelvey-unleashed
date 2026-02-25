import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return json({ success: false, error: "Unauthorized" }, 401);

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.id) return json({ success: false, error: "Unauthorized" }, 401);

    const payload = await req.json().catch(() => ({}));
    const action = payload?.action || "get";

    if (action === "get") {
      const { data, error } = await supabase
        .from("user_ceos")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return json({ success: true, ceo: data || null });
    }

    if (action === "upsert") {
      const ceo = payload?.ceo || {};
      const { data, error } = await supabase
        .from("user_ceos")
        .upsert({
          user_id: user.id,
          ceo_name: ceo.ceo_name,
          ceo_image_url: ceo.ceo_image_url || null,
          persona: ceo.persona || null,
          voice_id: ceo.voice_id || null,
          language: ceo.language || null,
          communication_style: ceo.communication_style || null,
          gender: ceo.gender || null,
          personality_traits: ceo.personality_traits || null,
        }, { onConflict: "user_id" })
        .select("*")
        .single();
      if (error) throw error;
      return json({ success: true, ceo: data });
    }

    return json({ success: false, error: "Unknown action" }, 400);
  } catch (error: any) {
    console.error("[ceo-profile-gateway] error:", error);
    return json({ success: false, error: error?.message || "Unknown error" }, 500);
  }
});
