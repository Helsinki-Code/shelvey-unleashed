import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { websiteId, customDomain } = await req.json();

    if (!websiteId) {
      return new Response(JSON.stringify({ error: "Website ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the website
    const { data: website, error: fetchError } = await supabase
      .from('generated_websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !website) {
      return new Response(JSON.stringify({ error: "Website not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a unique subdomain
    const subdomain = customDomain || `${website.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${websiteId.slice(0, 8)}`;
    
    // In a production environment, this would:
    // 1. Upload HTML/CSS/JS to a CDN or storage bucket
    // 2. Configure DNS for the subdomain
    // 3. Set up SSL certificate
    // For now, we'll simulate deployment by storing as a "deployed" status
    
    const deployedUrl = `https://${subdomain}.shelvey.app`;

    // Update website status
    const { data: updatedWebsite, error: updateError } = await supabase
      .from('generated_websites')
      .update({
        status: 'deployed',
        domain_name: subdomain,
        deployed_url: deployedUrl,
        metadata: {
          ...website.metadata,
          deployedAt: new Date().toISOString(),
          deployedBy: user.id
        }
      })
      .eq('id', websiteId)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update deployment status" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log agent activity
    await supabase.from('user_agent_activity').insert({
      user_id: user.id,
      agent_id: 'agent-4',
      agent_name: 'Code Builder Agent',
      action: 'deploy_website',
      status: 'completed',
      metadata: { websiteId, subdomain },
      result: { deployedUrl }
    });

    return new Response(JSON.stringify({
      success: true,
      deployment: {
        websiteId: updatedWebsite.id,
        name: updatedWebsite.name,
        subdomain,
        deployedUrl,
        status: updatedWebsite.status
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Deploy website error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
