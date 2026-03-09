
# Fix Plan: Blog Empire Layout + Edge Function Errors

## Issues Identified

### 1. Layout Problem
- **BlogEmpirePage** renders as a standalone page without the dashboard sidebar
- Other dashboard pages use `SimpleDashboardSidebar` + `ml-[260px]` layout pattern
- Missing: NotificationBell, ThemeToggle, CEOChatSheet header elements

### 2. Edge Function Failures (from logs)
- **`content-strategy-generator`**: 429 error - OpenAI API quota exceeded
- **`blog-generator`**: "Unknown action: undefined" - action parameter missing from request
- **`v0-website-generator`**: 500 error from v0 API

## Solution

### Part A: Wrap BlogEmpirePage in Dashboard Layout
Update `BlogEmpirePage.tsx` to:
- Import and render `SimpleDashboardSidebar`
- Add proper main container with `ml-[260px]` margin
- Include header with NotificationBell + ThemeToggle
- Wrap `BlogEmpireEntry` and `RealTimeBlogAgentExecutor` in the layout

### Part B: Fix content-strategy-generator to use Lovable AI
Update `supabase/functions/content-strategy-generator/index.ts`:
- Replace direct OpenAI API calls with Lovable AI Gateway
- Use `https://ai.lovable.dev/v1/chat/completions` endpoint
- Use `LOVABLE_API_KEY` (already configured in secrets)
- Model: `google/gemini-2.5-flash` for cost-effective generation

### Part C: Fix blog-website-builder action parameter
Ensure proper `action` parameter is passed when invoking `content-strategy-generator`

## Files to Modify
1. `src/pages/BlogEmpirePage.tsx` - Add dashboard layout
2. `supabase/functions/content-strategy-generator/index.ts` - Switch to Lovable AI
3. `supabase/functions/blog-website-builder/index.ts` - Pass correct action parameter
