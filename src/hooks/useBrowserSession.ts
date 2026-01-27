import { useState, useCallback, useEffect } from "react";
import { createBrowserAutomationClient } from "@/lib/browser-automation-client";
import type { BrowserSession } from "@/lib/browser-automation-client";

interface UseBrowserSessionConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  userId: string;
}

interface UseBrowserSessionReturn {
  // Session state
  currentSession: BrowserSession | null;
  sessions: BrowserSession[];
  isLoading: boolean;
  error: string | null;

  // Session operations
  createSession: (
    type: string,
    options?: { name?: string; description?: string; metadata?: Record<string, unknown> }
  ) => Promise<BrowserSession>;

  closeSession: (sessionId: string) => Promise<BrowserSession>;
  listSessions: (limit?: number) => Promise<BrowserSession[]>;

  // Task operations
  addTask: (
    sessionId: string,
    taskName: string,
    category: string,
    parameters: Record<string, unknown>,
    options?: { requires_approval?: boolean; description?: string }
  ) => Promise<unknown>;

  executeTask: (taskId: string, sessionId: string) => Promise<unknown>;

  // Cost tracking
  getSessionCost: (
    sessionId: string
  ) => Promise<{ total_cost_usd: number; api_calls: number; cost_per_call: number } | null>;

  // Audit trail
  getAuditTrail: (sessionId: string, limit?: number) => Promise<unknown[]>;

  // Request approval
  requestApproval: (
    sessionId: string,
    taskId: string,
    type: string,
    description: string
  ) => Promise<string>;

  // Utilities
  refreshSessions: () => Promise<void>;
  setError: (error: string | null) => void;
}

/**
 * Hook for managing browser automation sessions
 */
export function useBrowserSession(config: UseBrowserSessionConfig): UseBrowserSessionReturn {
  const [currentSession, setCurrentSession] = useState<BrowserSession | null>(null);
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize client
  const client = createBrowserAutomationClient(config.supabaseUrl, config.supabaseAnonKey);

  useEffect(() => {
    client.setUserId(config.userId);
  }, [config.userId, client]);

  const handleError = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : "Unknown error";
    setError(message);
    console.error("Browser session error:", message);
  }, []);

  const createSession = useCallback(
    async (
      type: string,
      options?: { name?: string; description?: string; metadata?: Record<string, unknown> }
    ): Promise<BrowserSession> => {
      try {
        setIsLoading(true);
        setError(null);

        const session = await client.createSession(type, options);
        setCurrentSession(session);

        // Refresh session list
        await refreshSessions();

        return session;
      } catch (err) {
        handleError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client, handleError]
  );

  const closeSession = useCallback(
    async (sessionId: string): Promise<BrowserSession> => {
      try {
        setIsLoading(true);
        setError(null);

        const session = await client.closeSession(sessionId);

        if (currentSession?.id === sessionId) {
          setCurrentSession(null);
        }

        // Refresh session list
        await refreshSessions();

        return session;
      } catch (err) {
        handleError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client, currentSession, handleError]
  );

  const listSessions = useCallback(
    async (limit = 20): Promise<BrowserSession[]> => {
      try {
        setIsLoading(true);
        setError(null);

        const fetchedSessions = await client.listSessions(limit);
        setSessions(fetchedSessions);

        return fetchedSessions;
      } catch (err) {
        handleError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client, handleError]
  );

  const refreshSessions = useCallback(async () => {
    try {
      await listSessions();
    } catch (err) {
      console.error("Failed to refresh sessions:", err);
    }
  }, [listSessions]);

  const addTask = useCallback(
    async (
      sessionId: string,
      taskName: string,
      category: string,
      parameters: Record<string, unknown>,
      options?: { requires_approval?: boolean; description?: string }
    ): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        const task = await client.addTask(
          sessionId,
          taskName,
          category,
          parameters,
          options
        );

        return task;
      } catch (err) {
        handleError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client, handleError]
  );

  const executeTask = useCallback(
    async (taskId: string, sessionId: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await client.executeTask(taskId, sessionId);
        return result;
      } catch (err) {
        handleError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client, handleError]
  );

  const getSessionCost = useCallback(
    async (sessionId: string) => {
      try {
        setError(null);
        return await client.getSessionCost(sessionId);
      } catch (err) {
        handleError(err);
        throw err;
      }
    },
    [client, handleError]
  );

  const getAuditTrail = useCallback(
    async (sessionId: string, limit = 100): Promise<unknown[]> => {
      try {
        setError(null);
        return await client.getAuditTrail(sessionId, limit);
      } catch (err) {
        handleError(err);
        throw err;
      }
    },
    [client, handleError]
  );

  const requestApproval = useCallback(
    async (
      sessionId: string,
      taskId: string,
      type: string,
      description: string
    ): Promise<string> => {
      try {
        setError(null);
        return await client.requestApproval(sessionId, taskId, type, description);
      } catch (err) {
        handleError(err);
        throw err;
      }
    },
    [client, handleError]
  );

  return {
    currentSession,
    sessions,
    isLoading,
    error,
    createSession,
    closeSession,
    listSessions,
    addTask,
    executeTask,
    getSessionCost,
    getAuditTrail,
    requestApproval,
    refreshSessions,
    setError,
  };
}

export type { UseBrowserSessionReturn };
