-- Create trading_projects table
CREATE TABLE public.trading_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exchange TEXT NOT NULL, -- 'alpaca', 'binance', 'coinbase'
  mode TEXT NOT NULL DEFAULT 'paper', -- 'paper' or 'live'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed', 'stopped'
  capital NUMERIC NOT NULL DEFAULT 0,
  total_pnl NUMERIC DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'moderate', -- 'conservative', 'moderate', 'aggressive'
  current_phase INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trading_project_phases table
CREATE TABLE public.trading_project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.trading_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  phase_number INTEGER NOT NULL,
  phase_name TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'in_progress', 'review', 'completed'
  deliverables JSONB DEFAULT '{}',
  agent_work_steps JSONB DEFAULT '[]',
  ceo_approved BOOLEAN DEFAULT false,
  user_approved BOOLEAN DEFAULT false,
  ceo_feedback TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, phase_number)
);

-- Create trading_risk_controls table
CREATE TABLE public.trading_risk_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.trading_projects(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL,
  max_position_pct NUMERIC NOT NULL DEFAULT 10, -- Max 10% of portfolio per position
  daily_loss_limit NUMERIC NOT NULL DEFAULT 5, -- Max 5% daily loss
  stop_loss_pct NUMERIC NOT NULL DEFAULT 2, -- 2% stop loss per trade
  kill_switch_active BOOLEAN DEFAULT false,
  kill_switch_activated_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trading_orders table
CREATE TABLE public.trading_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.trading_projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.trading_project_phases(id),
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL, -- 'buy' or 'sell'
  order_type TEXT NOT NULL DEFAULT 'market', -- 'market', 'limit', 'stop_loss'
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  stop_loss_price NUMERIC,
  take_profit_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending_approval', -- 'pending_approval', 'approved', 'rejected', 'executed', 'cancelled', 'failed'
  approved_by_ceo BOOLEAN DEFAULT false,
  approved_by_user BOOLEAN DEFAULT false,
  execution_price NUMERIC,
  executed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trading_activity_logs table
CREATE TABLE public.trading_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.trading_projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.trading_project_phases(id),
  user_id UUID NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.trading_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_risk_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trading_projects
CREATE POLICY "Users can view own trading projects" ON public.trading_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trading projects" ON public.trading_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trading projects" ON public.trading_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trading projects" ON public.trading_projects FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for trading_project_phases
CREATE POLICY "Users can view own trading phases" ON public.trading_project_phases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trading phases" ON public.trading_project_phases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trading phases" ON public.trading_project_phases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trading phases" ON public.trading_project_phases FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for trading_risk_controls
CREATE POLICY "Users can view own risk controls" ON public.trading_risk_controls FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own risk controls" ON public.trading_risk_controls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own risk controls" ON public.trading_risk_controls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own risk controls" ON public.trading_risk_controls FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for trading_orders
CREATE POLICY "Users can view own trading orders" ON public.trading_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trading orders" ON public.trading_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trading orders" ON public.trading_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trading orders" ON public.trading_orders FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for trading_activity_logs
CREATE POLICY "Users can view own trading activity" ON public.trading_activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trading activity" ON public.trading_activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_project_phases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_activity_logs;

-- Create trigger for updated_at
CREATE TRIGGER update_trading_projects_updated_at BEFORE UPDATE ON public.trading_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trading_phases_updated_at BEFORE UPDATE ON public.trading_project_phases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trading_risk_controls_updated_at BEFORE UPDATE ON public.trading_risk_controls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trading_orders_updated_at BEFORE UPDATE ON public.trading_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();