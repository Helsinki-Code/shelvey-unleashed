-- Persist Phase 3 sandbox session state per (project, user)
CREATE TABLE IF NOT EXISTS public.phase3_sandbox_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.business_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sandbox_id TEXT NOT NULL,
  preview_url TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  preview_engine TEXT NOT NULL DEFAULT 'vercel',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_phase3_sandbox_sessions_project_user
ON public.phase3_sandbox_sessions (project_id, user_id);

CREATE INDEX IF NOT EXISTS idx_phase3_sandbox_sessions_user
ON public.phase3_sandbox_sessions (user_id);

ALTER TABLE public.phase3_sandbox_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'phase3_sandbox_sessions'
      AND policyname = 'Users can view their own phase3 sandbox sessions'
  ) THEN
    CREATE POLICY "Users can view their own phase3 sandbox sessions"
    ON public.phase3_sandbox_sessions
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'phase3_sandbox_sessions'
      AND policyname = 'Users can create their own phase3 sandbox sessions'
  ) THEN
    CREATE POLICY "Users can create their own phase3 sandbox sessions"
    ON public.phase3_sandbox_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'phase3_sandbox_sessions'
      AND policyname = 'Users can update their own phase3 sandbox sessions'
  ) THEN
    CREATE POLICY "Users can update their own phase3 sandbox sessions"
    ON public.phase3_sandbox_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'phase3_sandbox_sessions'
      AND policyname = 'Users can delete their own phase3 sandbox sessions'
  ) THEN
    CREATE POLICY "Users can delete their own phase3 sandbox sessions"
    ON public.phase3_sandbox_sessions
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.phase3_sandbox_sessions;
