import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface MarketData {
  symbol: string;
  current_price: number;
  bid: number;
  ask: number;
  volume_24h: number;
  rsi: number;
  macd: number;
  moving_avg_50: number;
  moving_avg_200: number;
  sentiment_score: number;
  source: string;
  timestamp: string;
}

interface ScrapingResult {
  symbol: string;
  success: boolean;
  data?: MarketData;
  error?: string;
  source: string;
}

Deno.serve(async (req) => {
  try {
    const { action, symbols, exchanges, user_id, session_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "scrape_market_data") {
      return await scrapeMarketData(
        supabase,
        symbols || [],
        exchanges || ["tradingview", "finviz"],
        user_id,
        session_id
      );
    }

    if (action === "scrape_news") {
      return await scrapeNews(supabase, symbols || [], user_id, session_id);
    }

    if (action === "scrape_earnings_calendar") {
      return await scrapeEarningsCalendar(supabase, user_id, session_id);
    }

    if (action === "scrape_economic_calendar") {
      return await scrapeEconomicCalendar(supabase, user_id, session_id);
    }

    return new Response(
      JSON.stringify({ error: "Unknown action", action }),
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in trading-market-scraper:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
});

async function scrapeMarketData(
  supabase: any,
  symbols: string[],
  exchanges: string[],
  userId: string,
  sessionId: string
) {
  const results: ScrapingResult[] = [];
  const startTime = Date.now();

  try {
    // Simulate scraping from multiple sources
    for (const symbol of symbols) {
      const sources = ["TradingView", "Finviz", "StockTwits"];

      for (const source of sources) {
        if (exchanges.includes(source.toLowerCase())) {
          const data = generateMockMarketData(symbol, source);
          results.push({
            symbol,
            success: true,
            data,
            source,
          });

          // Store in database
          const { error } = await supabase.from("trading_market_data").upsert(
            {
              user_id: userId,
              symbol: data.symbol,
              current_price: data.current_price,
              bid: data.bid,
              ask: data.ask,
              volume_24h: data.volume_24h,
              rsi: data.rsi,
              macd: data.macd,
              moving_avg_50: data.moving_avg_50,
              moving_avg_200: data.moving_avg_200,
              sentiment_score: data.sentiment_score,
              source: source,
              scraped_at: new Date().toISOString(),
            },
            { onConflict: "user_id,symbol,source" }
          );

          if (error) {
            console.error(`Error storing market data for ${symbol}:`, error);
          }
        }
      }
    }

    // Log to audit trail
    const duration = Date.now() - startTime;
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "scrape_market_data",
      status: "completed",
      details: {
        symbols,
        exchanges,
        results_count: results.length,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total: results.length,
        duration_ms: duration,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "scrape_market_data",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { symbols, exchanges },
    });

    throw error;
  }
}

async function scrapeNews(
  supabase: any,
  symbols: string[],
  userId: string,
  sessionId: string
) {
  const results = [];
  const startTime = Date.now();

  try {
    for (const symbol of symbols) {
      // Mock news articles
      const newsArticles = [
        {
          title: `${symbol} Q4 Earnings Beat Expectations`,
          source: "Reuters",
          url: `https://example.com/news/${symbol}/q4-earnings`,
          published: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          sentiment: "positive",
          relevance_score: 0.95,
        },
        {
          title: `Analyst Upgrades ${symbol} to Buy`,
          source: "Bloomberg",
          url: `https://example.com/news/${symbol}/analyst-upgrade`,
          published: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          sentiment: "positive",
          relevance_score: 0.88,
        },
        {
          title: `${symbol} Supply Chain Concerns`,
          source: "MarketWatch",
          url: `https://example.com/news/${symbol}/supply-chain`,
          published: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          sentiment: "negative",
          relevance_score: 0.72,
        },
      ];

      results.push({
        symbol,
        articles: newsArticles,
        count: newsArticles.length,
      });
    }

    const duration = Date.now() - startTime;
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "scrape_news",
      status: "completed",
      details: {
        symbols,
        articles_count: results.reduce((sum, r) => sum + r.count, 0),
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({ success: true, results, duration_ms: duration }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "scrape_news",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { symbols },
    });

    throw error;
  }
}

async function scrapeEarningsCalendar(
  supabase: any,
  userId: string,
  sessionId: string
) {
  const startTime = Date.now();

  try {
    const earnings = [
      {
        symbol: "AAPL",
        report_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        fiscal_period: "Q1 2026",
        estimated_eps: 1.95,
        previous_eps: 1.88,
        market_cap: 3400000000000,
      },
      {
        symbol: "MSFT",
        report_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        fiscal_period: "Q2 2026",
        estimated_eps: 2.52,
        previous_eps: 2.45,
        market_cap: 3100000000000,
      },
      {
        symbol: "GOOGL",
        report_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        fiscal_period: "Q4 2025",
        estimated_eps: 2.18,
        previous_eps: 2.10,
        market_cap: 2200000000000,
      },
    ];

    const duration = Date.now() - startTime;
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "scrape_earnings_calendar",
      status: "completed",
      details: {
        earnings_count: earnings.length,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({ success: true, earnings, duration_ms: duration }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "scrape_earnings_calendar",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

async function scrapeEconomicCalendar(
  supabase: any,
  userId: string,
  sessionId: string
) {
  const startTime = Date.now();

  try {
    const events = [
      {
        event: "US GDP",
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        forecast: "2.5%",
        previous: "2.3%",
        importance: "high",
        country: "US",
      },
      {
        event: "Fed Interest Rate Decision",
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        forecast: "5.25%",
        previous: "5.00%",
        importance: "high",
        country: "US",
      },
      {
        event: "US Unemployment Rate",
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        forecast: "3.7%",
        previous: "3.9%",
        importance: "medium",
        country: "US",
      },
      {
        event: "ECB Interest Rate Decision",
        date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        forecast: "4.75%",
        previous: "4.50%",
        importance: "high",
        country: "EU",
      },
    ];

    const duration = Date.now() - startTime;
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "scrape_economic_calendar",
      status: "completed",
      details: {
        events_count: events.length,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({ success: true, events, duration_ms: duration }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "scrape_economic_calendar",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

function generateMockMarketData(symbol: string, source: string): MarketData {
  const basePrice = getSymbolBasePrice(symbol);
  const currentPrice = basePrice * (0.95 + Math.random() * 0.1);
  const spread = currentPrice * 0.001;

  return {
    symbol,
    current_price: Math.round(currentPrice * 100) / 100,
    bid: Math.round((currentPrice - spread) * 100) / 100,
    ask: Math.round((currentPrice + spread) * 100) / 100,
    volume_24h: Math.floor(Math.random() * 100000000),
    rsi: 30 + Math.random() * 40,
    macd: -0.5 + Math.random() * 1.0,
    moving_avg_50: currentPrice * (0.98 + Math.random() * 0.04),
    moving_avg_200: currentPrice * (0.96 + Math.random() * 0.08),
    sentiment_score: -100 + Math.random() * 200,
    source,
    timestamp: new Date().toISOString(),
  };
}

function getSymbolBasePrice(symbol: string): number {
  const prices: Record<string, number> = {
    AAPL: 180,
    MSFT: 320,
    GOOGL: 140,
    AMZN: 170,
    TSLA: 240,
    BTC: 42000,
    ETH: 2300,
    NVDA: 850,
    META: 475,
    NFLX: 560,
  };
  return prices[symbol] || 100;
}
