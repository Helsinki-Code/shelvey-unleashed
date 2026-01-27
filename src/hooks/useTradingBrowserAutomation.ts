import { useState, useCallback } from "react";
import { useBrowserSession } from "./useBrowserSession";

interface TradingAutomationConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  userId: string;
}

interface ExchangeConfig {
  exchange: "alpaca" | "binance" | "coinbase" | "kraken" | "tradingview";
  account_nickname?: string;
  is_paper_trading?: boolean;
}

interface RebalanceRequest {
  symbol_allocations: Record<string, number>; // {AAPL: 30, BTC: 20, ...}
  require_approval?: boolean;
}

interface UseTradingBrowserAutomationReturn {
  // Session management
  tradingSession: ReturnType<typeof useBrowserSession>;

  // Trading operations
  loginToExchange: (config: ExchangeConfig) => Promise<unknown>;
  logoutFromExchange: (exchange: string) => Promise<unknown>;

  // Market data scraping
  scrapeMarketData: (symbols: string[], exchanges: string[]) => Promise<unknown>;
  scrapeExchangeDashboard: (exchange: string) => Promise<unknown>;

  // Portfolio management
  rebalancePortfolio: (request: RebalanceRequest) => Promise<unknown>;
  getPortfolioSnapshot: () => Promise<unknown>;

  // Trading alerts
  createPriceAlert: (symbol: string, price: number, action: string) => Promise<unknown>;
  executeAlertAction: (alertId: string) => Promise<unknown>;

  // Trading journal
  generateTradingJournal: (startDate: string, endDate: string) => Promise<unknown>;

  // Market research
  researchTradingOpportunity: (symbol: string) => Promise<unknown>;

  // Compliance
  generateTaxReport: (year: number) => Promise<unknown>;

  // State
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for trading-specific browser automation
 */
export function useTradingBrowserAutomation(
  config: TradingAutomationConfig
): UseTradingBrowserAutomationReturn {
  const browserSession = useBrowserSession(config);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginToExchange = useCallback(
    async (exchangeConfig: ExchangeConfig): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session. Create a session first.");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          `login_exchange_${exchangeConfig.exchange}`,
          "trading",
          {
            exchange: exchangeConfig.exchange,
            account_nickname: exchangeConfig.account_nickname,
            is_paper_trading: exchangeConfig.is_paper_trading,
          },
          {
            description: `Login to ${exchangeConfig.exchange}`,
            requires_approval: false,
          }
        );

        // Execute task
        const result = await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Login failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const logoutFromExchange = useCallback(
    async (exchange: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          `logout_exchange_${exchange}`,
          "trading",
          { exchange }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Logout failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const scrapeMarketData = useCallback(
    async (symbols: string[], exchanges: string[]): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "scrape_market_data",
          "trading",
          { symbols, exchanges }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Market data scraping failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const scrapeExchangeDashboard = useCallback(
    async (exchange: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          `scrape_exchange_dashboard_${exchange}`,
          "trading",
          { exchange }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Dashboard scraping failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const rebalancePortfolio = useCallback(
    async (request: RebalanceRequest): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const taskId = await browserSession.requestApproval(
          browserSession.currentSession.id,
          "rebalance-request",
          "execute_trade",
          `Rebalance portfolio: ${JSON.stringify(request.symbol_allocations)}`
        );

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "rebalance_portfolio",
          "trading",
          request,
          {
            requires_approval: true,
            description: "Portfolio rebalancing",
          }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Portfolio rebalancing failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const getPortfolioSnapshot = useCallback(
    async (): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "get_portfolio_snapshot",
          "trading",
          {}
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Portfolio snapshot failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const createPriceAlert = useCallback(
    async (symbol: string, price: number, action: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "create_price_alert",
          "trading",
          { symbol, price, action }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Price alert creation failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const executeAlertAction = useCallback(
    async (alertId: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "execute_alert_action",
          "trading",
          { alert_id: alertId }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Alert execution failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const generateTradingJournal = useCallback(
    async (startDate: string, endDate: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "generate_trading_journal",
          "trading",
          { start_date: startDate, end_date: endDate }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Journal generation failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const researchTradingOpportunity = useCallback(
    async (symbol: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "research_trading_opportunity",
          "trading",
          { symbol }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Opportunity research failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const generateTaxReport = useCallback(
    async (year: number): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "generate_tax_report",
          "trading",
          { year }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Tax report generation failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  return {
    tradingSession: browserSession,
    loginToExchange,
    logoutFromExchange,
    scrapeMarketData,
    scrapeExchangeDashboard,
    rebalancePortfolio,
    getPortfolioSnapshot,
    createPriceAlert,
    executeAlertAction,
    generateTradingJournal,
    researchTradingOpportunity,
    generateTaxReport,
    isLoading,
    error,
  };
}

export type { UseTradingBrowserAutomationReturn };
