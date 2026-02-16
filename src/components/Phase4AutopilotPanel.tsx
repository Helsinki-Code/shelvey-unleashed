import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Play, Save, Bot, Globe, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Strategy = "Contrarian" | "Storyteller" | "Analytical" | "Practical";

interface Phase4AutopilotPanelProps {
  projectId: string;
}

interface AutopilotConfig {
  enabled: boolean;
  run_interval_minutes: number;
  keywords: string[];
  target_posts_per_run: number;
  auto_publish_site: boolean;
  auto_publish_medium: boolean;
  auto_publish_social: boolean;
  include_parasite_seo: boolean;
  social_platforms: string[];
}

const defaultConfig: AutopilotConfig = {
  enabled: false,
  run_interval_minutes: 360,
  keywords: [],
  target_posts_per_run: 1,
  auto_publish_site: true,
  auto_publish_medium: false,
  auto_publish_social: true,
  include_parasite_seo: true,
  social_platforms: ["linkedin", "twitter"],
};

export function Phase4AutopilotPanel({ projectId }: Phase4AutopilotPanelProps) {
  const [config, setConfig] = useState<AutopilotConfig>(defaultConfig);
  const [keywordsText, setKeywordsText] = useState("");
  const [phase3Site, setPhase3Site] = useState<string | null>(null);
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>("Analytical");

  const parsedKeywords = useMemo(
    () =>
      keywordsText
        .split("\n")
        .map((k) => k.trim())
        .filter(Boolean),
    [keywordsText],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke("phase4-autopilot", {
        body: { action: "get_config", projectId },
      });
      if (response.error) throw response.error;

      const data = response.data || {};
      const dbConfig = data.config;
      if (dbConfig) {
        const merged: AutopilotConfig = {
          ...defaultConfig,
          ...dbConfig,
          keywords: Array.isArray(dbConfig.keywords) ? dbConfig.keywords : [],
          social_platforms: Array.isArray(dbConfig.social_platforms) ? dbConfig.social_platforms : defaultConfig.social_platforms,
        };
        setConfig(merged);
        setKeywordsText(merged.keywords.join("\n"));
      }
      setRuns(Array.isArray(data.runs) ? data.runs : []);
      const website = data.phase3Website;
      setPhase3Site(website?.deployed_url || website?.custom_domain || website?.domain_name || null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load autopilot configuration");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await supabase.functions.invoke("phase4-autopilot", {
        body: {
          action: "save_config",
          projectId,
          config: { ...config, keywords: parsedKeywords },
        },
      });
      if (response.error) throw response.error;
      toast.success("Autopilot configuration saved");
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save autopilot configuration");
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const response = await supabase.functions.invoke("phase4-autopilot", {
        body: {
          action: "run_once",
          projectId,
          strategy,
        },
      });
      if (response.error) throw response.error;
      if (response.data?.success === false) throw new Error(response.data.error || "Autopilot run failed");
      toast.success("Autopilot run completed");
      await load();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Autopilot run failed");
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-sm text-muted-foreground">Loading autopilot...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Phase 4 Autopilot Orchestrator
          </CardTitle>
          <CardDescription>
            Uses your deployed Phase 3 website as source context for keyword research, SERP analysis, article generation, media generation, publishing, rank tracking, and social distribution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source Website (Phase 3)</Label>
              <div className="p-2.5 rounded-md border bg-muted/30 text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                {phase3Site ? (
                  <span className="truncate">{phase3Site}</span>
                ) : (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    No deployed Phase 3 site found
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content Strategy Persona</Label>
              <Select value={strategy} onValueChange={(v) => setStrategy(v as Strategy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Analytical">Analytical</SelectItem>
                  <SelectItem value="Practical">Practical</SelectItem>
                  <SelectItem value="Storyteller">Storyteller</SelectItem>
                  <SelectItem value="Contrarian">Contrarian</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Interval (minutes)</Label>
              <Input
                type="number"
                min={30}
                value={config.run_interval_minutes}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, run_interval_minutes: Math.max(30, Number(e.target.value || 30)) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Posts per run</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={config.target_posts_per_run}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, target_posts_per_run: Math.min(5, Math.max(1, Number(e.target.value || 1))) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Social Platforms</Label>
              <Input
                value={config.social_platforms.join(",")}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    social_platforms: e.target.value
                      .split(",")
                      .map((v) => v.trim().toLowerCase())
                      .filter(Boolean),
                  }))
                }
                placeholder="linkedin,twitter,facebook"
              />
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                <Switch checked={config.enabled} onCheckedChange={(v) => setConfig((p) => ({ ...p, enabled: v }))} />
                <span className="text-sm">{config.enabled ? "Enabled" : "Manual"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Keywords (one per line)</Label>
            <Textarea
              className="min-h-[130px]"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder={"best ai automation software\nseo workflow for startups\nlinkedin parasite seo"}
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="flex items-center justify-between gap-2 p-2.5 rounded-md border">
              <span className="text-sm">Publish to site</span>
              <Switch checked={config.auto_publish_site} onCheckedChange={(v) => setConfig((p) => ({ ...p, auto_publish_site: v }))} />
            </label>
            <label className="flex items-center justify-between gap-2 p-2.5 rounded-md border">
              <span className="text-sm">Publish to Medium</span>
              <Switch checked={config.auto_publish_medium} onCheckedChange={(v) => setConfig((p) => ({ ...p, auto_publish_medium: v }))} />
            </label>
            <label className="flex items-center justify-between gap-2 p-2.5 rounded-md border">
              <span className="text-sm">Publish social</span>
              <Switch checked={config.auto_publish_social} onCheckedChange={(v) => setConfig((p) => ({ ...p, auto_publish_social: v }))} />
            </label>
            <label className="flex items-center justify-between gap-2 p-2.5 rounded-md border">
              <span className="text-sm">Parasite SEO</span>
              <Switch checked={config.include_parasite_seo} onCheckedChange={(v) => setConfig((p) => ({ ...p, include_parasite_seo: v }))} />
            </label>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveConfig} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Configuration
            </Button>
            <Button onClick={runNow} disabled={running || !phase3Site} variant="secondary" className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Autopilot Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet.</p>
          ) : (
            runs.map((run) => (
              <div key={String(run.id)} className="p-3 border rounded-md flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Run {String(run.id).slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{String(run.started_at || "")}</p>
                </div>
                <Badge variant={String(run.status) === "completed" ? "default" : String(run.status) === "error" ? "destructive" : "secondary"}>
                  {String(run.status)}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
