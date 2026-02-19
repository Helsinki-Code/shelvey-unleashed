// AI Service Layer - Uses Lovable AI via Edge Functions

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

// --- SEO Agent Services ---
async function callSEO(action: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('ai-seo', {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export const analyzeWebsiteContent = async (url: string): Promise<{ pages: string[]; keywords: KeywordMetric[] }> => {
  const data = await callSEO('analyzeWebsite', { url });
  return { pages: data?.pages || [], keywords: data?.keywords || [] };
};

export const performSerpAnalysis = async (keyword: string): Promise<SerpResult> => {
  const data = await callSEO('serpAnalysis', { keyword });
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

export const generateContentStrategy = async (
  keywords: KeywordMetric[], serpData: SerpResult[], goals: string
): Promise<ContentStrategy> => {
  const data = await callSEO('contentStrategy', { keywords, serpData, goals });
  return {
    clusters: data?.clusters || [],
    calendar: data?.calendar || [],
    internalLinking: data?.internalLinking || [],
    summary: data?.summary || 'Strategy unavailable.',
  };
};

export const generateArticleOutline = async (keyword: string, serpData: SerpResult, tone: string) => {
  const data = await callSEO('articleOutline', { keyword, serpData, tone });
  return { title: data?.title || keyword, sections: data?.sections || [] };
};

export const writeArticleSection = async (
  sectionHeading: string, keyword: string, context: string, tone: string, visualType: string
): Promise<{ content: string; chartData?: any[]; imagePrompt?: string }> => {
  const data = await callSEO('writeSection', { sectionHeading, keyword, context, tone, visualType });
  return { content: data?.content || 'Section generation failed.', chartData: data?.chartData, imagePrompt: data?.imagePrompt };
};

export const optimizeForAIOverview = async (fullContent: string, keyword: string): Promise<string> => {
  const data = await callSEO('optimizeAIOverview', { content: fullContent, keyword });
  return data?.content || '';
};

export const generateInternalLinkSuggestions = async (content: string, sitemap: string[]): Promise<LinkSuggestion[]> => {
  const data = await callSEO('internalLinks', { content, sitemap });
  return Array.isArray(data) ? data : [];
};

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

export const generateImage = async (prompt: string, _aspectRatio: string = '16:9'): Promise<string> => {
  return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/800/600`;
};

export const checkRank = async (domain: string, keywords: string[]): Promise<BulkRankResponse> => {
  const data = await callSEO('checkRank', { domain, keywords });
  return { results: data?.results || [], summary: data?.summary || 'No data.', groundingUrls: [] };
};

export const analyzeTrafficPatterns = async (metrics: AnalyticsMetric[], pages: PagePerformance[]): Promise<string> => {
  const data = await callSEO('analyzeTraffic', { metrics, pages });
  return data?.content || 'Analysis unavailable.';
};

export const predictIndexingSuccess = async (content: string, keyword: string): Promise<{ likelihood: string; advice: string }> => {
  const data = await callSEO('predictIndexing', { content, keyword });
  return { likelihood: data?.likelihood || 'Unknown', advice: data?.advice || 'Check Search Console.' };
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
        <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}`;

export default {
  sendChatMessage,
  sendBuilderRequest,
  analyzeWebsiteContent,
  performSerpAnalysis,
  generateContentStrategy,
  generateArticleOutline,
  writeArticleSection,
  optimizeForAIOverview,
  generateInternalLinkSuggestions,
  applyLinkSuggestions,
  generateImage,
  checkRank,
  analyzeTrafficPatterns,
  predictIndexingSuccess,
  crawlWebsite,
  mapWebsite,
};
