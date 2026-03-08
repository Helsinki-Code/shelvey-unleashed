

# Plan: Rebuild SEO War Room to Match Full Architecture

## Summary

The uploaded architecture defines a production-grade multi-agent system with a proper server-side workflow engine, message bus, state store, health monitor, approval queue, and SSE streaming -- all coordinated through a DAG scheduler. The current implementation runs everything client-side in a single `useEffect`. This plan restructures the system to match the architecture.

## Architecture Translation (Server → Edge Function + Frontend)

Since this is a Lovable project (React frontend + Supabase edge functions), the Express server architecture translates to:

- **Express server** → Single `seo-war-room` edge function with action-based routing
- **SSE streaming** → Polling via React state + Supabase Realtime on `seo_sessions` table
- **MessageBus/StateStore/WorkflowEngine** → Server-side state managed in the edge function, persisted to `seo_sessions.workflow_state`
- **Frontend SSE hook** → `useWarRoom` custom hook polling edge function for state updates

## Changes

### 1. Replace Type System (`src/types/agent.ts`)
Replace the current simple types with the full architecture type system:
- `AgentId` enum (orchestrator, crawler, keyword, serp, strategy, writer, image, link_builder, rank_tracker, analytics, optimizer, indexer, validator)
- `AgentStatus` enum (idle, working, waiting_input, waiting_approval, completed, error, monitoring, paused, crashed)
- `PhaseStatus` enum with DAG states (queued, ready, running, awaiting_approval, completed, failed, skipped)
- `MessageType` enum for bus messages
- `ApprovalStatus` enum with timeout support
- `StreamEventType` enum for frontend events
- Full interfaces: `BusMessage`, `HeartbeatPayload`, `TaskAssignment`, `TaskCompletion`, `MissionState`, `AgentState`, `PhaseState`, `DataStore`, `CommunicationLog`, `ApprovalRequest` (with options, timeout, blocking), `LogEntry` (with level categories including decision/action), `AgentReport`, `MissionConfig` with `DEFAULT_CONFIG`
- Domain models: `CrawlResult`, `CrawledPage`, `SiteStructure`, `ToneAnalysis`, `TechnicalIssue`, `ContentTheme`, `KeywordCluster`, `SerpResult` with content gaps, `ContentStrategy` with competitive positioning, `GeneratedArticle` with full pipeline statuses, `ArticleSection` with visual types, `LinkValidationResult`, `GeneratedImage` with placement, `RankingSnapshot`, `AnalyticsSnapshot`, `OptimizationAudit`
- `InterventionCommand` type
- Keep existing simple types (`Message`, `SEOData`, `BuilderState`) for backward compatibility

### 2. Create `useWarRoom` Hook (`src/hooks/useWarRoom.ts`)
Implement the architecture's frontend integration pattern:
- Manages full `WarRoomState` with agents as Map, phases array, approvals, communications, articles, keywords, health, connected status
- Starts mission via edge function call
- Polls edge function for state updates every 2 seconds (replaces SSE)
- Provides actions: `startMission`, `pauseMission`, `resumeMission`, `approveRequest`, `intervene`, `getAgentDeepDive`, `downloadExport`, `getSessionReport`
- Handles all stream event types from the architecture (agent_status, phase_update, log_entry, communication, approval_request/resolved, writing_stream, page_crawled, keyword_discovered, rank_checked, heartbeat, progress, workflow_complete, error)

### 3. Create `seo-war-room` Edge Function (`supabase/functions/seo-war-room/index.ts`)
Single edge function implementing the full server architecture with action routing:

**Actions:**
- `start_mission` — Initialize mission state, register all 13 agents, build default phase DAG (PHASE_CRAWL → PHASE_KEYWORDS → PHASE_SERP → PHASE_STRATEGY → PHASE_WRITE → PHASE_MONITOR), persist to `seo_sessions`, begin workflow advancement
- `get_state` — Return full state snapshot (mission, agents, phases, data, comms, health, approvals)
- `advance` — DAG scheduler: check ready phases (all dependencies completed), assign tasks to agents, execute agent logic via Gemini AI calls, handle completions, store outputs
- `approve` — Resolve approval request, update phase status, trigger workflow advancement
- `intervene` — Send pause/resume/redirect/instruct commands to specific agents
- `get_report` — Generate session report via AI
- `export` — Return data packages (keywords CSV, SERP JSON, strategy JSON, article MD)

**Agent implementations within the edge function:**
- **Crawler**: Calls Gemini with Google Search grounding to discover pages, extract content themes, analyze tone, detect technical issues. Streams `PAGE_CRAWLED` events. Requests approval gate.
- **Keyword**: Uses crawl data to research keywords via Gemini. Groups into clusters. Streams `KEYWORD_DISCOVERED`. Requests approval.
- **SERP**: Parallel keyword SERP analysis via Gemini with search grounding. Extracts AI Overviews, PAA questions, competitor data, content gaps. Requests approval.
- **Strategy**: Synthesizes all intelligence into topic clusters, pillar content, calendar, internal linking map. Requests approval.
- **Writer**: For each calendar entry: generates outline (approval gate), generates featured image, writes sections one-by-one (streamed), AI Overview optimization, internal link suggestions (approval gate), link validation, final approval gate.
- **Image**: Generates image prompts and calls Gemini image model.
- **Link Builder**: Suggests internal links based on sitemap and content.
- **Rank Tracker**: Checks rankings via Gemini with search grounding. Continuous monitoring mode.
- **Analytics**: Monitors traffic patterns and performance.
- **Optimizer**: Detects content optimization opportunities.
- **Indexer**: Predicts indexing likelihood.
- **Validator**: Validates all links in articles.

**State management:**
- Mission state, agent states, phase states, data store, communication log all stored as JSONB in `seo_sessions.workflow_state`
- Each `advance` call loads state, executes next ready phases, saves updated state
- Approval gates block phase progression until resolved

### 4. Rebuild Frontend Components

**`AgentWarRoom.tsx`** — Complete rewrite:
- Uses `useWarRoom` hook instead of inline state management
- Polls edge function via `advance` action on interval (every 3s while mission is running)
- Layout: GlobalProgress (top) → OrchestratorPanel (workflow DAG) → Main area with tabs (Agents, Comms, Export) → Approval sidebar
- Agents tab shows grid of `AgentWorkspacePanel` components with live heartbeat indicators, status badges, progress bars, expandable log streams
- Click agent → `AgentDeepDive` full-screen overlay with complete log history, intervention controls (pause, resume, redirect, instruct)

**`GlobalProgress.tsx`** — Update to show:
- Overall mission progress from `MissionState.totalProgress`
- Current phase from DAG
- Active agents count, pending approvals count
- Mission timer (elapsed time)
- Health status indicator (healthy/degraded/critical from `HealthMonitor` data)

**`AgentWorkspacePanel.tsx`** — Update to show:
- Heartbeat indicator (green dot with pulse, showing `lastHeartbeat` recency)
- Agent status badge using full `AgentStatus` enum (idle/working/waiting_approval/completed/error/monitoring/paused/crashed)
- Current task description
- Progress bar
- Scrollable log stream with color-coded levels (info/warn/error/action/decision)
- Tasks completed / tasks errored counters
- Data produced summary

**`OrchestratorPanel.tsx`** — Update to show:
- Visual DAG of phases with dependency arrows
- Phase status badges using `PhaseStatus` enum
- Approval gate indicators on phases that require approval
- Decision log from orchestrator

**`ApprovalQueue.tsx`** — Update to match architecture:
- Full approval options: Approve, Reject, Modify & Approve, Request More Info
- Each option can require text input
- Timeout countdown display
- Blocking indicator with list of blocked agents
- Work completed summary in each approval card

**`CommunicationStream.tsx`** — Update to show:
- Full `BusMessage` stream with from/to agent labels
- Message type badges (TASK_ASSIGN, TASK_COMPLETE, DATA_HANDOFF, etc.)
- Filter by agent, by message type
- Correlation ID linking related messages

**`AgentDeepDive.tsx`** — Update with:
- Full log history with category and level filters
- Search through logs
- Intervention controls: Pause, Resume, Redirect (with payload input), Instruct (with message input), Explain (ask agent to explain), Redo
- Agent report display (tasks executed, data sources accessed, decisions log, errors encountered, outputs summary, recommendations)
- Communication history for this specific agent

**`ExportPanel.tsx`** — Update with:
- Keywords CSV download
- SERP analysis JSON download  
- Content strategy JSON download
- Article markdown downloads (per article)
- Ranking history JSON download
- Communications log JSON download
- Full session JSON download
- Session report (AI-generated)

### 5. Update `BlogEmpirePage.tsx`
- Import and use `useWarRoom` hook
- Pass hook state and actions to `AgentWarRoom`
- Handle mission lifecycle (start → running → complete)

### 6. Update `aiService.ts`
- Add `invokeWarRoom(action, payload)` helper that calls the `seo-war-room` edge function
- Add typed wrappers: `startWarRoomMission`, `getWarRoomState`, `advanceWarRoom`, `approveWarRoom`, `interveneWarRoom`, `getWarRoomReport`, `exportWarRoom`

### 7. Database Migration
Alter `seo_sessions` table to ensure `workflow_state` JSONB column can hold the full state snapshot (mission + agents + phases + data + comms + config). No schema changes needed if the existing table already has the `workflow_state jsonb` column.

## Files to Create
- `src/hooks/useWarRoom.ts`
- `supabase/functions/seo-war-room/index.ts`

## Files to Modify
- `src/types/agent.ts` (full type system replacement)
- `src/services/aiService.ts` (add war room service calls)
- `src/components/seo/AgentWarRoom.tsx` (complete rewrite using hook)
- `src/components/seo/GlobalProgress.tsx` (health + DAG info)
- `src/components/seo/AgentWorkspacePanel.tsx` (heartbeat + full status)
- `src/components/seo/OrchestratorPanel.tsx` (DAG visualization)
- `src/components/seo/ApprovalQueue.tsx` (full options + timeout)
- `src/components/seo/CommunicationStream.tsx` (bus messages + filters)
- `src/components/seo/AgentDeepDive.tsx` (intervention controls + report)
- `src/components/seo/ExportPanel.tsx` (all export types)
- `src/pages/BlogEmpirePage.tsx` (hook integration)

## Implementation Order
1. Replace type system in `agent.ts`
2. Create `seo-war-room` edge function with full agent implementations
3. Create `useWarRoom` hook
4. Update `aiService.ts` with war room service calls
5. Rebuild all UI components
6. Update `BlogEmpirePage.tsx` to wire everything together

