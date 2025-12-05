import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function logs REAL agent activity - called when agents actually perform actions
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { agent_id, agent_name, action, status, metadata } = await req.json();

    // Validate required fields
    if (!agent_id || !agent_name || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: agent_id, agent_name, action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the REAL activity
    const { data, error } = await supabase
      .from("agent_activity_logs")
      .insert({
        agent_id,
        agent_name,
        action,
        status: status || 'completed',
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`Logged REAL activity: ${agent_name} - ${action}`);

    return new Response(
      JSON.stringify({ success: true, log: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Activity log error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
