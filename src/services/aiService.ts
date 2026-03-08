// AI Service Layer - SEO Agent War Room with 16 Agents

import { supabase } from '@/integrations/supabase/client';
import type {
  KeywordMetric,
  SerpResult,
  ContentStrategy,
  LinkSuggestion,
  BulkRankResponse,
  AnalyticsMetric,
  PagePerformance,
} from '@/types/agent';

// --- Builder Chat Service ---
export const sendChatMessage = async (
  prompt: string,
  history: { role: string; parts: { text: string }[] }[]
): Promise<string> => {
  const messages = [
    ...history.map(h => ({
      role: h.role === 'model' ? 'assistant' : h.role,
      content: h.parts.map(p => p.text).join('\n'),
    })),
    { role: 'user', content: prompt },
  ];

  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { messages, mode: 'chat' },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data?.content || 'No response.';
};

export const sendBuilderRequest = async (
  prompt: string,
  history: { role: string; parts: { text: string }[] }[],
  currentCode: string = ''
): Promise<{ message: string; code: string; seo: { title: string; description: string; keywords: string[] } }> => {
  const messages = [
    ...history.map(h => ({
      role: h.role === 'model' ? 'assistant' : h.role,
      content: h.parts.map(p => p.text).join('\n'),
    })),
    { role: 'user', content: currentCode ? `CONTEXT: Previous code length: ${currentCode.length} chars.\n\nREQUEST: ${prompt}` : prompt },
  ];

  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { messages, mode: 'builder' },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return {
    message: data?.message || 'Component generated.',
    code: data?.code || generateFallbackComponent(prompt),
    seo: data?.seo || { title: `${prompt.slice(0, 50)} | ShelVey`, description: `Generated: ${prompt.slice(0, 100)}`, keywords: ['shelvey'] },
  };
};

// --- SEO Agent Orchestrator Services (16 agents) ---
async function callAgent(agent: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('seo-agent-orchestrator', {
    body: { agent, ...params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

// 1. Orchestrator
export const orchestrateWorkflow = async (url: string, goals: string) => {
  return callAgent('orchestrator', { url, goals });
};

// 2. Website Crawler
export const crawlWebsiteAgent = async (url: string) => {
  return callAgent('crawler', { url });
};

// 3. Keyword Researcher
export const performKeywordResearch = async (url: string, contentThemes: string[], pages: string[]): Promise<{ keywords: KeywordMetric[]; clusters: any[]; summary: string }> => {
  return callAgent('keyword_researcher', { url, contentThemes, pages });
};

// 4. SERP Analyst
export const performSerpAnalysis = async (keyword: string): Promise<SerpResult> => {
  const data = await callAgent('serp_analyst', { keyword });
  return {
    keyword,
    aiOverview: data?.aiOverview || '',
    peopleAlsoAsk: data?.peopleAlsoAsk || [],
    competitors: data?.competitors || [],
    opportunityScore: data?.opportunityScore || 0,
    strategicInsight: data?.strategicInsight || '',
    group: data?.group || 'General',
    timestamp: data?.timestamp || Date.now(),
  };
};

// 5. Content Strategist
export const generateContentStrategy = async (
  keywords: KeywordMetric[], serpData: SerpResult[], goals: string
): Promise<ContentStrategy> => {
  const data = await callAgent('content_strategist', { keywords, serpData, goals });
  return {
    clusters: data?.clusters || [],
    pillarContent: data?.pillarContent || [],
    calendar: data?.calendar || [],
    internalLinking: data?.internalLinking || [],
    internalLinkingMap: data?.internalLinkingMap || [],
    summary: data?.summary || 'Strategy unavailable.',
  };
};

// 6. Outline Architect
export const generateArticleOutline = async (keyword: string, serpData: SerpResult, tone: string, paaQuestions: string[]) => {
  return callAgent('outline_architect', { keyword, serpData, tone, paaQuestions });
};

// 7. Article Writer
export const writeArticleSection = async (
  sectionHeading: string, keyword: string, context: string, tone: string, visualType: string, paaQuestions?: string[]
): Promise<{ content: string; chartData?: any[]; imagePrompt?: string }> => {
  const data = await callAgent('article_writer', { sectionHeading, keyword, context, tone, visualType, paaQuestions });
  return { content: data?.content || 'Section generation failed.', chartData: data?.chartData, imagePrompt: data?.imagePrompt };
};

// 8. AI Overview Optimizer
export const optimizeForAIOverview = async (fullContent: string, keyword: string, aiOverview?: string): Promise<{ content: string; changes: string[] }> => {
  const data = await callAgent('ai_overview_optimizer', { content: fullContent, keyword, aiOverview });
  return { content: data?.content || fullContent, changes: data?.changes || [] };
};

// 9. Internal Link Suggester
export const generateInternalLinkSuggestions = async (content: string, sitemap: string[]): Promise<LinkSuggestion[]> => {
  const data = await callAgent('internal_linker', { content, sitemap });
  return Array.isArray(data) ? data : [];
};

// 10. Image Generator
export const generateImagePrompt = async (sectionHeading: string, keyword: string, context: string) => {
  return callAgent('image_generator', { sectionHeading, keyword, context });
};

// 11. Rank Tracker
export const checkRank = async (domain: string, keywords: string[]): Promise<BulkRankResponse> => {
  const data = await callAgent('rank_tracker', { domain, keywords });
  return { results: data?.results || [], summary: data?.summary || 'No data.', groundingUrls: [] };
};

// 12. Analytics Agent
export const analyzeTrafficPatterns = async (metrics: AnalyticsMetric[], pages: PagePerformance[]) => {
  return callAgent('analytics_agent', { metrics, pages });
};

// 13. Content Optimizer
export const analyzeContentOptimization = async (content: string, keyword: string, currentRank?: number) => {
  return callAgent('content_optimizer', { content, keyword, currentRank });
};

// 14. Indexing Predictor
export const predictIndexingSuccess = async (content: string, keyword: string): Promise<{ likelihood: string; score: number; factors: any[]; advice: string }> => {
  const data = await callAgent('indexing_predictor', { content, keyword });
  return { likelihood: data?.likelihood || 'Unknown', score: data?.score || 0, factors: data?.factors || [], advice: data?.advice || 'Check Search Console.' };
};

// 15. Link Validator
export const validateLinks = async (links: string[]) => {
  return callAgent('link_validator', { links });
};

// 16. Report Generator
export const generateSessionReport = async (sessionData: any) => {
  return callAgent('report_generator', { sessionData });
};

// --- Legacy compatibility ---
export const applyLinkSuggestions = async (content: string, suggestions: LinkSuggestion[]): Promise<string> => {
  let newContent = content;
  const sorted = [...suggestions].sort((a, b) => b.anchorText.length - a.anchorText.length);
  for (const s of sorted) {
    if (!s.anchorText || !s.targetUrl) continue;
    const escaped = s.anchorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<!\\[)${escaped}(?!\\])`, 'i');
    newContent = newContent.replace(regex, `[${s.anchorText}](${s.targetUrl})`);
  }
  return newContent;
};

export const generateImage = async (prompt: string): Promise<string> => {
  return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/800/600`;
};

export const analyzeWebsiteContent = async (url: string) => {
  return crawlWebsiteAgent(url);
};

export const crawlWebsite = async (url: string) => {
  const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
    body: { url, options: { formats: ['markdown', 'links'] } },
  });
  if (error) throw new Error(error.message);
  return data;
};

export const mapWebsite = async (url: string) => {
  const { data, error } = await supabase.functions.invoke('firecrawl-map', {
    body: { url },
  });
  if (error) throw new Error(error.message);
  return data;
};

// Fallback component
const generateFallbackComponent = (prompt: string): string => `() => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">${prompt.slice(0, 40)}...</h1>
        <p className="text-gray-600 mb-6">This is a fallback component. Please try again.</p>
      </div>
    </div>
  );
}`;

export default {
  sendChatMessage,
  sendBuilderRequest,
  orchestrateWorkflow,
  crawlWebsiteAgent,
  performKeywordResearch,
  performSerpAnalysis,
  generateContentStrategy,
  generateArticleOutline,
  writeArticleSection,
  optimizeForAIOverview,
  generateInternalLinkSuggestions,
  generateImagePrompt,
  checkRank,
  analyzeTrafficPatterns,
  analyzeContentOptimization,
  predictIndexingSuccess,
  validateLinks,
  generateSessionReport,
  applyLinkSuggestions,
  generateImage,
  analyzeWebsiteContent,
  crawlWebsite,
  mapWebsite,
};
