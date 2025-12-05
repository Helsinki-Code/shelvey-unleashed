import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting MCP activity simulation...");

    // Get all MCP servers
    const { data: servers, error: fetchError } = await supabase
      .from("mcp_server_status")
      .select("*");

    if (fetchError) {
      console.error("Error fetching servers:", fetchError);
      throw fetchError;
    }

    if (!servers || servers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No servers to update" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simulate activity for each server
    const updates = servers.map(async (server) => {
      // Only update connected and syncing servers
      if (server.status === "requires-key") {
        return null;
      }

      // Generate realistic latency variation
      const baseLatency = server.latency_ms || 50;
      const variation = Math.floor(Math.random() * 20) - 10;
      const newLatency = Math.max(5, baseLatency + variation);

      // Generate realistic request increment
      const requestIncrement = Math.floor(Math.random() * 15) + 1;

      const { error: updateError } = await supabase
        .from("mcp_server_status")
        .update({
          latency_ms: newLatency,
          requests_today: (server.requests_today || 0) + requestIncrement,
          last_ping: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("server_id", server.server_id);

      if (updateError) {
        console.error(`Error updating ${server.server_id}:`, updateError);
        return { server_id: server.server_id, error: updateError };
      }

      return {
        server_id: server.server_id,
        latency: newLatency,
        requests_added: requestIncrement,
      };
    });

    const results = await Promise.all(updates);
    const successCount = results.filter((r) => r && !r.error).length;

    console.log(`Updated ${successCount} servers`);

    // Also log some agent activity
    const agentActions = [
      "Processed API request",
      "Analyzed data stream",
      "Executed automation task",
      "Generated content",
      "Completed scraping job",
      "Sent notification",
      "Updated cache",
      "Synchronized data",
    ];

    const agentNames = [
      "Market Research Agent",
      "Code Builder Agent",
      "SEO Optimization Agent",
      "Social Media Manager Agent",
      "Sales Development Agent",
      "Analytics Specialist Agent",
    ];

    const randomAgent = agentNames[Math.floor(Math.random() * agentNames.length)];
    const randomAction = agentActions[Math.floor(Math.random() * agentActions.length)];
    const agentId = `agent-${Math.floor(Math.random() * 25) + 1}`;

    await supabase.from("agent_activity_logs").insert({
      agent_id: agentId,
      agent_name: randomAgent,
      action: randomAction,
      status: Math.random() > 0.1 ? "completed" : "pending",
      metadata: { timestamp: new Date().toISOString(), source: "mcp-simulation" },
    });

    return new Response(
      JSON.stringify({
        success: true,
        updated: successCount,
        total: servers.length,
        results: results.filter((r) => r !== null),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Simulation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
