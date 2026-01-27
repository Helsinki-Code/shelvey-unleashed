import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Backlink {
  id?: string;
  source_url: string;
  target_url: string;
  anchor_text: string;
  domain_authority: number;
  page_authority: number;
  referring_domain: string;
  type: "editorial" | "resource" | "guest_post" | "directory" | "lost";
  status: "active" | "lost" | "broken";
  discovered_date: string;
  last_verified: string;
}

interface BacklinkMetrics {
  total_backlinks: number;
  new_backlinks: number;
  lost_backlinks: number;
  avg_domain_authority: number;
  avg_page_authority: number;
  high_quality_backlinks: number;
  top_referring_domains: string[];
}

Deno.serve(async (req) => {
  try {
    const {
      action,
      user_id,
      session_id,
      domain,
      competitor_domain,
      limit,
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "monitor_backlinks") {
      return await monitorBacklinks(
        supabase,
        user_id,
        session_id,
        domain
      );
    }

    if (action === "detect_new_backlinks") {
      return await detectNewBacklinks(
        supabase,
        user_id,
        session_id,
        domain
      );
    }

    if (action === "detect_lost_backlinks") {
      return await detectLostBacklinks(
        supabase,
        user_id,
        session_id,
        domain
      );
    }

    if (action === "competitor_backlink_analysis") {
      return await competitorBacklinkAnalysis(
        supabase,
        user_id,
        session_id,
        competitor_domain
      );
    }

    if (action === "get_backlink_opportunities") {
      return await getBacklinkOpportunities(
        supabase,
        user_id,
        session_id,
        domain,
        limit || 10
      );
    }

    if (action === "monitor_backlink_quality") {
      return await monitorBacklinkQuality(
        supabase,
        user_id,
        session_id,
        domain
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action", action }),
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in backlink-monitor:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
});

async function monitorBacklinks(
  supabase: any,
  userId: string,
  sessionId: string,
  domain: string
) {
  const startTime = Date.now();

  try {
    // Generate mock backlinks
    const backlinks = generateMockBacklinks(domain, 50);

    // Store in database
    for (const backlink of backlinks) {
      await supabase.from("blog_browser_actions").insert({
        user_id: userId,
        action: "monitor_backlinks",
        platform: "backlink_monitor",
        metadata: backlink,
        status: backlink.status,
        created_at: new Date().toISOString(),
      });
    }

    // Calculate metrics
    const metrics: BacklinkMetrics = {
      total_backlinks: backlinks.length,
      new_backlinks: backlinks.filter((b) => isNew(b.discovered_date)).length,
      lost_backlinks: backlinks.filter((b) => b.status === "lost").length,
      avg_domain_authority: Math.round(
        backlinks.reduce((sum, b) => sum + b.domain_authority, 0) /
          backlinks.length
      ),
      avg_page_authority: Math.round(
        backlinks.reduce((sum, b) => sum + b.page_authority, 0) /
          backlinks.length
      ),
      high_quality_backlinks: backlinks.filter(
        (b) => b.domain_authority > 50
      ).length,
      top_referring_domains: getTopReferringDomains(backlinks, 5),
    };

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "monitor_backlinks",
      status: "completed",
      details: {
        domain,
        total_backlinks: metrics.total_backlinks,
        new_backlinks: metrics.new_backlinks,
        lost_backlinks: metrics.lost_backlinks,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        backlinks,
        metrics,
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
      details: { domain },
    });

    throw error;
  }
}

async function detectNewBacklinks(
  supabase: any,
  userId: string,
  sessionId: string,
  domain: string
) {
  const startTime = Date.now();

  try {
    // Simulate finding new backlinks
    const newBacklinks = generateMockBacklinks(domain, 5).map((b) => ({
      ...b,
      status: "active",
      discovered_date: new Date().toISOString(),
    }));

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "detect_new_backlinks",
      status: "completed",
      details: {
        domain,
        new_backlinks_count: newBacklinks.length,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        new_backlinks: newBacklinks,
        count: newBacklinks.length,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "detect_new_backlinks",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { domain },
    });

    throw error;
  }
}

async function detectLostBacklinks(
  supabase: any,
  userId: string,
  sessionId: string,
  domain: string
) {
  const startTime = Date.now();

  try {
    const lostBacklinks = generateMockBacklinks(domain, 3).map((b) => ({
      ...b,
      status: "lost" as const,
      discovered_date: new Date(
        Date.now() - 90 * 24 * 60 * 60 * 1000
      ).toISOString(),
    }));

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "detect_lost_backlinks",
      status: "completed",
      details: {
        domain,
        lost_backlinks_count: lostBacklinks.length,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        lost_backlinks: lostBacklinks,
        count: lostBacklinks.length,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "detect_lost_backlinks",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { domain },
    });

    throw error;
  }
}

async function competitorBacklinkAnalysis(
  supabase: any,
  userId: string,
  sessionId: string,
  competitorDomain: string
) {
  const startTime = Date.now();

  try {
    // Get competitor's backlinks
    const competitorBacklinks = generateMockBacklinks(competitorDomain, 30);

    // Generate analysis
    const analysis = {
      competitor: competitorDomain,
      total_backlinks: competitorBacklinks.length,
      avg_domain_authority: Math.round(
        competitorBacklinks.reduce((sum, b) => sum + b.domain_authority, 0) /
          competitorBacklinks.length
      ),
      high_quality_sources: competitorBacklinks.filter(
        (b) => b.domain_authority > 60
      ).length,
      top_sources: getTopReferringDomains(competitorBacklinks, 10),
      backlink_types: {
        editorial: competitorBacklinks.filter((b) => b.type === "editorial")
          .length,
        resource: competitorBacklinks.filter((b) => b.type === "resource")
          .length,
        guest_post: competitorBacklinks.filter((b) => b.type === "guest_post")
          .length,
        directory: competitorBacklinks.filter((b) => b.type === "directory")
          .length,
      },
    };

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "competitor_backlink_analysis",
      status: "completed",
      details: {
        competitor_domain: competitorDomain,
        total_backlinks: analysis.total_backlinks,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "competitor_backlink_analysis",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { competitor_domain: competitorDomain },
    });

    throw error;
  }
}

async function getBacklinkOpportunities(
  supabase: any,
  userId: string,
  sessionId: string,
  domain: string,
  limit: number
) {
  const startTime = Date.now();

  try {
    // Find gaps where competitors have backlinks but user doesn't
    const opportunities = [
      {
        source: "techblog.example.com",
        content_type: "Guest Post Opportunity",
        domain_authority: 65,
        relevance: 0.92,
        status: "open",
        email_contact: "editor@techblog.example.com",
      },
      {
        source: "finance-resources.example.com",
        content_type: "Resource Directory",
        domain_authority: 58,
        relevance: 0.88,
        status: "open",
        email_contact: "submissions@finance-resources.example.com",
      },
      {
        source: "industry-roundup.example.com",
        content_type: "Industry Roundup",
        domain_authority: 72,
        relevance: 0.85,
        status: "open",
        email_contact: "curator@industry-roundup.example.com",
      },
      {
        source: "trading-news.example.com",
        content_type: "News Feature",
        domain_authority: 68,
        relevance: 0.87,
        status: "open",
        email_contact: "news@trading-news.example.com",
      },
      {
        source: "finance-podcast.example.com",
        content_type: "Podcast Mention",
        domain_authority: 71,
        relevance: 0.83,
        status: "open",
        email_contact: "contact@finance-podcast.example.com",
      },
    ];

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "get_backlink_opportunities",
      status: "completed",
      details: {
        domain,
        opportunities_count: Math.min(limit, opportunities.length),
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        opportunities: opportunities.slice(0, limit),
        total_opportunities: opportunities.length,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "get_backlink_opportunities",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { domain },
    });

    throw error;
  }
}

async function monitorBacklinkQuality(
  supabase: any,
  userId: string,
  sessionId: string,
  domain: string
) {
  const startTime = Date.now();

  try {
    const backlinks = generateMockBacklinks(domain, 50);

    const qualityReport = {
      excellent: backlinks.filter((b) => b.domain_authority > 70).length,
      good: backlinks.filter(
        (b) => b.domain_authority > 50 && b.domain_authority <= 70
      ).length,
      average: backlinks.filter(
        (b) => b.domain_authority > 30 && b.domain_authority <= 50
      ).length,
      poor: backlinks.filter((b) => b.domain_authority <= 30).length,
    };

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "monitor_backlink_quality",
      status: "completed",
      details: {
        domain,
        excellent: qualityReport.excellent,
        good: qualityReport.good,
        average: qualityReport.average,
        poor: qualityReport.poor,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        quality_report: qualityReport,
        total_backlinks: backlinks.length,
        quality_percentage: (
          ((qualityReport.excellent + qualityReport.good) /
            backlinks.length) *
          100
        ).toFixed(2),
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "monitor_backlink_quality",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { domain },
    });

    throw error;
  }
}

// Helper functions

function generateMockBacklinks(domain: string, count: number): Backlink[] {
  const backlinks: Backlink[] = [];
  const types: Array<"editorial" | "resource" | "guest_post" | "directory" | "lost"> = [
    "editorial",
    "resource",
    "guest_post",
    "directory",
    "lost",
  ];

  for (let i = 0; i < count; i++) {
    backlinks.push({
      source_url: `https://site${i}.example.com/article-${i}`,
      target_url: `https://${domain}/blog/article-${i}`,
      anchor_text: [
        "trading strategies",
        "portfolio management",
        "automated trading",
        "market analysis",
        domain,
      ][i % 5],
      domain_authority: Math.floor(Math.random() * 90) + 10,
      page_authority: Math.floor(Math.random() * 80) + 10,
      referring_domain: `site${i}.example.com`,
      type: types[i % types.length],
      status:
        Math.random() > 0.9
          ? "broken"
          : Math.random() > 0.95
            ? "lost"
            : "active",
      discovered_date: new Date(
        Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000
      ).toISOString(),
      last_verified: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
  }

  return backlinks;
}

function isNew(discoveredDate: string): boolean {
  const date = new Date(discoveredDate);
  const daysAgo =
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return daysAgo < 7;
}

function getTopReferringDomains(backlinks: Backlink[], limit: number): string[] {
  const domains = new Map<string, number>();

  for (const backlink of backlinks) {
    domains.set(
      backlink.referring_domain,
      (domains.get(backlink.referring_domain) || 0) + 1
    );
  }

  return Array.from(domains.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([domain]) => domain);
}
