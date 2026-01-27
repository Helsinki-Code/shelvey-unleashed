-- Browser Automation Core Schema
-- Comprehensive database schema for multi-provider browser automation system

CREATE TABLE IF NOT EXISTS browser_automation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('agent-browser', 'playwright', 'brightdata', 'fallback')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'idle', 'closing', 'error')),
  domain TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_duration_ms INTEGER DEFAULT 0,
  total_cost_usd NUMERIC(10, 4) DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tabs_open INTEGER DEFAULT 0,
  memory_mb INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS browser_automation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES browser_automation_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'error', 'retrying')),
  provider TEXT NOT NULL CHECK (provider IN ('agent-browser', 'playwright', 'brightdata', 'fallback')),
  domain TEXT,
  parameters JSONB DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  cost_usd NUMERIC(10, 4),
  requires_approval BOOLEAN DEFAULT FALSE,
  approval_status TEXT CHECK (approval_status IS NULL OR approval_status IN ('pending', 'approved', 'rejected')),
  priority INTEGER DEFAULT 5,
  dependencies TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS browser_automation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES browser_automation_sessions(id) ON DELETE SET NULL,
  task_id UUID REFERENCES browser_automation_tasks(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  provider TEXT,
  domain TEXT,
  status TEXT CHECK (status IN ('success', 'error', 'warning')),
  duration_ms INTEGER,
  cost_usd NUMERIC(10, 4),
  compliance_flags TEXT[] DEFAULT '{}',
  pii_detected BOOLEAN DEFAULT FALSE,
  pii_fields TEXT[] DEFAULT '{}',
  tos_violation BOOLEAN DEFAULT FALSE,
  rate_limit_warning BOOLEAN DEFAULT FALSE,
  anti_bot_detected BOOLEAN DEFAULT FALSE,
  screenshot_captured BOOLEAN DEFAULT FALSE,
  screenshot_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS browser_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  element_identifier TEXT NOT NULL,
  selectors JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'learning')),
  version INTEGER DEFAULT 1,
  fallback_selector TEXT,
  learning_attempts INTEGER DEFAULT 0,
  success_rate_threshold NUMERIC(5, 2) DEFAULT 80.00,
  last_tested TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, domain, element_identifier)
);

CREATE TABLE IF NOT EXISTS browser_automation_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  requests_per_minute INTEGER DEFAULT 30,
  requests_per_hour INTEGER DEFAULT 500,
  requests_per_day INTEGER DEFAULT 5000,
  current_minute_count INTEGER DEFAULT 0,
  current_hour_count INTEGER DEFAULT 0,
  current_day_count INTEGER DEFAULT 0,
  last_reset_minute TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_reset_hour TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_reset_day TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, domain)
);

CREATE TABLE IF NOT EXISTS browser_automation_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  session_id UUID REFERENCES browser_automation_sessions(id) ON DELETE SET NULL,
  task_id UUID REFERENCES browser_automation_tasks(id) ON DELETE SET NULL,
  amount_usd NUMERIC(10, 4) NOT NULL,
  metadata JSONB DEFAULT '{}',
  date_utc DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS browser_automation_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES browser_automation_tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  details JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  response_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS browser_automation_provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('agent-browser', 'playwright', 'brightdata', 'fallback')),
  status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'down')),
  uptime_percentage NUMERIC(5, 2) DEFAULT 100,
  avg_response_time_ms INTEGER DEFAULT 0,
  error_rate_percentage NUMERIC(5, 2) DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  last_error TEXT,
  circuit_breaker_open BOOLEAN DEFAULT FALSE,
  consecutive_failures INTEGER DEFAULT 0,
  last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_browser_sessions_user_id ON browser_automation_sessions(user_id);
CREATE INDEX idx_browser_sessions_provider ON browser_automation_sessions(provider);
CREATE INDEX idx_browser_sessions_status ON browser_automation_sessions(status);
CREATE INDEX idx_browser_sessions_created_at ON browser_automation_sessions(created_at);

CREATE INDEX idx_browser_tasks_session_id ON browser_automation_tasks(session_id);
CREATE INDEX idx_browser_tasks_user_id ON browser_automation_tasks(user_id);
CREATE INDEX idx_browser_tasks_status ON browser_automation_tasks(status);
CREATE INDEX idx_browser_tasks_provider ON browser_automation_tasks(provider);
CREATE INDEX idx_browser_tasks_created_at ON browser_automation_tasks(created_at);

CREATE INDEX idx_browser_audit_user_id ON browser_automation_audit(user_id);
CREATE INDEX idx_browser_audit_session_id ON browser_automation_audit(session_id);
CREATE INDEX idx_browser_audit_created_at ON browser_automation_audit(created_at);
CREATE INDEX idx_browser_audit_pii_detected ON browser_automation_audit(pii_detected);

CREATE INDEX idx_browser_rules_user_domain ON browser_automation_rules(user_id, domain);
CREATE INDEX idx_browser_rules_status ON browser_automation_rules(status);

CREATE INDEX idx_browser_cost_user_id ON browser_automation_cost_tracking(user_id);
CREATE INDEX idx_browser_cost_date ON browser_automation_cost_tracking(date_utc);
CREATE INDEX idx_browser_cost_provider ON browser_automation_cost_tracking(provider);

CREATE INDEX idx_browser_approvals_user_id ON browser_automation_approvals(user_id);
CREATE INDEX idx_browser_approvals_status ON browser_automation_approvals(status);

-- Row Level Security
ALTER TABLE browser_automation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_automation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_automation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_automation_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_automation_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_automation_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "users_can_view_own_sessions"
ON browser_automation_sessions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_create_sessions"
ON browser_automation_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_update_own_sessions"
ON browser_automation_sessions FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_tasks"
ON browser_automation_tasks FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_audit"
ON browser_automation_audit FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_rules"
ON browser_automation_rules FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_costs"
ON browser_automation_cost_tracking FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_approvals"
ON browser_automation_approvals FOR SELECT
USING (user_id = auth.uid());

-- Functions for common operations
CREATE OR REPLACE FUNCTION update_browser_automation_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_timestamp
BEFORE UPDATE ON browser_automation_sessions
FOR EACH ROW
EXECUTE FUNCTION update_browser_automation_sessions_updated_at();

CREATE OR REPLACE FUNCTION update_browser_automation_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_timestamp
BEFORE UPDATE ON browser_automation_tasks
FOR EACH ROW
EXECUTE FUNCTION update_browser_automation_tasks_updated_at();

-- Function to calculate daily cost for user
CREATE OR REPLACE FUNCTION get_user_daily_cost(user_id_param UUID)
RETURNS NUMERIC AS $$
SELECT COALESCE(SUM(amount_usd), 0)
FROM browser_automation_cost_tracking
WHERE user_id = user_id_param
AND date_utc = CURRENT_DATE;
$$ LANGUAGE SQL;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_domain_rate_limit(user_id_param UUID, domain_param TEXT)
RETURNS JSONB AS $$
DECLARE
  limit_row browser_automation_rate_limits;
  result JSONB;
BEGIN
  SELECT * INTO limit_row FROM browser_automation_rate_limits
  WHERE user_id = user_id_param AND domain = domain_param;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'No rate limit configured'
    );
  END IF;

  IF limit_row.current_minute_count >= limit_row.requests_per_minute THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Minute limit exceeded',
      'current', limit_row.current_minute_count,
      'limit', limit_row.requests_per_minute
    );
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$ LANGUAGE plpgsql;
