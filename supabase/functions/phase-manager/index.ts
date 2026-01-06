import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function deliverablesForApproval(phaseNumber: number, deliverables: any[]) {
  // Phase 2 uses a single "brand_assets" deliverable; older projects may have extra deliverables
  if (phaseNumber === 2) {
    return deliverables.filter((d: any) => d.deliverable_type === "brand_assets");
  }
  return deliverables;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, projectId, phaseId, userId, currentPhaseNumber } = await req.json();
    let result: any = {};

    switch (action) {
      case "check_phase_completion": {
        // Check if all deliverables for a phase are approved
        const { data: phase, error: phaseError } = await supabase
          .from("business_phases")
          .select("*, phase_deliverables(*)")
          .eq("id", phaseId)
          .single();

        if (phaseError) throw phaseError;
        if (!phase) throw new ApiError(404, "Phase not found");

        const allDeliverables = phase.phase_deliverables || [];
        const requiredDeliverables = deliverablesForApproval(phase.phase_number, allDeliverables);

        // User-only gating: count deliverables where user_approved = true
        const approvedCount = requiredDeliverables.filter((d: any) => d.user_approved === true)
          .length;
        const totalCount = requiredDeliverables.length;
        const isComplete = totalCount > 0 && approvedCount === totalCount;

        result = {
          phaseId,
          phaseName: phase.phase_name,
          phaseNumber: phase.phase_number,
          totalDeliverables: totalCount,
          approvedDeliverables: approvedCount,
          progress: totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0,
          isComplete,
          canAdvance: isComplete && phase.phase_number < 6,
        };
        break;
      }

      case "advance_phase": {
        // Get current phase (prefer the phase number sent by the client; fall back to status=active)
        let activePhase: any = null;

        if (typeof currentPhaseNumber === "number") {
          const { data: byNumber, error: byNumberError } = await supabase
            .from("business_phases")
            .select("*")
            .eq("project_id", projectId)
            .eq("phase_number", currentPhaseNumber)
            .limit(1)
            .maybeSingle();

          if (byNumberError) throw byNumberError;
          activePhase = byNumber;
        }

        if (!activePhase) {
          const { data: byStatus, error: byStatusError } = await supabase
            .from("business_phases")
            .select("*")
            .eq("project_id", projectId)
            .eq("status", "active")
            .order("phase_number", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (byStatusError) throw byStatusError;
          activePhase = byStatus;
        }

        if (!activePhase) {
          throw new ApiError(400, "No active phase found");
        }

        // Check completion - USER-ONLY GATING: only user_approved must be true
        const { data: deliverablesRaw, error: deliverablesError } = await supabase
          .from("phase_deliverables")
          .select("id, name, deliverable_type, user_approved")
          .eq("phase_id", activePhase.id);

        if (deliverablesError) throw deliverablesError;

        const deliverables = deliverablesRaw || [];
        const requiredDeliverables = deliverablesForApproval(activePhase.phase_number, deliverables);

        const allApproved =
          requiredDeliverables.length > 0 &&
          requiredDeliverables.every((d: any) => d.user_approved === true);

        if (!allApproved) {
          throw new ApiError(
            400,
            "All required deliverables must be approved by you before advancing"
          );
        }

        // Complete current phase
        await supabase
          .from("business_phases")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", activePhase.id);

        // BACKEND PROCESS: Trigger Phase Manager to compile consolidated report
        console.log("[PHASE-MANAGER] Triggering consolidated report generation...");
        try {
          await fetch(`${supabaseUrl}/functions/v1/phase-consolidated-report`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              phaseId: activePhase.id,
              projectId,
              userId,
            }),
          });
          console.log("[PHASE-MANAGER] Consolidated report generation triggered");
        } catch (reportError) {
          console.error("Failed to trigger consolidated report:", reportError);
        }

        // Deactivate current team
        if (activePhase.team_id) {
          await supabase.from("teams").update({ status: "inactive" }).eq("id", activePhase.team_id);

          await supabase
            .from("team_members")
            .update({ status: "idle", current_task: null })
            .eq("team_id", activePhase.team_id);
        }

        // Activate next phase if exists
        if (activePhase.phase_number < 6) {
          const nextPhaseNumber = activePhase.phase_number + 1;

          const { data: nextPhase, error: nextPhaseError } = await supabase
            .from("business_phases")
            .select("*")
            .eq("project_id", projectId)
            .eq("phase_number", nextPhaseNumber)
            .single();

          if (nextPhaseError) throw nextPhaseError;

          await supabase
            .from("business_phases")
            .update({
              status: "active",
              started_at: new Date().toISOString(),
            })
            .eq("id", nextPhase.id);

          // Activate the new team
          if (nextPhase.team_id) {
            await supabase.from("teams").update({ status: "active" }).eq("id", nextPhase.team_id);
          }

          result = {
            success: true,
            message: `Advanced to Phase ${nextPhaseNumber}`,
            completedPhase: activePhase.phase_name,
            newPhase: nextPhase.phase_name,
          };

          // Send phase completion email notification
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                userId,
                type: "phase_completion",
                data: {
                  phaseName: activePhase.phase_name,
                  phaseNumber: activePhase.phase_number,
                  nextPhaseName: nextPhase.phase_name,
                },
              }),
            });
          } catch (emailError) {
            console.error("Failed to send phase completion email:", emailError);
          }
        } else {
          result = {
            success: true,
            message: "All phases completed! Business is ready to launch.",
            completedPhase: activePhase.phase_name,
            projectComplete: true,
          };

          // Send final phase completion email
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                userId,
                type: "phase_completion",
                data: {
                  phaseName: activePhase.phase_name,
                  phaseNumber: activePhase.phase_number,
                },
              }),
            });
          } catch (emailError) {
            console.error("Failed to send final phase completion email:", emailError);
          }
        }
        break;
      }

      case "get_project_progress": {
        const { data: allPhases, error: allPhasesError } = await supabase
          .from("business_phases")
          .select("*, phase_deliverables(*), teams(*)")
          .eq("project_id", projectId)
          .order("phase_number");

        if (allPhasesError) throw allPhasesError;

        const phaseProgress = allPhases?.map((p: any) => {
          const delivs = p.phase_deliverables || [];
          const requiredDeliverables = deliverablesForApproval(p.phase_number, delivs);
          // User-only gating for progress calculation
          const approved = requiredDeliverables.filter((d: any) => d.user_approved === true).length;
          return {
            phaseNumber: p.phase_number,
            phaseName: p.phase_name,
            status: p.status,
            team: p.teams?.name,
            totalDeliverables: requiredDeliverables.length,
            approvedDeliverables: approved,
            progress:
              requiredDeliverables.length > 0
                ? Math.round((approved / requiredDeliverables.length) * 100)
                : 0,
            startedAt: p.started_at,
            completedAt: p.completed_at,
          };
        });

        const completedPhases = phaseProgress?.filter((p: any) => p.status === "completed")
          .length || 0;
        const totalPhases = 6;
        const overallProgress = Math.round((completedPhases / totalPhases) * 100);

        result = {
          phases: phaseProgress,
          overall: {
            completedPhases,
            totalPhases,
            progress: overallProgress,
            currentPhase: phaseProgress?.find((p: any) => p.status === "active"),
          },
        };
        break;
      }

      case "get_current_phase": {
        const { data: currentPhase, error: currentPhaseError } = await supabase
          .from("business_phases")
          .select("*, phase_deliverables(*), teams(*)")
          .eq("project_id", projectId)
          .eq("status", "active")
          .single();

        if (currentPhaseError) throw currentPhaseError;
        result = currentPhase;
        break;
      }

      default:
        result = { error: "Unknown action" };
    }

    // Log activity
    await supabase.from("agent_activity_logs").insert({
      agent_id: "phase-manager",
      agent_name: "Phase Manager System",
      action: action,
      status: "completed",
      metadata: { projectId, phaseId, result },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Phase Manager error:", error);
    const status = typeof error?.status === "number" ? error.status : 500;
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
