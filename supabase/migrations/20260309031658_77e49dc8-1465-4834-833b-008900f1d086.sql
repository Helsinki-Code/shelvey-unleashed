
-- Add missing columns to seo_sessions (if table exists) or create it
CREATE TABLE IF NOT EXISTS public.seo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_url TEXT,
  goals TEXT,
  status TEXT NOT NULL DEFAULT 'initializing',
  entry_type TEXT DEFAULT 'url',
  topic TEXT,
  workflow_state JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (safe for existing table)
DO $$ BEGIN
  ALTER TABLE public.seo_sessions ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'url';
  ALTER TABLE public.seo_sessions ADD COLUMN IF NOT EXISTS topic TEXT;
  ALTER TABLE public.seo_sessions ADD COLUMN IF NOT EXISTS goals TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE public.seo_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view own sessions" ON public.seo_sessions;
CREATE POLICY "Users can view own sessions" ON public.seo_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.seo_sessions;
CREATE POLICY "Users can insert own sessions" ON public.seo_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own sessions" ON public.seo_sessions;
CREATE POLICY "Users can update own sessions" ON public.seo_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Allow service role full access (for edge functions)
DROP POLICY IF EXISTS "Service role full access seo_sessions" ON public.seo_sessions;
CREATE POLICY "Service role full access seo_sessions" ON public.seo_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.seo_sessions;
