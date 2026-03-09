

# Fix: SEO War Room Stuck at Keyword Research (500 Error)

## Root Cause

The edge function runs **entire phase executors synchronously** within a single HTTP request. Each phase (crawl, keywords, etc.) makes multiple Firecrawl API calls + AI Gateway calls. Supabase Edge Functions have a **2-second CPU time limit** — the keyword research phase easily exceeds this, causing a 500 error. The frontend polls `advance` every 3 seconds, each call tries to re-run the full keyword phase, and it keeps timing out in a loop.

The logs confirm this: constant boot → shutdown cycles with no actual work completing.

## Solution: Async Background Processing with `EdgeRuntime.waitUntil()`

Split the edge function into two patterns:
1. **`advance` action**: Checks if work is needed, kicks off background processing via `EdgeRuntime.waitUntil()`, returns immediately
2. **Background worker**: Runs the actual phase executor, updates `seo_sessions.workflow_state` in the database when done
3. **Frontend**: Already has Supabase Realtime subscription on `seo_sessions` — it will pick up state changes automatically. Remove the aggressive 3s polling loop.

## Files to Modify

### 1. `supabase/functions/seo-war-room/index.ts`
- Refactor `advance` action to:
  - Read session state
  - If a phase is already `running`, return current state (don't re-trigger)
  - If a phase needs to start, mark it as `running` in DB, return immediately, then use `EdgeRuntime.waitUntil()` to run the executor in the background
  - The background executor updates the DB when complete (with approval or results)
- Add a `status: "processing"` flag in the session to prevent duplicate runs

### 2. `src/hooks/useWarRoom.ts`
- Remove the 3-second polling `setInterval` — it causes duplicate `advance` calls that all timeout
- Instead, after approval or mission start, call `advance` once. Then rely on the Realtime subscription for updates
- Add a manual "advance" trigger button or call advance once after each approval resolves
- When Realtime delivers a state update showing no pending approvals and phases still queued, call `advance` once to trigger the next phase

### 3. Minor: Add processing guard
- Add a `processing_phase` field to `seo_sessions.workflow_state` so the edge function knows not to re-trigger a phase that's already running in the background

## Technical Details

```text
BEFORE (broken):
  Frontend polls advance every 3s
  → Edge fn reads state, runs full phase executor (5-60s of work)
  → Exceeds 2s CPU limit → 500 error
  → Repeat forever

AFTER (fixed):
  Frontend calls advance once after approval
  → Edge fn marks phase "running", returns immediately
  → EdgeRuntime.waitUntil() runs executor in background
  → Executor updates DB when done
  → Realtime subscription pushes new state to frontend
  → Frontend sees approval needed or next phase ready
  → Calls advance again (one-shot)
```

This approach uses the existing Realtime subscription (already wired up) as the primary state sync mechanism, eliminating the timeout issue entirely.

