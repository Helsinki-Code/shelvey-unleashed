
# Plan: Production-Grade Autonomous Trading Company

## Current State Assessment

After thorough review, the trading system already has significant production infrastructure in place:

**What Already Works (Real, Not Mock):**
- `mcp-alpaca` edge function connects to real Alpaca API (paper + live) using user-provided API keys
- `trading-order-gateway` performs real risk checks (position sizing, daily loss limits, buying power, duplicate detection) before routing orders to Alpaca
- `trading-ai-agent` executes real DCA, Grid, and Momentum strategies through the order gateway
- `trading-ceo-orchestrator` manages a full candidate lifecycle pipeline (research → backtest → paper → staged_live → full_live) with dual CEO/user approval gates
- `trading-scheduler-worker` generates tasks from real project data (not synthetic)
- Kill switch, reconciliation, and compliance audit trail exist in the database
- 23 trading-related database tables with proper schema

**What Is Broken / Missing / Simulated:**

1. **No Autonomous Loop**: Agents only execute when user clicks "Execute" button. There is no scheduled autonomous execution cycle that continuously monitors markets, generates signals, and places trades.

2. **Alert Auto-Actions Are Fake**: `trading-alert-executor` has an `executeAutoAction` function that just returns strings like `"Bought 100 shares of AAPL"` without actually calling the order gateway.

3. **No Real-Time Market Data Pipeline**: Market data is only fetched on-demand. No continuous polling/streaming of prices to power alerts, P&L tracking, or strategy signals.

4. **Portfolio Sync Is Missing**: `PortfolioOverview` shows data from `trading_portfolio_snapshots` table but nothing populates it from Alpaca's real account endpoint on a schedule.

5. **P&L Tracking Is Stale**: `trading_projects.total_pnl` is set to 0 on creation and never updated from real execution data.

6. **Strategy Execution Scheduler Missing**: Active strategies (DCA daily, Grid monitoring, Momentum signals) have no cron or scheduled trigger — they only run on manual button press.

7. **No AI-Driven Research/Analysis Agent**: The Research phase agent doesn't use AI to analyze market conditions and generate actionable trade ideas. It just collects database records.

8. **Binance/Coinbase Not Production-Ready**: Only Alpaca is wired to the order gateway. Binance and Coinbase MCPs exist but don't route through the risk-checked gateway.

## Implementation Plan

### Task 1: Autonomous Trading Loop Edge Function
Create `trading-autonomous-loop` edge function that:
- Runs as a scheduled cron job (every 5 minutes during market hours)
- For each active project: fetches real portfolio from Alpaca, updates `trading_portfolio_snapshots`, syncs `trading_projects.total_pnl`
- Checks all active price alerts against live market data and routes triggered alerts through `trading-order-gateway` (not fake strings)
- Executes all active strategies (DCA interval checks, Grid level monitoring, Momentum signal generation) through the real order gateway
- Logs all activity to `trading_activity_logs` for real-time feed visibility

### Task 2: Fix Alert Auto-Execution
Update `trading-alert-executor` so `executeAutoAction` calls `trading-order-gateway` for BUY/SELL actions instead of returning placeholder strings. Wire alert checking into the autonomous loop.

### Task 3: AI-Powered Market Research Agent
Create `trading-research-agent` edge function that uses Lovable AI (`google/gemini-2.5-flash`) to:
- Analyze current positions, recent executions, and market data
- Generate actionable trade recommendations with reasoning
- Auto-create strategy candidates with risk scores
- Store research outputs in `trading_team_tasks` with real AI-generated analysis

### Task 4: Real-Time Portfolio Sync
Add a portfolio sync job inside the autonomous loop that:
- Calls `mcp-alpaca` `get_account` and `get_positions` for each user's active project
- Upserts into `trading_portfolio_snapshots` with real equity, cash, positions, and P&L
- Updates `trading_projects.total_pnl` and `trading_projects.capital` from broker data
- Calculates and stores max drawdown in `trading_risk_controls`

### Task 5: Strategy Execution Scheduler (Cron)
Set up a `pg_cron` job that invokes `trading-autonomous-loop` every 5 minutes. This makes the system truly autonomous — agents work continuously without user intervention.

### Task 6: Update Frontend to Show Real Data
- Update `TradingDashboardPage` to fetch portfolio from real Alpaca data (via the synced snapshots) instead of showing static project capital
- Add a "Live" indicator when autonomous loop is active
- Show real AI research recommendations in the Research phase
- Display real-time P&L updates from portfolio sync
- Add connection status indicator showing whether Alpaca keys are configured and valid

### Task 7: Wire Binance/Coinbase Through Order Gateway
Extend `trading-order-gateway` to support Binance and Coinbase exchanges by routing through their respective MCP functions with the same risk checks applied.

## Technical Details

### Autonomous Loop Architecture
```text
pg_cron (every 5 min)
  └─► trading-autonomous-loop
        ├─► For each active project:
        │     ├─► mcp-alpaca: get_account + get_positions
        │     ├─► Update trading_portfolio_snapshots
        │     ├─► Update trading_projects.total_pnl
        │     ├─► Check trading_alerts vs live prices
        │     │     └─► trading-order-gateway (if triggered)
        │     ├─► Execute active strategies
        │     │     └─► trading-order-gateway (risk-checked)
        │     └─► Log to trading_activity_logs
        └─► AI Research (hourly subset)
              └─► Lovable AI → strategy candidates
```

### Risk Controls (Already Enforced, Will Be Extended)
- Max position size % check (existing)
- Daily loss limit with auto-pause (existing)
- Kill switch blocks all execution (existing)
- Duplicate order detection within 10s window (existing)
- NEW: Max drawdown auto-kill-switch activation
- NEW: Portfolio concentration alerts

### Files to Create
- `supabase/functions/trading-autonomous-loop/index.ts`
- `supabase/functions/trading-research-agent/index.ts`

### Files to Modify
- `supabase/functions/trading-alert-executor/index.ts` (wire real order execution)
- `supabase/functions/trading-order-gateway/index.ts` (add Binance/Coinbase support)
- `src/pages/TradingDashboardPage.tsx` (real data display, autonomous status)
- `src/components/trading/PortfolioOverview.tsx` (live Alpaca data)
- `src/components/trading/RealTimeAgentExecutor.tsx` (autonomous mode indicator)

### Database Changes
- Add `autonomous_mode` boolean column to `trading_projects`
- Add `last_sync_at` timestamp to `trading_projects`
- Set up `pg_cron` schedule for the autonomous loop
