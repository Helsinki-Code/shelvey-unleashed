-- Store Automation Jobs table
CREATE TABLE public.store_automation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  store_type TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.store_automation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own automation jobs" ON public.store_automation_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own automation jobs" ON public.store_automation_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own automation jobs" ON public.store_automation_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own automation jobs" ON public.store_automation_jobs FOR DELETE USING (auth.uid() = user_id);

-- Trading Strategies table
CREATE TABLE public.trading_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  exchange TEXT NOT NULL,
  strategy_type TEXT NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT false,
  paper_mode BOOLEAN DEFAULT true,
  total_profit NUMERIC DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strategies" ON public.trading_strategies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategies" ON public.trading_strategies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategies" ON public.trading_strategies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strategies" ON public.trading_strategies FOR DELETE USING (auth.uid() = user_id);

-- Trading Executions table
CREATE TABLE public.trading_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES public.trading_strategies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  symbol TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  profit_loss NUMERIC DEFAULT 0,
  fees NUMERIC DEFAULT 0,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trading_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own executions" ON public.trading_executions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own executions" ON public.trading_executions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- POD Products table
CREATE TABLE public.pod_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  design_url TEXT,
  printful_product_id TEXT,
  printify_product_id TEXT,
  synced_stores JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft',
  sales_count INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pod_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pod products" ON public.pod_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pod products" ON public.pod_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pod products" ON public.pod_products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pod products" ON public.pod_products FOR DELETE USING (auth.uid() = user_id);

-- Store Automation Settings table
CREATE TABLE public.store_automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  auto_fulfill_orders BOOLEAN DEFAULT false,
  auto_optimize_prices BOOLEAN DEFAULT false,
  auto_restock_alerts BOOLEAN DEFAULT true,
  auto_marketing BOOLEAN DEFAULT false,
  low_stock_threshold INTEGER DEFAULT 10,
  price_optimization_margin NUMERIC DEFAULT 0.15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.store_automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.store_automation_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.store_automation_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.store_automation_settings FOR UPDATE USING (auth.uid() = user_id);