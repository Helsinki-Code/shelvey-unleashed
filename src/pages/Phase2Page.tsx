import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ImageGenerationStudio } from "@/components/ImageGenerationStudio";
import { PageHeader } from "@/components/PageHeader";
import { ProceedToNextPhaseButton } from "@/components/ProceedToNextPhaseButton";
import { SimpleDashboardSidebar } from "@/components/SimpleDashboardSidebar";
import { StartPhaseButton } from "@/components/StartPhaseButton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Deliverable {
  id: string;
  name: string;
  description: string | null;
  deliverable_type: string;
  status: string | null;
  ceo_approved: boolean | null;
  user_approved: boolean | null;
  generated_content: any;
}

export default function Phase2Page() {
  const { projectId, phaseNumber } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<any>(null);
  const [phase, setPhase] = useState<any>(null);
  const [brandDeliverable, setBrandDeliverable] = useState<Deliverable | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canonicalUrl = useMemo(() => {
    try {
      return window.location.href;
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    if (!projectId || !user) return;
    fetchData();
    const unsubscribe = subscribeToUpdates();
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user]);

  const fetchData = async () => {
    setIsLoading(true);

    const { data: projectData } = await supabase
      .from("business_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectData) setProject(projectData);

    const phaseNum = parseInt(phaseNumber || "2");
    const { data: phaseData } = await supabase
      .from("business_phases")
      .select("*")
      .eq("project_id", projectId)
      .eq("phase_number", phaseNum)
      .single();

    if (phaseData) setPhase(phaseData);

    if (phaseData) {
      const { data: deliverable } = await supabase
        .from("phase_deliverables")
        .select("*")
        .eq("phase_id", phaseData.id)
        .eq("deliverable_type", "brand_assets")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setBrandDeliverable(deliverable ?? null);
    }

    setIsLoading(false);
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel("phase2-brand-assets")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "phase_deliverables" },
        (payload) => {
          const next = payload.new as Deliverable;
          if (next?.deliverable_type === "brand_assets") {
            setBrandDeliverable(next);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const { progressPct, approvedCount, totalCount, isPhaseApproved } = useMemo(() => {
    const assets = (brandDeliverable?.generated_content?.assets ?? []) as any[];
    const total = Array.isArray(assets) ? assets.length : 0;
    const approved = Array.isArray(assets) ? assets.filter((a) => a?.userApproved === true).length : 0;
    const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
    return {
      progressPct: pct,
      approvedCount: approved,
      totalCount: total,
      isPhaseApproved: total > 0 && approved === total,
    };
  }, [brandDeliverable]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Helmet>
        <title>Phase 2 Brand Assets | {project?.name} | ShelVey</title>
        <meta
          name="description"
          content="Generate brand assets and approve images for your brand identity in Phase 2."
        />
        {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
      </Helmet>

      <SimpleDashboardSidebar />

      <main className="flex-1 p-6 ml-64">
        <div className="max-w-7xl mx-auto">
          <header className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate(`/projects/${projectId}`)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Project
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Palette className="w-6 h-6 text-primary" />
                  Phase 2: Brand Assets
                </h1>
                <p className="text-muted-foreground">{project?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={
                  phase?.status === "active"
                    ? "bg-green-500"
                    : phase?.status === "completed"
                      ? "bg-blue-500"
                      : "bg-muted"
                }
              >
                {phase?.status || "pending"}
              </Badge>
              <PageHeader showNotifications={true} showLogout={true} />
            </div>
          </header>

          <section aria-label="Phase 2 progress" className="mb-6">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Phase Progress</span>
                  <span className="font-bold text-lg">{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-3" />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>
                    {approvedCount} of {totalCount || 0} images approved
                  </span>
                  <span>{phase?.status === "completed" ? "Phase Complete!" : "In Progress"}</span>
                </div>
              </CardContent>
            </Card>
          </section>

          <section aria-label="Start Phase" className="mb-6">
            <StartPhaseButton
              projectId={projectId!}
              phaseNumber={2}
              phaseStatus={phase?.status || "pending"}
              onStart={fetchData}
            />
          </section>

          <section aria-label="Brand asset generators" className="space-y-6">
            <ImageGenerationStudio
              projectId={projectId!}
              phaseId={phase?.id}
              agentName="Brand Agent"
              onAssetApproved={() => fetchData()}
            />

            <ProceedToNextPhaseButton
              projectId={projectId!}
              currentPhaseNumber={2}
              isPhaseApproved={isPhaseApproved}
              onProceed={fetchData}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
