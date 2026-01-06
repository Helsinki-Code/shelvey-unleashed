import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      return json(500, { error: "Server is not configured" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "No authorization header" });

    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json(401, { error: "Unauthorized" });

    const user = userData.user;
    const { projectId } = await req.json().catch(() => ({ projectId: null }));

    if (!projectId || typeof projectId !== "string") {
      return json(400, { error: "Missing projectId" });
    }

    // Ownership check
    const { data: project, error: projectError } = await admin
      .from("business_projects")
      .select("id, user_id")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) return json(500, { error: projectError.message });
    if (!project) return json(404, { error: "Project not found" });
    if (project.user_id !== user.id) return json(403, { error: "Forbidden" });

    // Fetch phases to delete deliverables
    const { data: phases, error: phasesError } = await admin
      .from("business_phases")
      .select("id")
      .eq("project_id", projectId);

    if (phasesError) return json(500, { error: phasesError.message });
    const phaseIds = (phases ?? []).map((p) => p.id);

    // Delete dependencies in a safe order (FK constraints)
    const deleteByProjectId = async (table: string) => {
      const { error } = await admin.from(table).delete().eq("project_id", projectId);
      if (error) throw new Error(`${table}: ${error.message}`);
    };

    // Campaign dependencies
    await deleteByProjectId("ad_creatives");
    await deleteByProjectId("social_posts");
    await deleteByProjectId("marketing_campaigns");

    // Deliverable dependencies (must be before deleting deliverables)
    await deleteByProjectId("generated_websites");
    await deleteByProjectId("escalations");

    // Other project-scoped tables
    await deleteByProjectId("agent_messages");
    await deleteByProjectId("agent_conversations");
    await deleteByProjectId("agent_tasks");
    await deleteByProjectId("content_items");
    await deleteByProjectId("influencer_contacts");
    await deleteByProjectId("seo_rankings");
    await deleteByProjectId("progress_reports");
    await deleteByProjectId("code_patches");
    await deleteByProjectId("social_content_library");

    // Delete phase deliverables and phases
    if (phaseIds.length > 0) {
      const { error: delivError } = await admin
        .from("phase_deliverables")
        .delete()
        .in("phase_id", phaseIds);
      if (delivError) throw new Error(`phase_deliverables: ${delivError.message}`);
    }

    const { error: phasesDeleteError } = await admin
      .from("business_phases")
      .delete()
      .eq("project_id", projectId);
    if (phasesDeleteError) throw new Error(`business_phases: ${phasesDeleteError.message}`);

    const { error: projectDeleteError } = await admin
      .from("business_projects")
      .delete()
      .eq("id", projectId);
    if (projectDeleteError) throw new Error(`business_projects: ${projectDeleteError.message}`);

    return json(200, { success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[delete-project]", message);
    return json(500, { error: message });
  }
});
