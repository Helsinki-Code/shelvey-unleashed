import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface TaxLot {
  symbol: string;
  quantity: number;
  cost_basis: number;
  acquisition_date: string;
  sale_price: number;
  sale_date: string;
  holding_period: "short-term" | "long-term";
  gain_loss: number;
  gain_loss_percent: number;
}

interface TaxReport {
  year: number;
  short_term_gains: number;
  long_term_gains: number;
  total_gains: number;
  wash_sales: number;
  unrealized_gains: number;
  tax_lots: TaxLot[];
}

interface ComplianceReport {
  year: number;
  total_trades: number;
  pnl_summary: {
    realized_gains: number;
    realized_losses: number;
    net_gain_loss: number;
  };
  risk_metrics: {
    max_drawdown: number;
    risk_per_trade: number;
    largest_loss: number;
    largest_gain: number;
  };
  regulatory_flags: string[];
}

Deno.serve(async (req) => {
  try {
    const {
      action,
      user_id,
      session_id,
      year,
      date_range,
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "generate_tax_report") {
      return await generateTaxReport(
        supabase,
        user_id,
        session_id,
        year
      );
    }

    if (action === "generate_compliance_report") {
      return await generateComplianceReport(
        supabase,
        user_id,
        session_id,
        date_range
      );
    }

    if (action === "detect_wash_sales") {
      return await detectWashSales(supabase, user_id, session_id, date_range);
    }

    if (action === "export_to_form_8949") {
      return await exportToForm8949(supabase, user_id, session_id, year);
    }

    if (action === "check_regulatory_compliance") {
      return await checkRegulatoryCompliance(
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
    console.error("Error in trading-compliance-reporter:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
});

async function generateTaxReport(
  supabase: any,
  userId: string,
  sessionId: string,
  year: number
) {
  const startTime = Date.now();

  try {
    const startDate = new Date(year, 0, 1).toISOString();
    const endDate = new Date(year, 11, 31).toISOString();

    // Get all trades for the year
    const { data: trades, error: tradesError } = await supabase
      .from("trading_journals")
      .select("*")
      .eq("user_id", userId)
      .gte("exit_date", startDate)
      .lte("exit_date", endDate);

    if (tradesError) throw tradesError;

    // Separate short-term (< 1 year) and long-term (>= 1 year) gains
    const taxLots: TaxLot[] = (trades || []).map((trade: any) => {
      const entryDate = new Date(trade.entry_date);
      const exitDate = new Date(trade.exit_date);
      const daysDiff = (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
      const holdingPeriod = daysDiff >= 365 ? "long-term" : "short-term";

      return {
        symbol: trade.symbol,
        quantity: trade.quantity,
        cost_basis: trade.entry_price * trade.quantity,
        acquisition_date: trade.entry_date,
        sale_price: trade.exit_price * trade.quantity,
        sale_date: trade.exit_date,
        holding_period: holdingPeriod,
        gain_loss: trade.profit_loss_usd,
        gain_loss_percent: trade.profit_loss_percent,
      };
    });

    const shortTermGains = taxLots
      .filter((t) => t.holding_period === "short-term" && t.gain_loss > 0)
      .reduce((sum, t) => sum + t.gain_loss, 0);

    const shortTermLosses = Math.abs(
      taxLots
        .filter((t) => t.holding_period === "short-term" && t.gain_loss < 0)
        .reduce((sum, t) => sum + t.gain_loss, 0)
    );

    const longTermGains = taxLots
      .filter((t) => t.holding_period === "long-term" && t.gain_loss > 0)
      .reduce((sum, t) => sum + t.gain_loss, 0);

    const longTermLosses = Math.abs(
      taxLots
        .filter((t) => t.holding_period === "long-term" && t.gain_loss < 0)
        .reduce((sum, t) => sum + t.gain_loss, 0)
    );

    const totalGains = shortTermGains + longTermGains;

    const report: TaxReport = {
      year,
      short_term_gains: Math.round((shortTermGains - shortTermLosses) * 100) / 100,
      long_term_gains: Math.round((longTermGains - longTermLosses) * 100) / 100,
      total_gains: Math.round((totalGains - (shortTermLosses + longTermLosses)) * 100) / 100,
      wash_sales: 0, // Would calculate in real implementation
      unrealized_gains: 0,
      tax_lots: taxLots,
    };

    const duration = Date.now() - startTime;

    // Create downloadable content
    const csvContent = generateTaxReportCSV(report);

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "generate_tax_report",
      status: "completed",
      details: {
        year,
        total_transactions: taxLots.length,
        short_term_gains: report.short_term_gains,
        long_term_gains: report.long_term_gains,
        total_gain_loss: report.total_gains,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        report,
        csv_content: csvContent,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "generate_tax_report",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { year },
    });

    throw error;
  }
}

async function generateComplianceReport(
  supabase: any,
  userId: string,
  sessionId: string,
  dateRange?: { start: string; end: string }
) {
  const startTime = Date.now();

  try {
    const year = dateRange
      ? new Date(dateRange.start).getFullYear()
      : new Date().getFullYear();

    // Get all trades
    let query = supabase
      .from("trading_journals")
      .select("*")
      .eq("user_id", userId);

    if (dateRange) {
      query = query
        .gte("exit_date", dateRange.start)
        .lte("exit_date", dateRange.end);
    }

    const { data: trades, error: tradesError } = await query;

    if (tradesError) throw tradesError;

    // Calculate metrics
    const totalTrades = trades?.length || 0;
    const realizedGains = (trades || [])
      .filter((t: any) => t.profit_loss_usd > 0)
      .reduce((sum: number, t: any) => sum + t.profit_loss_usd, 0);

    const realizedLosses = Math.abs(
      (trades || [])
        .filter((t: any) => t.profit_loss_usd < 0)
        .reduce((sum: number, t: any) => sum + t.profit_loss_usd, 0)
    );

    const largestGain = Math.max(
      ...(trades || []).map((t: any) => t.profit_loss_usd),
      0
    );
    const largestLoss = Math.abs(
      Math.min(...(trades || []).map((t: any) => t.profit_loss_usd), 0)
    );

    // Check for regulatory flags
    const regulatoryFlags = checkRegulatoryFlags(
      trades || [],
      totalTrades
    );

    const report: ComplianceReport = {
      year,
      total_trades: totalTrades,
      pnl_summary: {
        realized_gains: Math.round(realizedGains * 100) / 100,
        realized_losses: Math.round(realizedLosses * 100) / 100,
        net_gain_loss: Math.round((realizedGains - realizedLosses) * 100) / 100,
      },
      risk_metrics: {
        max_drawdown: calculateMaxDrawdown(trades || []),
        risk_per_trade: calculateRiskPerTrade(trades || []),
        largest_loss: largestLoss,
        largest_gain: largestGain,
      },
      regulatory_flags: regulatoryFlags,
    };

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "generate_compliance_report",
      status: "completed",
      details: {
        year,
        total_trades: totalTrades,
        net_pnl: report.pnl_summary.net_gain_loss,
        regulatory_flags_count: regulatoryFlags.length,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        report,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "generate_compliance_report",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

async function detectWashSales(
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
        .gte("exit_date", dateRange.start)
        .lte("exit_date", dateRange.end);
    }

    const { data: trades, error } = await query;

    if (error) throw error;

    const washSales: Array<{ loss_trade: any; repurchase_trades: any[]; total_disallowed_loss: number }> = [];
    const losingTrades = (trades || []).filter((t: any) => t.profit_loss_usd < 0);

    // Check for wash sales (same symbol bought within 30 days)
    for (const losingTrade of losingTrades) {
      const sellDate = new Date(losingTrade.exit_date);
      const thirtyDaysLater = new Date(
        sellDate.getTime() + 30 * 24 * 60 * 60 * 1000
      );

      const repurchases = (trades || []).filter((t: any) => {
        const buyDate = new Date(t.entry_date);
        return (
          t.symbol === losingTrade.symbol &&
          buyDate > sellDate &&
          buyDate <= thirtyDaysLater
        );
      });

      if (repurchases.length > 0) {
        washSales.push({
          loss_trade: losingTrade,
          repurchase_trades: repurchases,
          total_disallowed_loss: losingTrade.profit_loss_usd,
        });
      }
    }

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "detect_wash_sales",
      status: "completed",
      details: {
        wash_sales_detected: washSales.length,
        total_disallowed_loss: washSales.reduce(
          (sum, ws) => sum + ws.total_disallowed_loss,
          0
        ),
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        wash_sales: washSales,
        count: washSales.length,
        total_disallowed_loss: washSales.reduce(
          (sum, ws) => sum + ws.total_disallowed_loss,
          0
        ),
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "detect_wash_sales",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

async function exportToForm8949(
  supabase: any,
  userId: string,
  sessionId: string,
  year: number
) {
  const startTime = Date.now();

  try {
    const startDate = new Date(year, 0, 1).toISOString();
    const endDate = new Date(year, 11, 31).toISOString();

    const { data: trades, error } = await supabase
      .from("trading_journals")
      .select("*")
      .eq("user_id", userId)
      .gte("exit_date", startDate)
      .lte("exit_date", endDate);

    if (error) throw error;

    // Generate Form 8949 format
    const form8949Data = (trades || []).map((trade: any) => ({
      description: `${trade.quantity} shares of ${trade.symbol}`,
      date_acquired: trade.entry_date,
      date_sold: trade.exit_date,
      proceeds: trade.exit_price * trade.quantity,
      cost_basis: trade.entry_price * trade.quantity,
      gain_loss: trade.profit_loss_usd,
    }));

    const csvContent = generateForm8949CSV(form8949Data);

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "export_to_form_8949",
      status: "completed",
      details: {
        year,
        transactions_count: form8949Data.length,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        form_8949_data: form8949Data,
        csv_content: csvContent,
        transaction_count: form8949Data.length,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "export_to_form_8949",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { year },
    });

    throw error;
  }
}

async function checkRegulatoryCompliance(
  supabase: any,
  userId: string,
  sessionId: string
) {
  const startTime = Date.now();

  try {
    const { data: trades, error } = await supabase
      .from("trading_journals")
      .select("*")
      .eq("user_id", userId)
      .order("entry_date", { ascending: false });

    if (error) throw error;

    const compliance = {
      pattern_day_trader: detectPatternDayTrader(trades || []),
      short_sale_violations: detectShortSaleViolations(trades || []),
      insider_trading_risk: detectInsiderTradingRisk(trades || []),
      excessive_margin_use: detectExcessiveMarginUse(trades || []),
      flags: [] as string[],
    };

    if (compliance.pattern_day_trader) {
      compliance.flags.push("Pattern Day Trader detection required");
    }
    if (compliance.short_sale_violations) {
      compliance.flags.push("Potential short sale violations detected");
    }
    if (compliance.insider_trading_risk) {
      compliance.flags.push("Insider trading risk flags present");
    }
    if (compliance.excessive_margin_use) {
      compliance.flags.push("Excessive margin usage detected");
    }

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "check_regulatory_compliance",
      status: "completed",
      details: {
        flags_count: compliance.flags.length,
        pattern_day_trader: compliance.pattern_day_trader,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        compliance,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "check_regulatory_compliance",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

// Helper functions

function generateTaxReportCSV(report: TaxReport): string {
  const lines = [
    ["Tax Report for Year", report.year.toString()],
    [],
    ["Short-Term Gains/Losses", report.short_term_gains.toString()],
    ["Long-Term Gains/Losses", report.long_term_gains.toString()],
    ["Total Gain/Loss", report.total_gains.toString()],
    [],
    [
      "Symbol",
      "Quantity",
      "Cost Basis",
      "Sale Price",
      "Gain/Loss",
      "Holding Period",
    ],
    ...report.tax_lots.map((t) => [
      t.symbol,
      t.quantity.toString(),
      t.cost_basis.toString(),
      t.sale_price.toString(),
      t.gain_loss.toString(),
      t.holding_period,
    ]),
  ];

  return lines.map((row) => row.join(",")).join("\n");
}

function generateForm8949CSV(data: any[]): string {
  const lines = [
    [
      "Description of Property",
      "Date Acquired",
      "Date Sold",
      "Proceeds",
      "Cost Basis",
      "Gain/Loss",
    ],
    ...data.map((d) => [
      d.description,
      d.date_acquired,
      d.date_sold,
      d.proceeds.toString(),
      d.cost_basis.toString(),
      d.gain_loss.toString(),
    ]),
  ];

  return lines.map((row) => row.join(",")).join("\n");
}

function checkRegulatoryFlags(trades: any[], totalTrades: number): string[] {
  const flags: string[] = [];

  if (totalTrades > 100) {
    flags.push("High trading frequency detected");
  }

  const avgTradeSize =
    trades.reduce((sum, t) => sum + Math.abs(t.profit_loss_usd), 0) /
    totalTrades;
  if (avgTradeSize > 10000) {
    flags.push("Large average trade size");
  }

  return flags;
}

function calculateMaxDrawdown(trades: any[]): number {
  if (trades.length === 0) return 0;

  let cumulativePL = 0;
  let peakPL = 0;
  let maxDD = 0;

  for (const trade of trades) {
    cumulativePL += trade.profit_loss_usd;
    if (cumulativePL > peakPL) {
      peakPL = cumulativePL;
    }
    const dd = peakPL - cumulativePL;
    if (dd > maxDD) {
      maxDD = dd;
    }
  }

  return Math.round(maxDD * 100) / 100;
}

function calculateRiskPerTrade(trades: any[]): number {
  if (trades.length === 0) return 0;

  const losses = trades.filter((t) => t.profit_loss_usd < 0);
  if (losses.length === 0) return 0;

  const avgLoss =
    losses.reduce((sum, t) => sum + Math.abs(t.profit_loss_usd), 0) /
    losses.length;
  return Math.round(avgLoss * 100) / 100;
}

function detectPatternDayTrader(trades: any[]): boolean {
  // PDT rule: 4+ day trades in 5 business days
  const last5Days = trades.slice(0, 20); // Approximate
  return last5Days.filter((t) => {
    const entryDate = new Date(t.entry_date);
    const exitDate = new Date(t.exit_date);
    const daysDiff = (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff < 1;
  }).length >= 4;
}

function detectShortSaleViolations(trades: any[]): boolean {
  // Would check for proper locates and delivery
  return false;
}

function detectInsiderTradingRisk(trades: any[]): boolean {
  // Would check for unusual volume around earnings
  return false;
}

function detectExcessiveMarginUse(trades: any[]): boolean {
  // Would analyze leverage ratios
  return false;
}
