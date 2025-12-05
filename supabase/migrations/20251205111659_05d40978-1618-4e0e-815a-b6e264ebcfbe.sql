-- Team meetings table for daily standups, reviews, planning
CREATE TABLE public.team_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('standup', 'review', 'planning', 'emergency', 'handoff')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attendees JSONB DEFAULT '[]'::jsonb,
  agenda JSONB DEFAULT '[]'::jsonb,
  minutes TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  decisions JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent messages for inter-agent communication
CREATE TABLE public.agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  from_agent_id TEXT NOT NULL,
  from_agent_name TEXT NOT NULL,
  to_agent_id TEXT,
  to_agent_name TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('request_help', 'status_update', 'handoff', 'question', 'answer', 'feedback', 'collaboration', 'broadcast')),
  subject TEXT,
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES public.agent_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Progress reports submitted by agents to their managers
CREATE TABLE public.progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  report_to_agent_id TEXT NOT NULL,
  report_to_agent_name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'task_complete', 'blocker', 'milestone', 'phase_complete', 'weekly')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  deliverables_completed JSONB DEFAULT '[]'::jsonb,
  tasks_in_progress JSONB DEFAULT '[]'::jsonb,
  blockers JSONB DEFAULT '[]'::jsonb,
  next_steps JSONB DEFAULT '[]'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Escalations for handling stuck agents
CREATE TABLE public.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_by_agent_id TEXT NOT NULL,
  created_by_agent_name TEXT NOT NULL,
  escalation_level INTEGER DEFAULT 1 CHECK (escalation_level BETWEEN 1 AND 3),
  current_handler_type TEXT NOT NULL CHECK (current_handler_type IN ('manager', 'ceo', 'human')),
  current_handler_id TEXT,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('blocked', 'need_help', 'approval_needed', 'resource_needed', 'technical_issue', 'deadline_risk', 'quality_concern')),
  issue_description TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  task_id UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  deliverable_id UUID REFERENCES public.phase_deliverables(id) ON DELETE SET NULL,
  attempted_solutions JSONB DEFAULT '[]'::jsonb,
  resolution TEXT,
  resolution_type TEXT CHECK (resolution_type IN ('resolved', 'workaround', 'deferred', 'cancelled')),
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  escalated_to_manager_at TIMESTAMPTZ,
  escalated_to_ceo_at TIMESTAMPTZ,
  escalated_to_human_at TIMESTAMPTZ,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending_human', 'resolved', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.team_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_meetings
CREATE POLICY "Users can view own team meetings" ON public.team_meetings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own team meetings" ON public.team_meetings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own team meetings" ON public.team_meetings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own team meetings" ON public.team_meetings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for agent_messages
CREATE POLICY "Users can view own agent messages" ON public.agent_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own agent messages" ON public.agent_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agent messages" ON public.agent_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own agent messages" ON public.agent_messages FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for progress_reports
CREATE POLICY "Users can view own progress reports" ON public.progress_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress reports" ON public.progress_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress reports" ON public.progress_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress reports" ON public.progress_reports FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for escalations
CREATE POLICY "Users can view own escalations" ON public.escalations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own escalations" ON public.escalations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own escalations" ON public.escalations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own escalations" ON public.escalations FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.progress_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escalations;

-- Create indexes for performance
CREATE INDEX idx_team_meetings_project ON public.team_meetings(project_id);
CREATE INDEX idx_team_meetings_team ON public.team_meetings(team_id);
CREATE INDEX idx_team_meetings_status ON public.team_meetings(status);
CREATE INDEX idx_agent_messages_project ON public.agent_messages(project_id);
CREATE INDEX idx_agent_messages_from ON public.agent_messages(from_agent_id);
CREATE INDEX idx_agent_messages_to ON public.agent_messages(to_agent_id);
CREATE INDEX idx_progress_reports_project ON public.progress_reports(project_id);
CREATE INDEX idx_progress_reports_agent ON public.progress_reports(agent_id);
CREATE INDEX idx_escalations_project ON public.escalations(project_id);
CREATE INDEX idx_escalations_status ON public.escalations(status);
CREATE INDEX idx_escalations_level ON public.escalations(escalation_level);