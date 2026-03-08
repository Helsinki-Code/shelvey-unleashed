CREATE TABLE public.seo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_url text NOT NULL,
  goals text,
  status text NOT NULL DEFAULT 'active',
  workflow_state jsonb DEFAULT '{}',
  agent_logs jsonb DEFAULT '[]',
  articles jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.seo_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own seo sessions" ON public.seo_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);