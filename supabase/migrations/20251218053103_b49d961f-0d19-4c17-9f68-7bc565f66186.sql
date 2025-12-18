-- AI Conglomerate Master Architecture
-- Create ENUM for company types
CREATE TYPE company_type AS ENUM (
  'business_building',
  'trading',
  'ecommerce',
  'seo_agency',
  'blog_empire',
  'web_design',
  'automation',
  'digital_products'
);

-- AI Companies table - registry of all AI companies in user's conglomerate
CREATE TABLE public.ai_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_type company_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'setup')),
  total_revenue NUMERIC DEFAULT 0,
  total_expenses NUMERIC DEFAULT 0,
  total_clients INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, company_type)
);

-- Company CEOs table - each company has its own CEO
CREATE TABLE public.company_ceos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.ai_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  persona_type TEXT DEFAULT 'Professional',
  voice_id TEXT,
  personality_traits JSONB DEFAULT '[]'::jsonb,
  communication_style TEXT DEFAULT 'formal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Company Projects table - unified tracking of projects across all companies
CREATE TABLE public.company_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.ai_companies(id) ON DELETE CASCADE,
  company_type company_type NOT NULL,
  external_project_id UUID, -- References business_projects, trading_projects, etc.
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  current_phase INTEGER DEFAULT 1,
  revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Company Revenue Logs - track all revenue events
CREATE TABLE public.company_revenue_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.ai_companies(id) ON DELETE CASCADE,
  company_type company_type NOT NULL,
  amount NUMERIC NOT NULL,
  revenue_type TEXT NOT NULL, -- 'subscription', 'one_time', 'commission', 'ad_revenue', 'trade_profit', etc.
  source TEXT, -- 'client_name', 'trade_id', 'blog_ad', etc.
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Company Activity Logs - unified activity across all companies
CREATE TABLE public.company_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.ai_companies(id) ON DELETE CASCADE,
  company_type company_type NOT NULL,
  ceo_name TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_ceos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_revenue_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_companies
CREATE POLICY "Users can view own companies" ON public.ai_companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own companies" ON public.ai_companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own companies" ON public.ai_companies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own companies" ON public.ai_companies FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for company_ceos
CREATE POLICY "Users can view own company ceos" ON public.company_ceos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own company ceos" ON public.company_ceos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own company ceos" ON public.company_ceos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own company ceos" ON public.company_ceos FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for company_projects
CREATE POLICY "Users can view own company projects" ON public.company_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own company projects" ON public.company_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own company projects" ON public.company_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own company projects" ON public.company_projects FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for company_revenue_logs
CREATE POLICY "Users can view own revenue logs" ON public.company_revenue_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own revenue logs" ON public.company_revenue_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for company_activity_logs
CREATE POLICY "Users can view own activity logs" ON public.company_activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity logs" ON public.company_activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for activity logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_revenue_logs;

-- Create indexes for performance
CREATE INDEX idx_ai_companies_user ON public.ai_companies(user_id);
CREATE INDEX idx_company_projects_company ON public.company_projects(company_id);
CREATE INDEX idx_company_activity_company ON public.company_activity_logs(company_id, created_at DESC);
CREATE INDEX idx_company_revenue_company ON public.company_revenue_logs(company_id, recorded_at DESC);