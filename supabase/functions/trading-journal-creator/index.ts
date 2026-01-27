import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface JournalEntry {
  id: string;
  user_id: string;
  symbol: string;
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  profit_loss_usd: number;
  profit_loss_percent: number;
  risk_reward_ratio: number;
  execution_quality: "excellent" | "good" | "poor";
  setup_description: string;
  screenshot_urls: string[];
  notes: string;
  created_at: string;
}

interface JournalStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_profit_loss: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number;
  largest_win: number;
  largest_loss: number;
}

Deno.serve(async (req) => {
  try {
    const {
      action,
      user_id,
      session_id,
      entry,
      date_range,
      symbols,
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "create_entry") {
      return await createJournalEntry(
        supabase,
        user_id,
        session_id,
        entry
      );
    }

    if (action === "get_entries") {
      return await getJournalEntries(
        supabase,
        user_id,
        date_range,
        symbols
      );
    }

    if (action === "get_statistics") {
      return await getJournalStatistics(
        supabase,
        user_id,
        date_range,
        symbols
      );
    }

    if (action === "generate_report") {
      return await generateJournalReport(
        supabase,
        user_id,
        session_id,
        date_range
      );
    }

    if (action === "auto_journal_from_portfolio") {
      return await autoJournalFromPortfolio(
        supabase,
        user_id,
        session_id
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action", action }),
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in trading-journal-creator:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
});

async function createJournalEntry(
  supabase: any,
  userId: string,
  sessionId: string,
  entry: Partial<JournalEntry>
) {
  const startTime = Date.now();

  try {
    // Calculate metrics if not provided
    const entryPrice = entry.entry_price || 0;
    const exitPrice = entry.exit_price || 0;
    const quantity = entry.quantity || 1;

    const profitLossUsd = (exitPrice - entryPrice) * quantity;
    const profitLossPercent =
      entryPrice > 0 ? (profitLossUsd / (entryPrice * quantity)) * 100 : 0;

    const journalEntry = {
      user_id: userId,
      symbol: entry.symbol,
      entry_date: entry.entry_date || new Date().toISOString(),
      exit_date: entry.exit_date || new Date().toISOString(),
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      profit_loss_usd: Math.round(profitLossUsd * 100) / 100,
      profit_loss_percent: Math.round(profitLossPercent * 100) / 100,
      risk_reward_ratio: entry.risk_reward_ratio || 1.0,
      execution_quality: entry.execution_quality || "good",
      setup_description: entry.setup_description || "",
      screenshot_urls: entry.screenshot_urls || [],
      notes: entry.notes || "",
    };

    const { data, error } = await supabase
      .from("trading_journals")
      .insert(journalEntry)
      .select()
      .single();

    if (error) throw error;

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "create_journal_entry",
      status: "completed",
      details: {
        symbol: entry.symbol,
        profit_loss: journalEntry.profit_loss_usd,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        entry: data,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "create_journal_entry",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { symbol: entry.symbol },
    });

    throw error;
  }
}

async function getJournalEntries(
  supabase: any,
  userId: string,
  dateRange?: { start: string; end: string },
  symbols?: string[]
) {
  try {
    let query = supabase
      .from("trading_journals")
      .select("*")
      .eq("user_id", userId)
      .order("entry_date", { ascending: false });

    if (dateRange) {
      query = query
        .gte("entry_date", dateRange.start)
        .lte("entry_date", dateRange.end);
    }

    if (symbols && symbols.length > 0) {
      query = query.in("symbol", symbols);
    }

    const { data, error } = await query;

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        entries: data || [],
        total: data?.length || 0,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error getting journal entries:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}

async function getJournalStatistics(
  supabase: any,
  userId: string,
  dateRange?: { start: string; end: string },
  symbols?: string[]
): Promise<Response> {
  try {
    let query = supabase
      .from("trading_journals")
      .select("*")
      .eq("user_id", userId);

    if (dateRange) {
      query = query
        .gte("entry_date", dateRange.start)
        .lte("entry_date", dateRange.end);
    }

    if (symbols && symbols.length > 0) {
      query = query.in("symbol", symbols);
    }

    const { data: entries, error } = await query;

    if (error) throw error;

    const stats = calculateStatistics(entries || []);

    return new Response(
      JSON.stringify({
        success: true,
        statistics: stats,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error getting journal statistics:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}

async function generateJournalReport(
  supabase: any,
  userId: string,
  sessionId: string,
  dateRange?: { start: string; end: string }
) {
  const startTime = Date.now();

  try {
    let query = supabase
      .from("trading_journals")
      .select("*")
      .eq("user_id", userId);

    if (dateRange) {
      query = query
        .gte("entry_date", dateRange.start)
        .lte("entry_date", dateRange.end);
    }

    const { data: entries, error } = await query;

    if (error) throw error;

    const stats = calculateStatistics(entries || []);

    // Generate HTML report
    const report = generateHtmlReport(entries || [], stats, dateRange);

    // Create downloadable PDF content
    const pdfContent = {
      title: "Trading Journal Report",
      generated: new Date().toISOString(),
      period: dateRange || "All Time",
      statistics: stats,
      entries: entries || [],
      pages: Math.ceil((entries?.length || 0) / 20),
    };

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "generate_journal_report",
      status: "completed",
      details: {
        total_entries: entries?.length || 0,
        period: dateRange || "All Time",
        stats_summary: {
          total_trades: stats.total_trades,
          win_rate: stats.win_rate,
          total_profit_loss: stats.total_profit_loss,
        },
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        report: pdfContent,
        statistics: stats,
        entry_count: entries?.length || 0,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "generate_journal_report",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

async function autoJournalFromPortfolio(
  supabase: any,
  userId: string,
  sessionId: string
) {
  const startTime = Date.now();

  try {
    // Get recent closed positions from portfolio snapshots
    const { data: snapshots, error: snapshotError } = await supabase
      .from("trading_portfolio_snapshots")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (snapshotError) throw snapshotError;

    const createdEntries = [];

    // Simulate creating journal entries from portfolio data
    for (const snapshot of snapshots || []) {
      if (snapshot.closed_positions && snapshot.closed_positions.length > 0) {
        for (const position of snapshot.closed_positions) {
          const entry = {
            user_id: userId,
            symbol: position.symbol,
            entry_date: position.entry_date,
            exit_date: position.exit_date,
            entry_price: position.entry_price,
            exit_price: position.exit_price,
            quantity: position.quantity,
            profit_loss_usd: position.profit_loss,
            profit_loss_percent: position.profit_loss_percent,
            risk_reward_ratio: position.risk_reward_ratio || 1.0,
            execution_quality: "good",
            setup_description: `Auto-imported from portfolio on ${new Date().toLocaleDateString()}`,
            screenshot_urls: [],
            notes: position.notes || "",
          };

          const { data: journalEntry, error: insertError } = await supabase
            .from("trading_journals")
            .insert(entry)
            .select()
            .single();

          if (!insertError && journalEntry) {
            createdEntries.push(journalEntry);
          }
        }
      }
    }

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "auto_journal_from_portfolio",
      status: "completed",
      details: {
        entries_created: createdEntries.length,
        snapshots_processed: snapshots?.length || 0,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        entries_created: createdEntries.length,
        entries: createdEntries,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "auto_journal_from_portfolio",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

function calculateStatistics(entries: any[]): JournalStats {
  if (entries.length === 0) {
    return {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0,
      total_profit_loss: 0,
      avg_win: 0,
      avg_loss: 0,
      profit_factor: 0,
      largest_win: 0,
      largest_loss: 0,
    };
  }

  const winningTrades = entries.filter((e) => e.profit_loss_usd > 0);
  const losingTrades = entries.filter((e) => e.profit_loss_usd < 0);

  const totalPL = entries.reduce((sum, e) => sum + e.profit_loss_usd, 0);
  const avgWin =
    winningTrades.length > 0
      ? winningTrades.reduce((sum, e) => sum + e.profit_loss_usd, 0) /
        winningTrades.length
      : 0;
  const avgLoss =
    losingTrades.length > 0
      ? Math.abs(
          losingTrades.reduce((sum, e) => sum + e.profit_loss_usd, 0) /
            losingTrades.length
        )
      : 0;

  const totalWins = winningTrades.reduce((sum, e) => sum + e.profit_loss_usd, 0);
  const totalLosses = Math.abs(
    losingTrades.reduce((sum, e) => sum + e.profit_loss_usd, 0)
  );
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

  return {
    total_trades: entries.length,
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length,
    win_rate: (winningTrades.length / entries.length) * 100,
    total_profit_loss: Math.round(totalPL * 100) / 100,
    avg_win: Math.round(avgWin * 100) / 100,
    avg_loss: Math.round(avgLoss * 100) / 100,
    profit_factor: Math.round(profitFactor * 100) / 100,
    largest_win: Math.max(...entries.map((e) => e.profit_loss_usd), 0),
    largest_loss: Math.abs(Math.min(...entries.map((e) => e.profit_loss_usd), 0)),
  };
}

function generateHtmlReport(
  entries: any[],
  stats: JournalStats,
  dateRange?: { start: string; end: string }
): string {
  const periodText = dateRange
    ? `${dateRange.start} to ${dateRange.end}`
    : "All Time";

  return `
<html>
<head>
  <title>Trading Journal Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .stats { display: grid; grid-cols-cols: 4; gap: 20px; margin: 20px 0; }
    .stat-box { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
    .stat-label { font-size: 12px; color: #666; }
    .stat-value { font-size: 24px; font-weight: bold; color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; }
    .positive { color: green; }
    .negative { color: red; }
  </style>
</head>
<body>
  <h1>Trading Journal Report</h1>
  <p>Period: ${periodText}</p>
  <p>Generated: ${new Date().toISOString()}</p>

  <div class="stats">
    <div class="stat-box">
      <div class="stat-label">Total Trades</div>
      <div class="stat-value">${stats.total_trades}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Win Rate</div>
      <div class="stat-value">${stats.win_rate.toFixed(1)}%</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Total P&L</div>
      <div class="stat-value ${stats.total_profit_loss >= 0 ? "positive" : "negative"}">
        $${Math.abs(stats.total_profit_loss).toLocaleString()}
      </div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Profit Factor</div>
      <div class="stat-value">${stats.profit_factor.toFixed(2)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Symbol</th>
        <th>Entry Date</th>
        <th>Exit Date</th>
        <th>Profit/Loss</th>
        <th>Quality</th>
      </tr>
    </thead>
    <tbody>
      ${entries
        .slice(0, 50)
        .map(
          (e) => `
      <tr>
        <td>${e.symbol}</td>
        <td>${new Date(e.entry_date).toLocaleDateString()}</td>
        <td>${new Date(e.exit_date).toLocaleDateString()}</td>
        <td class="${e.profit_loss_usd >= 0 ? "positive" : "negative"}">
          $${e.profit_loss_usd.toLocaleString()}
        </td>
        <td>${e.execution_quality}</td>
      </tr>
    `
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>
  `;
}
