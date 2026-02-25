-- Autonomous trading company upgrades:
-- 1) phase task auto-generation support + scheduler run tracking
-- 2) reconciliation records (broker vs DB)
-- 3) lifecycle field write locks (orchestrator/service-role only)

ALTER TABLE public.trading_orders
ADD COLUMN IF NOT EXISTS broker_order_id TEXT,
ADD COLUMN IF NOT EXISTS gateway_source TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (reconciliation_status IN ('pending', 'matched', 'mismatched', 'missing_broker_order', 'error')),
ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_trading_orders_broker_order_id ON public.trading_orders(broker_order_id);
CREATE INDEX IF NOT EXISTS idx_trading_orders_reconciliation_status ON public.trading_orders(reconciliation_status);

CREATE TABLE IF NOT EXISTS public.trading_scheduler_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('phase_task_generation', 'team_performance_snapshot', 'reconciliation', 'stage_progression')),
  project_id UUID REFERENCES public.trading_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.trading_reconciliation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.trading_scheduler_runs(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.trading_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.trading_orders(id) ON DELETE SET NULL,
  broker_order_id TEXT,
  db_status TEXT,
  broker_status TEXT,
  result TEXT NOT NULL CHECK (result IN ('matched', 'mismatched', 'missing_broker_order', 'error')),
  notes TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trading_scheduler_runs_project_started ON public.trading_scheduler_runs(project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_scheduler_runs_user_started ON public.trading_scheduler_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_reconciliation_events_project_created ON public.trading_reconciliation_events(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_reconciliation_events_result ON public.trading_reconciliation_events(result);

ALTER TABLE public.trading_scheduler_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_reconciliation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trading scheduler runs" ON public.trading_scheduler_runs;
DROP POLICY IF EXISTS "Users can insert own trading scheduler runs" ON public.trading_scheduler_runs;
DROP POLICY IF EXISTS "Users can update own trading scheduler runs" ON public.trading_scheduler_runs;
CREATE POLICY "Users can view own trading scheduler runs" ON public.trading_scheduler_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trading scheduler runs" ON public.trading_scheduler_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trading scheduler runs" ON public.trading_scheduler_runs FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own reconciliation events" ON public.trading_reconciliation_events;
DROP POLICY IF EXISTS "Users can insert own reconciliation events" ON public.trading_reconciliation_events;
CREATE POLICY "Users can view own reconciliation events" ON public.trading_reconciliation_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reconciliation events" ON public.trading_reconciliation_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_trading_lifecycle_writes()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF TG_TABLE_NAME = 'trading_strategies' THEN
      IF NEW.lifecycle_stage IS DISTINCT FROM OLD.lifecycle_stage
        OR NEW.paper_mode IS DISTINCT FROM OLD.paper_mode
        OR NEW.ceo_approved IS DISTINCT FROM OLD.ceo_approved
        OR NEW.user_approved IS DISTINCT FROM OLD.user_approved
        OR NEW.last_stage_transition_at IS DISTINCT FROM OLD.last_stage_transition_at
        OR NEW.promoted_from_candidate_id IS DISTINCT FROM OLD.promoted_from_candidate_id
      THEN
        RAISE EXCEPTION 'Lifecycle fields can only be changed through trading-ceo-orchestrator';
      END IF;
    ELSIF TG_TABLE_NAME = 'trading_strategy_candidates' THEN
      IF NEW.current_stage IS DISTINCT FROM OLD.current_stage
        OR NEW.status IS DISTINCT FROM OLD.status
        OR NEW.promoted_strategy_id IS DISTINCT FROM OLD.promoted_strategy_id
      THEN
        RAISE EXCEPTION 'Candidate lifecycle fields can only be changed through trading-ceo-orchestrator';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_trading_strategy_lifecycle ON public.trading_strategies;
CREATE TRIGGER trg_lock_trading_strategy_lifecycle
BEFORE UPDATE ON public.trading_strategies
FOR EACH ROW
EXECUTE FUNCTION public.enforce_trading_lifecycle_writes();

DROP TRIGGER IF EXISTS trg_lock_trading_candidate_lifecycle ON public.trading_strategy_candidates;
CREATE TRIGGER trg_lock_trading_candidate_lifecycle
BEFORE UPDATE ON public.trading_strategy_candidates
FOR EACH ROW
EXECUTE FUNCTION public.enforce_trading_lifecycle_writes();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime' AND n.nspname = 'public' AND c.relname = 'trading_scheduler_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_scheduler_runs;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime' AND n.nspname = 'public' AND c.relname = 'trading_reconciliation_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_reconciliation_events;
  END IF;
END $$;
