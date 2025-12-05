-- Create teams table for 7 divisions
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  division TEXT NOT NULL,
  manager_agent_id TEXT NOT NULL,
  status TEXT DEFAULT 'inactive',
  activation_phase INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create team_members table for agent assignments
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('executive', 'manager', 'lead', 'member')),
  reports_to TEXT,
  status TEXT DEFAULT 'idle',
  current_task TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create business_phases table for project phases
CREATE TABLE public.business_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE NOT NULL,
  phase_number INTEGER NOT NULL CHECK (phase_number BETWEEN 1 AND 6),
  phase_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'blocked')),
  team_id UUID REFERENCES public.teams(id),
  entry_criteria JSONB DEFAULT '[]'::jsonb,
  exit_criteria JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL,
  UNIQUE(project_id, phase_number)
);

-- Create phase_deliverables table
CREATE TABLE public.phase_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES public.business_phases(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  deliverable_type TEXT NOT NULL,
  assigned_team_id UUID REFERENCES public.teams(id),
  assigned_agent_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'approved', 'rejected')),
  content JSONB DEFAULT '{}'::jsonb,
  reviewed_by TEXT,
  approved_by TEXT,
  feedback TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_deliverables ENABLE ROW LEVEL SECURITY;

-- Teams policies (public read for structure)
CREATE POLICY "Public can view teams" ON public.teams FOR SELECT USING (true);

-- Team members policies (public read)
CREATE POLICY "Public can view team members" ON public.team_members FOR SELECT USING (true);

-- Business phases policies (user-specific)
CREATE POLICY "Users can view own phases" ON public.business_phases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own phases" ON public.business_phases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own phases" ON public.business_phases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own phases" ON public.business_phases FOR DELETE USING (auth.uid() = user_id);

-- Phase deliverables policies (user-specific)
CREATE POLICY "Users can view own deliverables" ON public.phase_deliverables FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deliverables" ON public.phase_deliverables FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deliverables" ON public.phase_deliverables FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deliverables" ON public.phase_deliverables FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for phases and deliverables
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_phases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.phase_deliverables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;

-- Add triggers for updated_at
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_business_phases_updated_at BEFORE UPDATE ON public.business_phases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_phase_deliverables_updated_at BEFORE UPDATE ON public.phase_deliverables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed teams data
INSERT INTO public.teams (name, division, manager_agent_id, status, activation_phase, description) VALUES
('Research Division', 'research', 'head-of-research', 'active', 1, 'Market research, competitor analysis, and trend prediction'),
('Brand & Design Division', 'brand', 'creative-director', 'inactive', 2, 'Brand identity, visual design, and creative assets'),
('Development Division', 'development', 'head-of-development', 'inactive', 3, 'Product architecture, code building, and QA testing'),
('Content Division', 'content', 'content-director', 'inactive', 4, 'Content creation, copywriting, and SEO optimization'),
('Marketing Division', 'marketing', 'head-of-marketing', 'inactive', 5, 'Social media, paid ads, and influencer outreach'),
('Sales Division', 'sales', 'head-of-sales', 'inactive', 6, 'Sales development, closing, and customer success'),
('Operations Division', 'operations', 'head-of-operations', 'active', NULL, 'Operations, finance, analytics, and compliance');

-- Seed team members (executives)
INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'ceo', 'CEO Agent', 'executive', NULL, 'active' FROM public.teams t WHERE t.division = 'operations';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'coo', 'COO Agent', 'executive', 'ceo', 'active' FROM public.teams t WHERE t.division = 'operations';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'cfo', 'CFO Agent', 'executive', 'ceo', 'active' FROM public.teams t WHERE t.division = 'operations';

-- Seed Research team
INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'head-of-research', 'Head of Research', 'manager', 'coo', 'idle' FROM public.teams t WHERE t.division = 'research';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'market-research', 'Market Research Agent', 'member', 'head-of-research', 'idle' FROM public.teams t WHERE t.division = 'research';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'trend-prediction', 'Trend Prediction Agent', 'member', 'head-of-research', 'idle' FROM public.teams t WHERE t.division = 'research';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'data-scraping', 'Data Scraping Agent', 'member', 'head-of-research', 'idle' FROM public.teams t WHERE t.division = 'research';

-- Seed Brand & Design team
INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'creative-director', 'Creative Director', 'manager', 'coo', 'idle' FROM public.teams t WHERE t.division = 'brand';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'brand-identity', 'Brand Identity Agent', 'member', 'creative-director', 'idle' FROM public.teams t WHERE t.division = 'brand';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'visual-design', 'Visual Design Agent', 'member', 'creative-director', 'idle' FROM public.teams t WHERE t.division = 'brand';

-- Seed Development team
INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'head-of-development', 'Head of Development', 'manager', 'coo', 'idle' FROM public.teams t WHERE t.division = 'development';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'product-architect', 'Product Architect Agent', 'lead', 'head-of-development', 'idle' FROM public.teams t WHERE t.division = 'development';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'code-builder', 'Code Builder Agent', 'member', 'head-of-development', 'idle' FROM public.teams t WHERE t.division = 'development';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'qa-testing', 'QA Testing Agent', 'member', 'head-of-development', 'idle' FROM public.teams t WHERE t.division = 'development';

-- Seed Content team
INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'content-director', 'Content Director', 'manager', 'coo', 'idle' FROM public.teams t WHERE t.division = 'content';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'content-creator', 'Content Creator Agent', 'member', 'content-director', 'idle' FROM public.teams t WHERE t.division = 'content';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'seo-optimization', 'SEO Optimization Agent', 'member', 'content-director', 'idle' FROM public.teams t WHERE t.division = 'content';

-- Seed Marketing team
INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'head-of-marketing', 'Head of Marketing', 'manager', 'coo', 'idle' FROM public.teams t WHERE t.division = 'marketing';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'social-media-manager', 'Social Media Manager', 'lead', 'head-of-marketing', 'idle' FROM public.teams t WHERE t.division = 'marketing';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'paid-ads-specialist', 'Paid Ads Specialist', 'member', 'head-of-marketing', 'idle' FROM public.teams t WHERE t.division = 'marketing';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'influencer-outreach', 'Influencer Outreach Agent', 'member', 'head-of-marketing', 'idle' FROM public.teams t WHERE t.division = 'marketing';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'fomo-creation', 'FOMO Creation Agent', 'member', 'head-of-marketing', 'idle' FROM public.teams t WHERE t.division = 'marketing';

-- Seed Sales team
INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'head-of-sales', 'Head of Sales', 'manager', 'coo', 'idle' FROM public.teams t WHERE t.division = 'sales';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'sales-development', 'Sales Development Agent', 'member', 'head-of-sales', 'idle' FROM public.teams t WHERE t.division = 'sales';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'sales-closer', 'Sales Closer Agent', 'member', 'head-of-sales', 'idle' FROM public.teams t WHERE t.division = 'sales';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'customer-success', 'Customer Success Agent', 'member', 'head-of-sales', 'idle' FROM public.teams t WHERE t.division = 'sales';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'review-generation', 'Review Generation Agent', 'member', 'head-of-sales', 'idle' FROM public.teams t WHERE t.division = 'sales';

-- Seed Operations team
INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'head-of-operations', 'Head of Operations', 'manager', 'coo', 'idle' FROM public.teams t WHERE t.division = 'operations';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'operations-manager', 'Operations Manager Agent', 'member', 'head-of-operations', 'idle' FROM public.teams t WHERE t.division = 'operations';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'financial-controller', 'Financial Controller Agent', 'member', 'cfo', 'idle' FROM public.teams t WHERE t.division = 'operations';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'analytics-specialist', 'Analytics Specialist Agent', 'member', 'head-of-operations', 'idle' FROM public.teams t WHERE t.division = 'operations';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'legal-compliance', 'Legal Compliance Agent', 'member', 'head-of-operations', 'idle' FROM public.teams t WHERE t.division = 'operations';

INSERT INTO public.team_members (team_id, agent_id, agent_name, role, reports_to, status) 
SELECT t.id, 'strategic-advisor', 'Strategic Advisor Agent', 'lead', 'ceo', 'idle' FROM public.teams t WHERE t.division = 'operations';