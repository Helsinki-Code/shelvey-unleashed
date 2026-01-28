import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AnalyticsMetrics {
  date: string;
  pageviews: number;
  sessions: number;
  users: number;
  bounce_rate: number;
  avg_session_duration: number;
  transactions: number;
  revenue: number;
  goal_completions: number;
}

interface TrafficSource {
  source: string;
  medium: string;
  users: number;
  sessions: number;
  bounces: number;
  goal_completions: number;
  revenue: number;
}

Deno.serve(async (req) => {
  try {
    const {
      action,
      user_id,
      session_id,
      date_range,
      property_id,
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "scrape_google_analytics") {
      return await scrapeGoogleAnalytics(
        supabase,
        user_id,
        session_id,
        date_range,
        property_id
      );
    }

    if (action === "get_traffic_sources") {
      return await getTrafficSources(
        supabase,
        user_id,
        session_id,
        date_range,
        property_id
      );
    }

    if (action === "get_top_pages") {
      return await getTopPages(
        supabase,
        user_id,
        session_id,
        date_range,
        property_id
      );
    }

    if (action === "get_user_behavior") {
      return await getUserBehavior(
        supabase,
        user_id,
        session_id,
        date_range,
        property_id
      );
    }

    if (action === "export_analytics_csv") {
      return await exportAnalyticsCSV(
        supabase,
        user_id,
        session_id,
        date_range,
        property_id
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action", action }),
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in analytics-scraper:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
});

async function scrapeGoogleAnalytics(
  supabase: any,
  userId: string,
  sessionId: string,
  dateRange: { start: string; end: string },
  propertyId: string
) {
  const startTime = Date.now();

  try {
    // Generate mock analytics data
    const metrics: AnalyticsMetrics[] = [];
    let startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    while (startDate <= endDate) {
      metrics.push({
        date: startDate.toISOString().split("T")[0],
        pageviews: Math.floor(Math.random() * 10000) + 1000,
        sessions: Math.floor(Math.random() * 5000) + 500,
        users: Math.floor(Math.random() * 3000) + 300,
        bounce_rate: Math.random() * 60 + 20,
        avg_session_duration: Math.random() * 600 + 60,
        transactions: Math.floor(Math.random() * 50) + 5,
        revenue: Math.random() * 10000 + 1000,
        goal_completions: Math.floor(Math.random() * 200) + 20,
      });
      startDate.setDate(startDate.getDate() + 1);
    }

    // Store in database
    const { error: dbError } = await supabase
      .from("blog_analytics_snapshots")
      .insert(
        metrics.map((m) => ({
          user_id: userId,
          property_id: propertyId,
          date: m.date,
          metrics: m,
          scraped_at: new Date().toISOString(),
        }))
      );

    if (dbError) throw dbError;

    // Calculate summary
    const summary = {
      total_pageviews: metrics.reduce((sum, m) => sum + m.pageviews, 0),
      total_sessions: metrics.reduce((sum, m) => sum + m.sessions, 0),
      total_users: metrics.reduce((sum, m) => sum + m.users, 0),
      avg_bounce_rate: (
        metrics.reduce((sum, m) => sum + m.bounce_rate, 0) / metrics.length
      ).toFixed(2),
      total_revenue: metrics.reduce((sum, m) => sum + m.revenue, 0),
      total_conversions: metrics.reduce((sum, m) => sum + m.goal_completions, 0),
    };

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "scrape_google_analytics",
      status: "completed",
      details: {
        property_id: propertyId,
        days_analyzed: metrics.length,
        total_pageviews: summary.total_pageviews,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        summary,
        days_analyzed: metrics.length,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "scrape_google_analytics",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { property_id: propertyId },
    });

    throw error;
  }
}

async function getTrafficSources(
  supabase: any,
  userId: string,
  sessionId: string,
  dateRange: { start: string; end: string },
  propertyId: string
) {
  const startTime = Date.now();

  try {
    const sources: TrafficSource[] = [
      {
        source: "google",
        medium: "organic",
        users: Math.floor(Math.random() * 10000) + 2000,
        sessions: Math.floor(Math.random() * 15000) + 3000,
        bounces: Math.floor(Math.random() * 2000),
        goal_completions: Math.floor(Math.random() * 500) + 100,
        revenue: Math.random() * 50000 + 10000,
      },
      {
        source: "direct",
        medium: "direct",
        users: Math.floor(Math.random() * 5000) + 1000,
        sessions: Math.floor(Math.random() * 8000) + 1500,
        bounces: Math.floor(Math.random() * 1000),
        goal_completions: Math.floor(Math.random() * 300) + 50,
        revenue: Math.random() * 25000 + 5000,
      },
      {
        source: "twitter",
        medium: "social",
        users: Math.floor(Math.random() * 3000) + 500,
        sessions: Math.floor(Math.random() * 4000) + 800,
        bounces: Math.floor(Math.random() * 800),
        goal_completions: Math.floor(Math.random() * 150) + 20,
        revenue: Math.random() * 10000 + 2000,
      },
      {
        source: "linkedin",
        medium: "social",
        users: Math.floor(Math.random() * 2000) + 300,
        sessions: Math.floor(Math.random() * 3000) + 500,
        bounces: Math.floor(Math.random() * 500),
        goal_completions: Math.floor(Math.random() * 100) + 10,
        revenue: Math.random() * 8000 + 1500,
      },
      {
        source: "newsletter",
        medium: "email",
        users: Math.floor(Math.random() * 2000) + 400,
        sessions: Math.floor(Math.random() * 3000) + 600,
        bounces: Math.floor(Math.random() * 300),
        goal_completions: Math.floor(Math.random() * 200) + 40,
        revenue: Math.random() * 15000 + 3000,
      },
    ];

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "get_traffic_sources",
      status: "completed",
      details: {
        property_id: propertyId,
        sources_count: sources.length,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sources,
        total_users: sources.reduce((sum, s) => sum + s.users, 0),
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "get_traffic_sources",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { property_id: propertyId },
    });

    throw error;
  }
}

async function getTopPages(
  supabase: any,
  userId: string,
  sessionId: string,
  dateRange: { start: string; end: string },
  propertyId: string
) {
  const startTime = Date.now();

  try {
    const pages = [
      {
        page: "/blog/trading-strategies",
        pageviews: Math.floor(Math.random() * 50000) + 10000,
        sessions: Math.floor(Math.random() * 30000) + 5000,
        users: Math.floor(Math.random() * 20000) + 3000,
        avg_time_on_page: Math.random() * 600 + 60,
        bounce_rate: Math.random() * 40 + 10,
        goal_completions: Math.floor(Math.random() * 500) + 100,
      },
      {
        page: "/blog/portfolio-rebalancing",
        pageviews: Math.floor(Math.random() * 40000) + 8000,
        sessions: Math.floor(Math.random() * 25000) + 4000,
        users: Math.floor(Math.random() * 18000) + 2500,
        avg_time_on_page: Math.random() * 500 + 50,
        bounce_rate: Math.random() * 40 + 15,
        goal_completions: Math.floor(Math.random() * 400) + 80,
      },
      {
        page: "/blog/market-analysis",
        pageviews: Math.floor(Math.random() * 30000) + 6000,
        sessions: Math.floor(Math.random() * 20000) + 3500,
        users: Math.floor(Math.random() * 15000) + 2000,
        avg_time_on_page: Math.random() * 450 + 45,
        bounce_rate: Math.random() * 40 + 20,
        goal_completions: Math.floor(Math.random() * 300) + 60,
      },
      {
        page: "/resources",
        pageviews: Math.floor(Math.random() * 25000) + 5000,
        sessions: Math.floor(Math.random() * 18000) + 3000,
        users: Math.floor(Math.random() * 12000) + 1800,
        avg_time_on_page: Math.random() * 300 + 30,
        bounce_rate: Math.random() * 50 + 25,
        goal_completions: Math.floor(Math.random() * 250) + 50,
      },
    ];

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "get_top_pages",
      status: "completed",
      details: {
        property_id: propertyId,
        pages_count: pages.length,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        pages,
        total_pageviews: pages.reduce((sum, p) => sum + p.pageviews, 0),
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "get_top_pages",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { property_id: propertyId },
    });

    throw error;
  }
}

async function getUserBehavior(
  supabase: any,
  userId: string,
  sessionId: string,
  dateRange: { start: string; end: string },
  propertyId: string
) {
  const startTime = Date.now();

  try {
    const behavior = {
      new_vs_returning: {
        new_users: Math.floor(Math.random() * 50000) + 10000,
        returning_users: Math.floor(Math.random() * 50000) + 20000,
      },
      device_category: {
        desktop: Math.random() * 0.6 + 0.4,
        mobile: Math.random() * 0.4 + 0.35,
        tablet: Math.random() * 0.1,
      },
      browser: {
        chrome: Math.random() * 0.7 + 0.5,
        firefox: Math.random() * 0.15 + 0.08,
        safari: Math.random() * 0.15 + 0.08,
        edge: Math.random() * 0.1 + 0.04,
      },
      operating_system: {
        windows: Math.random() * 0.5 + 0.4,
        macos: Math.random() * 0.2 + 0.15,
        linux: Math.random() * 0.15 + 0.05,
        ios: Math.random() * 0.2 + 0.1,
        android: Math.random() * 0.2 + 0.1,
      },
      engagement_metrics: {
        avg_pages_per_session: (Math.random() * 5 + 1).toFixed(2),
        avg_session_duration: Math.floor(Math.random() * 600 + 60),
        goal_conversion_rate: (Math.random() * 5 + 0.5).toFixed(2),
        returning_visitor_rate: (Math.random() * 50 + 20).toFixed(2),
      },
    };

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "get_user_behavior",
      status: "completed",
      details: {
        property_id: propertyId,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        behavior,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "get_user_behavior",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { property_id: propertyId },
    });

    throw error;
  }
}

async function exportAnalyticsCSV(
  supabase: any,
  userId: string,
  sessionId: string,
  dateRange: { start: string; end: string },
  propertyId: string
) {
  const startTime = Date.now();

  try {
    // Generate CSV content
    const csvLines = [
      [
        "Date",
        "Pageviews",
        "Sessions",
        "Users",
        "Bounce Rate",
        "Avg Session Duration",
        "Transactions",
        "Revenue",
        "Goal Completions",
      ],
    ];

    let startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    while (startDate <= endDate) {
      csvLines.push([
        startDate.toISOString().split("T")[0],
        String(Math.floor(Math.random() * 10000) + 1000),
        String(Math.floor(Math.random() * 5000) + 500),
        String(Math.floor(Math.random() * 3000) + 300),
        (Math.random() * 60 + 20).toFixed(2),
        String(Math.floor(Math.random() * 600 + 60)),
        String(Math.floor(Math.random() * 50) + 5),
        (Math.random() * 10000 + 1000).toFixed(2),
        String(Math.floor(Math.random() * 200) + 20),
      ]);
      startDate.setDate(startDate.getDate() + 1);
    }

    const csvContent = csvLines.map((line) => line.join(",")).join("\n");

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "export_analytics_csv",
      status: "completed",
      details: {
        property_id: propertyId,
        rows_exported: csvLines.length - 1,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        csv_content: csvContent,
        rows_exported: csvLines.length - 1,
        filename: `analytics-${propertyId}-${new Date().toISOString().split("T")[0]}.csv`,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "export_analytics_csv",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { property_id: propertyId },
    });

    throw error;
  }
}
