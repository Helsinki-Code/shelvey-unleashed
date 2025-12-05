import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Perplexity API endpoint
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, arguments: args, credentials } = await req.json();

    const apiKey = credentials?.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'PERPLEXITY_API_KEY not provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (tool) {
      case 'search':
      case 'research':
        result = await performSearch(apiKey, args);
        break;
      case 'analyze':
        result = await performAnalysis(apiKey, args);
        break;
      case 'market_research':
        result = await performMarketResearch(apiKey, args);
        break;
      case 'competitor_analysis':
        result = await performCompetitorAnalysis(apiKey, args);
        break;
      case 'trend_analysis':
        result = await performTrendAnalysis(apiKey, args);
        break;
      // New social sentiment tools (Reddit-equivalent via Perplexity)
      case 'social_sentiment':
        result = await performSocialSentiment(apiKey, args);
        break;
      case 'community_research':
        result = await performCommunityResearch(apiKey, args);
        break;
      case 'social_trends':
        result = await performSocialTrends(apiKey, args);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown tool: ${tool}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-perplexity] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function callPerplexity(apiKey: string, messages: any[], model = 'sonar-pro') {
  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      top_p: 0.9,
      return_citations: true,
      return_images: false,
      return_related_questions: true,
      search_domain_filter: [],
      search_recency_filter: 'month',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function performSearch(apiKey: string, args: any) {
  const { query, context } = args;
  
  const messages = [
    {
      role: 'system',
      content: 'You are a professional research assistant. Provide comprehensive, well-cited information with sources. Be thorough and detailed.',
    },
    {
      role: 'user',
      content: context ? `Context: ${context}\n\nQuery: ${query}` : query,
    },
  ];

  const response = await callPerplexity(apiKey, messages);
  
  return {
    content: response.choices[0]?.message?.content || '',
    citations: response.citations || [],
    relatedQuestions: response.related_questions || [],
    model: response.model,
  };
}

async function performAnalysis(apiKey: string, args: any) {
  const { topic, data, analysisType } = args;
  
  const messages = [
    {
      role: 'system',
      content: `You are an expert analyst. Perform a ${analysisType || 'comprehensive'} analysis. Provide detailed insights, statistics, and actionable recommendations. Cite sources.`,
    },
    {
      role: 'user',
      content: `Analyze the following:\nTopic: ${topic}\n${data ? `Data: ${JSON.stringify(data)}` : ''}`,
    },
  ];

  const response = await callPerplexity(apiKey, messages);
  
  return {
    analysis: response.choices[0]?.message?.content || '',
    citations: response.citations || [],
    type: analysisType,
  };
}

async function performMarketResearch(apiKey: string, args: any) {
  const { industry, targetMarket, businessIdea } = args;
  
  const messages = [
    {
      role: 'system',
      content: `You are a senior market research analyst. Provide comprehensive market research with:
1. Market size and growth projections
2. Key market segments
3. Customer demographics and psychographics
4. Market trends and drivers
5. Regulatory environment
6. Entry barriers
7. Opportunities and threats
Include specific statistics, data points, and cite all sources.`,
    },
    {
      role: 'user',
      content: `Conduct detailed market research for:
Industry: ${industry}
Target Market: ${targetMarket}
Business Idea: ${businessIdea}

Provide a comprehensive report with actionable insights.`,
    },
  ];

  const response = await callPerplexity(apiKey, messages);
  
  return {
    report: response.choices[0]?.message?.content || '',
    citations: response.citations || [],
    relatedQuestions: response.related_questions || [],
    researchType: 'market_research',
  };
}

async function performCompetitorAnalysis(apiKey: string, args: any) {
  const { industry, competitors, businessIdea } = args;
  
  const messages = [
    {
      role: 'system',
      content: `You are a competitive intelligence specialist. Provide detailed competitor analysis with:
1. Direct and indirect competitors
2. Competitor strengths and weaknesses
3. Market positioning and pricing strategies
4. Product/service offerings comparison
5. Marketing and sales strategies
6. Customer reviews and sentiment
7. Market share estimates
8. Competitive advantages and gaps
Include specific examples and cite sources.`,
    },
    {
      role: 'user',
      content: `Analyze competitors for:
Industry: ${industry}
${competitors ? `Known Competitors: ${competitors.join(', ')}` : 'Find key competitors'}
Business Idea: ${businessIdea}

Provide actionable competitive insights.`,
    },
  ];

  const response = await callPerplexity(apiKey, messages);
  
  return {
    analysis: response.choices[0]?.message?.content || '',
    citations: response.citations || [],
    researchType: 'competitor_analysis',
  };
}

async function performTrendAnalysis(apiKey: string, args: any) {
  const { industry, timeframe, focusAreas } = args;
  
  const messages = [
    {
      role: 'system',
      content: `You are a trend forecaster and industry analyst. Identify and analyze:
1. Current industry trends
2. Emerging technologies
3. Consumer behavior shifts
4. Regulatory changes
5. Economic factors
6. Social and cultural trends
7. Future predictions (short and long term)
8. Opportunities arising from trends
Provide specific data, statistics, and expert opinions with citations.`,
    },
    {
      role: 'user',
      content: `Analyze trends for:
Industry: ${industry}
Timeframe: ${timeframe || 'Next 2-5 years'}
${focusAreas ? `Focus Areas: ${focusAreas.join(', ')}` : ''}

Provide comprehensive trend analysis with predictions.`,
    },
  ];

  const response = await callPerplexity(apiKey, messages);
  
  return {
    trends: response.choices[0]?.message?.content || '',
    citations: response.citations || [],
    relatedQuestions: response.related_questions || [],
    researchType: 'trend_analysis',
  };
}

// New: Social Sentiment Analysis (Reddit-equivalent)
async function performSocialSentiment(apiKey: string, args: any) {
  const { query, industry, brand, timeframe } = args;
  
  const searchQuery = query || brand || industry;
  
  const messages = [
    {
      role: 'system',
      content: `You are a social media sentiment analyst specializing in analyzing discussions from Reddit, forums, Twitter, and online communities. Your analysis should include:

1. Overall Sentiment Score (0-100, where 0 is extremely negative, 50 is neutral, 100 is extremely positive)
2. Sentiment Breakdown: percentage positive, negative, neutral
3. Key Discussion Themes from Reddit and forums
4. Most Discussed Topics with sentiment
5. Common Complaints/Pain Points
6. Common Praise/Positive Mentions
7. Notable Reddit threads and forum discussions
8. Community Recommendations and Opinions
9. Trend Direction (improving, declining, stable)
10. Representative Quotes from discussions

Focus specifically on:
- Reddit discussions (r/relevant_subreddits)
- Forum discussions
- Social media sentiment
- Online community feedback

Provide specific examples and cite sources including Reddit posts when possible.`,
    },
    {
      role: 'user',
      content: `Analyze social sentiment and community discussions for:
Topic/Brand/Industry: ${searchQuery}
Timeframe: ${timeframe || 'Last 3 months'}

Search Reddit, forums, and social media for community sentiment. Provide comprehensive analysis with specific examples from discussions.`,
    },
  ];

  const response = await callPerplexity(apiKey, messages);
  
  return {
    sentiment: response.choices[0]?.message?.content || '',
    citations: response.citations || [],
    relatedQuestions: response.related_questions || [],
    analysisType: 'social_sentiment',
    query: searchQuery,
  };
}

// New: Community Research (Deep Reddit/Forum analysis)
async function performCommunityResearch(apiKey: string, args: any) {
  const { topic, subreddits, industry, question } = args;
  
  const researchTopic = topic || industry;
  
  const messages = [
    {
      role: 'system',
      content: `You are a community research specialist who deeply analyzes Reddit discussions, forums, and online communities. Your research should include:

1. Relevant Subreddits and Communities
   - Most active subreddits discussing this topic
   - Forum communities and discussion boards
   
2. Community Insights
   - What the community thinks/feels about the topic
   - Common questions asked
   - Frequently recommended solutions/products
   - Community-favorite alternatives
   
3. Expert Opinions from Community Members
   - Advice from experienced users
   - Professional insights shared in discussions
   
4. Community Pain Points
   - Common frustrations discussed
   - Unmet needs mentioned
   
5. Success Stories and Case Studies
   - Positive experiences shared
   - What worked for community members
   
6. Community Recommendations
   - Top recommended products/services/approaches
   - Community consensus on best practices
   
7. Trending Discussions
   - Recent hot topics in relevant communities
   - Emerging themes

Include specific Reddit thread examples and forum discussions where possible.`,
    },
    {
      role: 'user',
      content: `Conduct deep community research for:
Topic: ${researchTopic}
${subreddits ? `Focus Subreddits: ${subreddits.join(', ')}` : ''}
${question ? `Specific Question: ${question}` : ''}

Analyze Reddit discussions and online communities to provide actionable insights from real user experiences.`,
    },
  ];

  const response = await callPerplexity(apiKey, messages);
  
  return {
    communityInsights: response.choices[0]?.message?.content || '',
    citations: response.citations || [],
    relatedQuestions: response.related_questions || [],
    researchType: 'community_research',
    topic: researchTopic,
  };
}

// New: Social Trends (Trending topics from social platforms)
async function performSocialTrends(apiKey: string, args: any) {
  const { industry, category, region } = args;
  
  const messages = [
    {
      role: 'system',
      content: `You are a social trends analyst who monitors trending topics across Reddit, Twitter, and online communities. Your analysis should include:

1. Currently Trending Topics
   - Hot discussions on Reddit (with specific subreddits)
   - Trending hashtags on social media
   - Viral discussions in online communities
   
2. Emerging Trends
   - Topics gaining momentum
   - Early-stage discussions that are growing
   
3. Trending Sentiment
   - How people feel about trending topics
   - Positive vs negative trending discussions
   
4. Trending Products/Services/Ideas
   - What's being talked about favorably
   - Rising recommendations
   
5. Trending Concerns/Controversies
   - What's causing negative discussions
   - Community concerns being raised
   
6. Influencer and Expert Topics
   - What industry experts are discussing
   - Influential community members' topics
   
7. Prediction: Next Big Topics
   - Based on current momentum, what's likely to trend

Provide specific examples with sources including Reddit threads when available.`,
    },
    {
      role: 'user',
      content: `Identify trending social discussions for:
${industry ? `Industry: ${industry}` : ''}
${category ? `Category: ${category}` : ''}
${region ? `Region: ${region}` : ''}

Find currently trending topics on Reddit, Twitter, and online communities. Provide actionable trend insights.`,
    },
  ];

  const response = await callPerplexity(apiKey, messages);
  
  return {
    trends: response.choices[0]?.message?.content || '',
    citations: response.citations || [],
    relatedQuestions: response.related_questions || [],
    analysisType: 'social_trends',
    industry,
  };
}
