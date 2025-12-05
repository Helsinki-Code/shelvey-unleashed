-- Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create agent_tasks table for task queue
CREATE TABLE public.agent_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE,
  assigned_agent_id TEXT NOT NULL,
  delegated_by TEXT NOT NULL DEFAULT 'ceo',
  task_type TEXT NOT NULL,
  task_description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  mcp_servers_used TEXT[] DEFAULT '{}',
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create generated_websites table
CREATE TABLE public.generated_websites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain_name TEXT,
  html_content TEXT NOT NULL,
  css_content TEXT,
  js_content TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  deployed_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_mcp_usage table for tracking
CREATE TABLE public.agent_mcp_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  mcp_server_id TEXT NOT NULL,
  task_id UUID REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  request_payload JSONB DEFAULT '{}',
  response_payload JSONB DEFAULT '{}',
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_mcp_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_tasks
CREATE POLICY "Users can view own tasks" ON public.agent_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.agent_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.agent_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.agent_tasks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for generated_websites
CREATE POLICY "Users can view own websites" ON public.generated_websites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own websites" ON public.generated_websites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own websites" ON public.generated_websites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own websites" ON public.generated_websites FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for agent_mcp_usage (public for analytics)
CREATE POLICY "Public can view mcp usage" ON public.agent_mcp_usage FOR SELECT USING (true);
CREATE POLICY "Public can insert mcp usage" ON public.agent_mcp_usage FOR INSERT WITH CHECK (true);

-- Enable realtime for agent_tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_tasks;

-- Create triggers
CREATE TRIGGER update_agent_tasks_updated_at BEFORE UPDATE ON public.agent_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_generated_websites_updated_at BEFORE UPDATE ON public.generated_websites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();