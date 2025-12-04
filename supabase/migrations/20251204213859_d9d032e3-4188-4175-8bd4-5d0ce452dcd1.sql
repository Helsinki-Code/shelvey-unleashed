-- Agent Activity Logs
CREATE TABLE public.agent_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- MCP Server Status
CREATE TABLE public.mcp_server_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id TEXT NOT NULL UNIQUE,
  server_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  latency_ms INTEGER,
  requests_today INTEGER DEFAULT 0,
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Business Metrics
CREATE TABLE public.business_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  period TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Voice Conversations
CREATE TABLE public.voice_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  transcript TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_server_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_conversations ENABLE ROW LEVEL SECURITY;

-- Public read policies (for dashboard display)
CREATE POLICY "Allow public read on agent_activity_logs" ON public.agent_activity_logs FOR SELECT USING (true);
CREATE POLICY "Allow public read on mcp_server_status" ON public.mcp_server_status FOR SELECT USING (true);
CREATE POLICY "Allow public read on business_metrics" ON public.business_metrics FOR SELECT USING (true);
CREATE POLICY "Allow public read on voice_conversations" ON public.voice_conversations FOR SELECT USING (true);

-- Public insert policies (for logging)
CREATE POLICY "Allow public insert on agent_activity_logs" ON public.agent_activity_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on mcp_server_status" ON public.mcp_server_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on business_metrics" ON public.business_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on voice_conversations" ON public.voice_conversations FOR INSERT WITH CHECK (true);

-- Public update for mcp_server_status
CREATE POLICY "Allow public update on mcp_server_status" ON public.mcp_server_status FOR UPDATE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mcp_server_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_conversations;