CREATE TABLE IF NOT EXISTS public.phase4_autopilot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.business_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  run_interval_minutes INTEGER NOT NULL DEFAULT 360,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_posts_per_run INTEGER NOT NULL DEFAULT 1,
  auto_publish_site BOOLEAN NOT NULL DEFAULT TRUE,
  auto_publish_medium BOOLEAN NOT NULL DEFAULT FALSE,
  auto_publish_social BOOLEAN NOT NULL DEFAULT TRUE,
  include_parasite_seo BOOLEAN NOT NULL DEFAULT TRUE,
  social_platforms JSONB NOT NULL DEFAULT '["linkedin","twitter"]'::jsonb,
  use_brand_assets BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'idle',
  last_error TEXT,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.phase4_autopilot_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.phase4_autopilot_configs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.business_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'running',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_phase4_autopilot_configs_project_user
ON public.phase4_autopilot_configs (project_id, user_id);

CREATE INDEX IF NOT EXISTS idx_phase4_autopilot_runs_project_created
ON public.phase4_autopilot_runs (project_id, created_at DESC);

ALTER TABLE public.phase4_autopilot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase4_autopilot_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own phase4 autopilot configs"
ON public.phase4_autopilot_configs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own phase4 autopilot configs"
ON public.phase4_autopilot_configs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phase4 autopilot configs"
ON public.phase4_autopilot_configs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own phase4 autopilot configs"
ON public.phase4_autopilot_configs
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own phase4 autopilot runs"
ON public.phase4_autopilot_runs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own phase4 autopilot runs"
ON public.phase4_autopilot_runs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_phase4_autopilot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_phase4_autopilot_updated_at ON public.phase4_autopilot_configs;
CREATE TRIGGER trg_phase4_autopilot_updated_at
BEFORE UPDATE ON public.phase4_autopilot_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_phase4_autopilot_updated_at();
