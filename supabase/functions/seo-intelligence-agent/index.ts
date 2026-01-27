import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SEOMetrics {
  url: string;
  title: string;
  meta_description: string;
  h1: string;
  content_length: number;
  keyword_density: Record<string, number>;
  internal_links: number;
  external_links: number;
  images_with_alt: number;
  page_speed: number;
  mobile_friendly: boolean;
  ssl_certificate: boolean;
}

interface CompetitorAnalysis {
  competitor_url: string;
  title: string;
  content_length: number;
  keywords: string[];
  backlinks_count: number;
  domain_authority: number;
  page_authority: number;
  social_shares: number;
}

Deno.serve(async (req) => {
  try {
    const {
      action,
      user_id,
      session_id,
      url,
      keyword,
      competitors,
      post_id,
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "analyze_seo") {
      return await analyzeSEO(supabase, user_id, session_id, url);
    }

    if (action === "monitor_rankings") {
      return await monitorRankings(supabase, user_id, session_id, keyword);
    }

    if (action === "analyze_competitors") {
      return await analyzeCompetitors(
        supabase,
        user_id,
        session_id,
        competitors || []
      );
    }

    if (action === "get_search_console_data") {
      return await getSearchConsoleData(supabase, user_id, session_id);
    }

    if (action === "suggest_seo_improvements") {
      return await suggestSEOImprovements(
        supabase,
        user_id,
        session_id,
        url,
        post_id
      );
    }

    if (action === "monitor_backlinks") {
      return await monitorBacklinks(supabase, user_id, session_id);
    }

    return new Response(
      JSON.stringify({ error: "Unknown action", action }),
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in seo-intelligence-agent:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
});

async function analyzeSEO(
  supabase: any,
  userId: string,
  sessionId: string,
  url: string
) {
  const startTime = Date.now();

  try {
    const metrics = generateMockSEOMetrics(url);

    // Store in database
    const { error: dbError } = await supabase
      .from("blog_seo_monitoring")
      .insert({
        user_id: userId,
        url,
        metrics,
        analyzed_at: new Date().toISOString(),
      });

    if (dbError) throw dbError;

    const duration = Date.now() - startTime;
    const seoScore = calculateSEOScore(metrics);

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "analyze_seo",
      status: "completed",
      details: {
        url,
        seo_score: seoScore,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        seo_score: seoScore,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "analyze_seo",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { url },
    });

    throw error;
  }
}

async function monitorRankings(
  supabase: any,
  userId: string,
  sessionId: string,
  keyword: string
) {
  const startTime = Date.now();

  try {
    // Mock SERP data
    const rankings = [
      {
        keyword,
        current_rank: Math.floor(Math.random() * 10) + 1,
        previous_rank: Math.floor(Math.random() * 20) + 1,
        position_change: Math.floor(Math.random() * 5) - 2,
        ctr: Math.random() * 20 + 1,
        impressions: Math.floor(Math.random() * 10000) + 100,
        clicks: Math.floor(Math.random() * 1000) + 10,
        search_volume: Math.floor(Math.random() * 100000) + 100,
        difficulty: Math.floor(Math.random() * 100),
        intent: ["informational", "commercial", "transactional"][
          Math.floor(Math.random() * 3)
        ],
      },
    ];

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "monitor_rankings",
      status: "completed",
      details: {
        keyword,
        rank: rankings[0].current_rank,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        rankings,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "monitor_rankings",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { keyword },
    });

    throw error;
  }
}

async function analyzeCompetitors(
  supabase: any,
  userId: string,
  sessionId: string,
  competitors: string[]
) {
  const startTime = Date.now();
  const analyses: CompetitorAnalysis[] = [];

  try {
    for (const competitorUrl of competitors) {
      const analysis: CompetitorAnalysis = {
        competitor_url: competitorUrl,
        title: "Competitor Article Title",
        content_length: Math.floor(Math.random() * 5000) + 500,
        keywords: generateKeywords(5),
        backlinks_count: Math.floor(Math.random() * 500) + 10,
        domain_authority: Math.floor(Math.random() * 80) + 20,
        page_authority: Math.floor(Math.random() * 60) + 10,
        social_shares: Math.floor(Math.random() * 10000) + 100,
      };

      analyses.push(analysis);

      // Store in database
      await supabase.from("blog_competitor_analysis").insert({
        user_id: userId,
        competitor_url: competitorUrl,
        analysis,
        analyzed_at: new Date().toISOString(),
      });
    }

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "analyze_competitors",
      status: "completed",
      details: {
        competitors_count: competitors.length,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        analyses,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "analyze_competitors",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { competitors_count: competitors.length },
    });

    throw error;
  }
}

async function getSearchConsoleData(
  supabase: any,
  userId: string,
  sessionId: string
) {
  const startTime = Date.now();

  try {
    // Mock Google Search Console data
    const data = {
      total_impressions: Math.floor(Math.random() * 1000000) + 10000,
      total_clicks: Math.floor(Math.random() * 50000) + 1000,
      average_ctr: (Math.random() * 10 + 1).toFixed(2),
      average_position: (Math.random() * 30 + 1).toFixed(1),
      top_queries: [
        {
          query: "best trading strategies 2026",
          clicks: Math.floor(Math.random() * 5000) + 500,
          impressions: Math.floor(Math.random() * 50000) + 5000,
          ctr: (Math.random() * 10).toFixed(2),
          position: Math.random() * 20 + 1,
        },
        {
          query: "automated trading journal",
          clicks: Math.floor(Math.random() * 3000) + 300,
          impressions: Math.floor(Math.random() * 30000) + 3000,
          ctr: (Math.random() * 8).toFixed(2),
          position: Math.random() * 15 + 1,
        },
        {
          query: "portfolio rebalancing guide",
          clicks: Math.floor(Math.random() * 2000) + 200,
          impressions: Math.floor(Math.random() * 20000) + 2000,
          ctr: (Math.random() * 6).toFixed(2),
          position: Math.random() * 10 + 1,
        },
      ],
      top_pages: [
        {
          page: "/blog/trading-strategies",
          clicks: Math.floor(Math.random() * 3000) + 500,
          impressions: Math.floor(Math.random() * 30000) + 5000,
          ctr: (Math.random() * 8).toFixed(2),
        },
        {
          page: "/blog/portfolio-rebalancing",
          clicks: Math.floor(Math.random() * 2000) + 300,
          impressions: Math.floor(Math.random() * 20000) + 3000,
          ctr: (Math.random() * 6).toFixed(2),
        },
      ],
    };

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "get_search_console_data",
      status: "completed",
      details: {
        total_impressions: data.total_impressions,
        total_clicks: data.total_clicks,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "get_search_console_data",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

async function suggestSEOImprovements(
  supabase: any,
  userId: string,
  sessionId: string,
  url: string,
  postId: string
) {
  const startTime = Date.now();

  try {
    const suggestions = [
      {
        type: "title_length",
        priority: "high",
        current: "Very Long Title That Exceeds 60 Characters Recommended Length",
        suggestion: "Shorter SEO-Optimized Title (55 chars)",
        impact: "Could improve CTR by 10-15%",
      },
      {
        type: "meta_description",
        priority: "high",
        suggestion: "Add meta description under 160 characters",
        impact: "Could improve CTR by 5-10%",
      },
      {
        type: "heading_hierarchy",
        priority: "medium",
        suggestion: "Use H2 and H3 tags properly throughout content",
        impact: "Improves readability and SEO",
      },
      {
        type: "internal_links",
        priority: "medium",
        suggestion: "Add 3-5 relevant internal links to other blog posts",
        impact: "Could improve ranking by 5-20 positions",
      },
      {
        type: "image_optimization",
        priority: "low",
        suggestion: "Add alt text to all images",
        impact: "Improves accessibility and image search ranking",
      },
      {
        type: "content_length",
        priority: "high",
        suggestion: "Expand content to 2000+ words",
        impact: "Could improve ranking by 10-30 positions",
      },
      {
        type: "keyword_optimization",
        priority: "high",
        suggestion: "Target primary keyword in H1, first 100 words, and naturally throughout",
        impact: "Could improve ranking by 15-40 positions",
      },
    ];

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "suggest_seo_improvements",
      status: "completed",
      details: {
        url,
        post_id: postId,
        suggestions_count: suggestions.length,
        high_priority: suggestions.filter((s) => s.priority === "high").length,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        suggestions,
        priority_breakdown: {
          high: suggestions.filter((s) => s.priority === "high").length,
          medium: suggestions.filter((s) => s.priority === "medium").length,
          low: suggestions.filter((s) => s.priority === "low").length,
        },
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "suggest_seo_improvements",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { url, post_id: postId },
    });

    throw error;
  }
}

async function monitorBacklinks(
  supabase: any,
  userId: string,
  sessionId: string
) {
  const startTime = Date.now();

  try {
    const backlinks = [
      {
        source_url: "https://techblog.example.com/trading-strategies",
        anchor_text: "automated trading",
        domain_authority: Math.floor(Math.random() * 80) + 20,
        type: "editorial",
        discovered_date: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        status: "active",
      },
      {
        source_url: "https://finance.example.com/portfolio-tips",
        anchor_text: "portfolio rebalancing tools",
        domain_authority: Math.floor(Math.random() * 80) + 30,
        type: "resource",
        discovered_date: new Date(
          Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000
        ).toISOString(),
        status: "active",
      },
      {
        source_url: "https://old-source.example.com/lost-link",
        anchor_text: "trading journal",
        domain_authority: 25,
        type: "lost",
        discovered_date: new Date(
          Date.now() - 60 * 24 * 60 * 60 * 1000
        ).toISOString(),
        status: "lost",
      },
    ];

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "monitor_backlinks",
      status: "completed",
      details: {
        total_backlinks: backlinks.length,
        new_backlinks: backlinks.filter((b) => b.status === "active").length,
        lost_backlinks: backlinks.filter((b) => b.status === "lost").length,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        backlinks,
        summary: {
          total: backlinks.length,
          active: backlinks.filter((b) => b.status === "active").length,
          lost: backlinks.filter((b) => b.status === "lost").length,
        },
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "monitor_backlinks",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

// Helper functions

function generateMockSEOMetrics(url: string): SEOMetrics {
  return {
    url,
    title: "SEO Optimized Blog Title About Trading Strategies",
    meta_description:
      "Learn advanced trading strategies and automated portfolio management with our comprehensive guide.",
    h1: "Complete Guide to Trading Strategies",
    content_length: Math.floor(Math.random() * 5000) + 1500,
    keyword_density: {
      "trading strategies": 0.032,
      "automated trading": 0.025,
      portfolio: 0.019,
      rebalancing: 0.015,
    },
    internal_links: Math.floor(Math.random() * 20) + 5,
    external_links: Math.floor(Math.random() * 10) + 2,
    images_with_alt: Math.floor(Math.random() * 8) + 2,
    page_speed: Math.random() * 3 + 0.5,
    mobile_friendly: true,
    ssl_certificate: true,
  };
}

function calculateSEOScore(metrics: SEOMetrics): number {
  let score = 100;

  // Title check (max -15)
  if (!metrics.title || metrics.title.length < 30) score -= 10;
  else if (metrics.title.length > 60) score -= 5;

  // Meta description check (max -10)
  if (!metrics.meta_description) score -= 10;

  // Content length (max -20)
  if (metrics.content_length < 300) score -= 20;
  else if (metrics.content_length < 1000) score -= 10;

  // Keyword density (max -10)
  const densities = Object.values(metrics.keyword_density);
  if (densities.some((d) => d > 0.05)) score -= 10;
  else if (densities.some((d) => d < 0.01)) score -= 5;

  // Links (max -15)
  if (metrics.internal_links === 0) score -= 15;
  else if (metrics.internal_links < 3) score -= 5;

  // Images (max -10)
  if (metrics.images_with_alt === 0 && metrics.content_length > 1000)
    score -= 10;

  // Page speed (max -20)
  if (metrics.page_speed > 3) score -= 20;
  else if (metrics.page_speed > 2) score -= 10;

  // Mobile friendly (max -5)
  if (!metrics.mobile_friendly) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function generateKeywords(count: number): string[] {
  const keywords = [
    "trading strategies",
    "automated trading",
    "portfolio management",
    "technical analysis",
    "market research",
    "price alerts",
    "risk management",
    "position sizing",
    "stop loss",
    "take profit",
  ];
  return keywords.slice(0, count);
}
