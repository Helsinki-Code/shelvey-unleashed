-- Trading Browser Automation Schema
-- Domain-specific database schema for trading automation

CREATE TABLE IF NOT EXISTS trading_browser_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES browser_automation_sessions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'login_exchange', 'logout_exchange', 'scrape_dashboard', 'scrape_market_data',
    'create_price_alert', 'rebalance_portfolio', 'execute_trade', 'get_alerts',
    'update_alert_status', 'generate_tax_report', 'detect_wash_sales',
    'export_to_form_8949', 'check_regulatory_compliance'
  )),
  exchange TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'error')),
  result JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  cost_usd NUMERIC(10, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trading_market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  provider TEXT,
  price NUMERIC(15, 8),
  rsi NUMERIC(5, 2),
  macd NUMERIC(15, 8),
  macd_signal NUMERIC(15, 8),
  macd_histogram NUMERIC(15, 8),
  ma50 NUMERIC(15, 8),
  ma200 NUMERIC(15, 8),
  sentiment_score NUMERIC(3, 2),
  sentiment_label TEXT,
  volume_24h NUMERIC(20, 2),
  volume_change_24h NUMERIC(5, 2),
  high_24h NUMERIC(15, 8),
  low_24h NUMERIC(15, 8),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, symbol, timestamp)
);

CREATE TABLE IF NOT EXISTS trading_portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES browser_automation_sessions(id) ON DELETE SET NULL,
  exchange TEXT NOT NULL,
  account_value NUMERIC(15, 2),
  cash_balance NUMERIC(15, 2),
  buying_power NUMERIC(15, 2),
  day_pl NUMERIC(15, 2),
  day_pl_percent NUMERIC(5, 2),
  total_pl NUMERIC(15, 2),
  total_pl_percent NUMERIC(5, 2),
  positions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trading_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  alert_type TEXT CHECK (alert_type IN ('price', 'volume', 'technical', 'news')),
  condition_type TEXT CHECK (condition_type IN ('above', 'below', 'crossover', 'crossunder')),
  condition_value NUMERIC(15, 8),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'paused', 'expired')),
  auto_action TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE,
  triggered_price NUMERIC(15, 8),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trading_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL,
  symbol TEXT NOT NULL,
  entry_price NUMERIC(15, 8) NOT NULL,
  exit_price NUMERIC(15, 8),
  quantity NUMERIC(20, 8) NOT NULL,
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  exit_time TIMESTAMP WITH TIME ZONE,
  trade_duration_minutes INTEGER,
  type TEXT CHECK (type IN ('long', 'short')),
  pl_dollars NUMERIC(15, 2),
  pl_percent NUMERIC(5, 2),
  commission NUMERIC(10, 4),
  net_pl NUMERIC(15, 2),
  setup TEXT,
  execution_quality TEXT CHECK (execution_quality IN ('excellent', 'good', 'fair', 'poor')),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trading_tax_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  report_type TEXT CHECK (report_type IN ('form_8949', 'schedule_d', 'summary')),
  short_term_gains NUMERIC(15, 2),
  long_term_gains NUMERIC(15, 2),
  total_gains NUMERIC(15, 2),
  wash_sale_losses NUMERIC(15, 2),
  allowable_losses NUMERIC(15, 2),
  export_format TEXT,
  file_url TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trading_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_date DATE DEFAULT CURRENT_DATE,
  pdt_violations INTEGER DEFAULT 0,
  short_sale_violations INTEGER DEFAULT 0,
  insider_trading_risk INTEGER DEFAULT 0,
  margin_violations INTEGER DEFAULT 0,
  total_violations INTEGER DEFAULT 0,
  compliance_score NUMERIC(3, 0),
  flags JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_trading_actions_user_id ON trading_browser_actions(user_id);
CREATE INDEX idx_trading_actions_session_id ON trading_browser_actions(session_id);
CREATE INDEX idx_trading_actions_created_at ON trading_browser_actions(created_at);

CREATE INDEX idx_trading_market_data_user_symbol ON trading_market_data(user_id, symbol);
CREATE INDEX idx_trading_market_data_timestamp ON trading_market_data(timestamp);

CREATE INDEX idx_trading_portfolio_user_id ON trading_portfolio_snapshots(user_id);
CREATE INDEX idx_trading_portfolio_created_at ON trading_portfolio_snapshots(created_at);

CREATE INDEX idx_trading_alerts_user_id ON trading_alerts(user_id);
CREATE INDEX idx_trading_alerts_status ON trading_alerts(status);
CREATE INDEX idx_trading_alerts_symbol ON trading_alerts(symbol);

CREATE INDEX idx_trading_journals_user_id ON trading_journals(user_id);
CREATE INDEX idx_trading_journals_trade_date ON trading_journals(trade_date);
CREATE INDEX idx_trading_journals_symbol ON trading_journals(symbol);

CREATE INDEX idx_trading_tax_user_year ON trading_tax_reports(user_id, tax_year);

CREATE INDEX idx_trading_compliance_user_date ON trading_compliance_checks(user_id, check_date);

-- RLS Policies
ALTER TABLE trading_browser_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_tax_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_compliance_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_trading_actions"
ON trading_browser_actions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_market_data"
ON trading_market_data FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_portfolio"
ON trading_portfolio_snapshots FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_alerts"
ON trading_alerts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_journals"
ON trading_journals FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_tax_reports"
ON trading_tax_reports FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_compliance"
ON trading_compliance_checks FOR SELECT
USING (user_id = auth.uid());

-- Functions for trading operations
CREATE OR REPLACE FUNCTION calculate_trading_statistics(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  total_trades INTEGER;
  winning_trades INTEGER;
  losing_trades INTEGER;
  total_pl NUMERIC;
  avg_win NUMERIC;
  avg_loss NUMERIC;
  win_rate NUMERIC;
  profit_factor NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_trades FROM trading_journals WHERE user_id = user_id_param;
  SELECT COUNT(*) INTO winning_trades FROM trading_journals WHERE user_id = user_id_param AND pl_dollars > 0;
  SELECT COUNT(*) INTO losing_trades FROM trading_journals WHERE user_id = user_id_param AND pl_dollars < 0;
  SELECT COALESCE(SUM(pl_dollars), 0) INTO total_pl FROM trading_journals WHERE user_id = user_id_param;
  SELECT COALESCE(AVG(pl_dollars), 0) INTO avg_win FROM trading_journals WHERE user_id = user_id_param AND pl_dollars > 0;
  SELECT COALESCE(AVG(pl_dollars), 0) INTO avg_loss FROM trading_journals WHERE user_id = user_id_param AND pl_dollars < 0;

  win_rate := CASE WHEN total_trades > 0 THEN (winning_trades::NUMERIC / total_trades) * 100 ELSE 0 END;
  profit_factor := CASE WHEN avg_loss != 0 THEN ABS(avg_win / avg_loss) ELSE 0 END;

  RETURN jsonb_build_object(
    'total_trades', total_trades,
    'winning_trades', winning_trades,
    'losing_trades', losing_trades,
    'win_rate', ROUND(win_rate, 2),
    'total_pl', ROUND(total_pl, 2),
    'avg_win', ROUND(avg_win, 2),
    'avg_loss', ROUND(avg_loss, 2),
    'profit_factor', ROUND(profit_factor, 2)
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_trading_alert_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alert_status_timestamp
BEFORE UPDATE ON trading_alerts
FOR EACH ROW
EXECUTE FUNCTION update_trading_alert_status();
