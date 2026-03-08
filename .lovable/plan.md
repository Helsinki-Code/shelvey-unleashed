

# Plan: Replace Blog Empire Dashboard with SEO Agent War Room

## What This Is

The uploaded file describes an entirely different application paradigm: an **SEO Agent War Room** where users enter a website URL and watch a team of 16 specialized AI agents autonomously crawl, research, analyze, strategize, write articles, generate images, track rankings, and optimize content -- all in real-time with full transparency and approval gates.

This replaces the current Blog Empire page (a tab-based blog management dashboard) with a **living command center** interface.

## Existing Infrastructure Already In Place

The project already has significant foundational pieces:
- **`src/types/agent.ts`**: Types for `AgentTask`, `AgentStatus`, `WarRoomState`, `ApprovalRequest`, `InterAgentMessage`, `WorkflowStep`, `GeneratedArticle`, etc.
- **`src/components/seo/SEOWarRoom.tsx`**: A partial war room component with agent panels, status indicators, and basic workflow
- **`src/components/seo/ArticleWriter.tsx`**: Streaming text article writer with section-by-section display
- **`src/services/aiService.ts`**: Service layer calling `ai-seo` edge function with `analyzeWebsite`, `serpAnalysis`, `keywordResearch`, `contentStrategy`, `generateArticle`, `rankCheck`, etc.
- **`supabase/functions/ai-seo/index.ts`**: Edge function handling SEO agent operations

## What Changes

### 1. Create New Edge Function: `seo-agent-orchestrator`
A production-grade edge function implementing the 16 agents from the uploaded specification with their exact system prompts, using Lovable AI models (`gemini-3-pro-preview`, `gemini-3-flash-preview`). This replaces the basic `ai-seo` function with the full agent implementations including:
- Orchestrator workflow planning
- Website Crawler with page discovery
- Keyword Research with clustering
- SERP Analysis with PAA extraction and AI Overview capture
- Content Strategy with pillar content mapping
- Article Outline architect
- Section-by-section article writer
- AI Overview optimizer
- Internal link suggester
- Image generation (prompts + Gemini image model)
- Rank tracking with Google Search grounding
- Analytics integration
- Content optimization monitoring
- Indexing predictor
- Link validator
- Session report generator

### 2. Update `src/types/agent.ts`
Expand types to match the full specification: add `OrchestratorPhase`, `OrchestratorDecision`, extended `ContentStrategy` with `pillarContent`/`internalLinkingMap`, extended `GeneratedArticle` with `metaDescription`/`schemaMarkup`/`externalLinks`/`paaQuestionsAnswered`, and all 16 agent types.

### 3. Update `src/services/aiService.ts`
Add service functions for all 16 agents routing through the new edge function, including `orchestrateWorkflow`, `crawlWebsite`, `performKeywordResearch`, `performSerpAnalysis`, `generateContentStrategy`, `generateArticleOutline`, `writeArticleSection`, `optimizeForAIOverview`, `suggestInternalLinks`, `generateImage`, `checkRanks`, `analyzeTraffic`, `analyzeContentOptimization`, `predictIndexing`, `validateLinks`, `generateSessionReport`.

### 4. Replace `BlogEmpirePage.tsx` with SEO War Room
Delete the current blog empire dashboard and replace with the **Agent War Room** interface:

- **Entry Screen**: Single URL input with optional goals field. Clean, minimal, inviting design.
- **War Room View** (after URL entry):
  - **Orchestrator Command Panel** (top): Master workflow flowchart, communication log, decision log
  - **Agent Grid** (main area): 16 agent workspace panels, each showing live status, current task, activity stream, progress bars, and status badges (Idle/Working/Waiting for Approval/Completed/Error)
  - **Approval Queue** (right sidebar or overlay): Blocking approval requests with approve/reject/modify options
  - **Inter-Agent Communication Stream** (toggleable panel): Real-time message feed between agents
  - **Global Progress Bar**: Overall workflow %, active phase, active agents count, pending approvals
- **Agent Deep Dive View**: Click any agent to expand full-screen with complete history, reasoning logs, intervention controls (pause, redirect, instruct)
- **Article Generation View**: Live streaming text, word count counter, image generation integration, internal link approval, section-by-section progress
- **Export Panel**: Markdown download, SERP data CSV, strategy docs, session reports

### 5. Update Routing
Change `/blog-empire` route to render the new War Room page. Update sidebar navigation label.

### 6. Database Migration
Add table `seo_sessions` to persist war room state:
```sql
CREATE TABLE public.seo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_url text NOT NULL,
  goals text,
  status text NOT NULL DEFAULT 'active',
  workflow_state jsonb DEFAULT '{}',
  agent_logs jsonb DEFAULT '[]',
  articles jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.seo_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON public.seo_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Files to Create
- `supabase/functions/seo-agent-orchestrator/index.ts` (full 16-agent implementation)
- `src/components/seo/WarRoomEntry.tsx` (URL entry screen)
- `src/components/seo/AgentWarRoom.tsx` (main war room layout)
- `src/components/seo/OrchestratorPanel.tsx` (orchestrator command view)
- `src/components/seo/AgentWorkspacePanel.tsx` (individual agent panel)
- `src/components/seo/AgentDeepDive.tsx` (full-screen agent detail)
- `src/components/seo/ApprovalQueue.tsx` (approval gate UI)
- `src/components/seo/CommunicationStream.tsx` (inter-agent messages)
- `src/components/seo/GlobalProgress.tsx` (overall progress bar)
- `src/components/seo/ArticleGenerationView.tsx` (live article writing)
- `src/components/seo/ExportPanel.tsx` (download/export)

### Files to Modify
- `src/pages/BlogEmpirePage.tsx` (complete rewrite)
- `src/types/agent.ts` (expand types)
- `src/services/aiService.ts` (add all 16 agent service calls)
- `src/App.tsx` (update route if needed)

### Files to Delete (components no longer needed)
- `src/components/blog/BlogAgentTeamGrid.tsx`
- `src/components/blog/BlogWorkflowEngine.tsx`
- `src/components/blog/BlogFeaturesGrid.tsx`
- `src/components/blog/BlogContentPipeline.tsx`
- `src/components/blog/BlogEmpireCEOHeader.tsx`

## Implementation Order
1. Database migration for `seo_sessions`
2. Expand `types/agent.ts` with full type system
3. Create `seo-agent-orchestrator` edge function with all 16 agents
4. Update `aiService.ts` with all service calls
5. Build War Room UI components (entry, panels, approval queue, communication stream)
6. Replace `BlogEmpirePage.tsx` with new War Room page
7. Clean up old blog empire components

