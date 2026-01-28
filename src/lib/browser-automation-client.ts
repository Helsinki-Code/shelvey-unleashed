/**
 * Browser Automation Client SDK
 * Main interface for interacting with browser automation services
 */

import { supabase } from "@/integrations/supabase/client";

export interface BrowserSession {
  id: string;
  user_id: string;
  domain: string;
  provider: string;
  status: string;
  started_at?: string | null;
  ended_at?: string | null;
  last_activity?: string | null;
  total_cost_usd?: number | null;
  total_duration_ms?: number | null;
  api_calls_count?: number | null;
  tasks_completed?: number | null;
  error_count?: number | null;
  last_error?: string | null;
  memory_mb?: number | null;
  tabs_open?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BrowserTask {
  id: string;
  session_id: string;
  action: string;
  provider: string;
  status: string;
  user_id: string;
  parameters?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  error_message?: string | null;
  requires_approval?: boolean | null;
  domain?: string | null;
  cost_usd?: number | null;
  duration_ms?: number | null;
  priority?: number | null;
  retry_count?: number | null;
  max_retries?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface BrowserAutomationClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export class BrowserAutomationClient {
  private userId: string | null = null;

  constructor(_config?: BrowserAutomationClientConfig) {
    // Config is no longer needed since we use the shared supabase client
  }

  /**
   * Set the current user ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Create a new browser automation session
   */
  async createSession(
    sessionType: string,
    options?: {
      name?: string;
      description?: string;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): Promise<BrowserSession> {
    if (!this.userId) {
      throw new Error("User ID not set. Call setUserId() first.");
    }

    try {
      const { data, error } = await supabase
        .from("browser_automation_sessions")
        .insert({
          user_id: this.userId,
          domain: options?.name || sessionType,
          provider: "playwright",
          status: "initializing",
        })
        .select()
        .single();

      if (error) throw error;
      return data as BrowserSession;
    } catch (error) {
      throw new Error(
        `Failed to create session: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<BrowserSession | null> {
    if (!this.userId) {
      throw new Error("User ID not set. Call setUserId() first.");
    }

    try {
      const { data, error } = await supabase
        .from("browser_automation_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", this.userId)
        .single();

      if (error) return null;
      return data as BrowserSession;
    } catch {
      return null;
    }
  }

  /**
   * List all sessions for the current user
   */
  async listSessions(
    limit: number = 20,
    offset: number = 0
  ): Promise<BrowserSession[]> {
    if (!this.userId) {
      throw new Error("User ID not set. Call setUserId() first.");
    }

    try {
      const { data, error } = await supabase
        .from("browser_automation_sessions")
        .select("*")
        .eq("user_id", this.userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return (data || []) as BrowserSession[];
    } catch (error) {
      throw new Error(
        `Failed to list sessions: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Close a session
   */
  async closeSession(sessionId: string): Promise<BrowserSession> {
    if (!this.userId) {
      throw new Error("User ID not set. Call setUserId() first.");
    }

    try {
      const endTime = new Date().toISOString();

      // Mark pending tasks as skipped
      await supabase
        .from("browser_automation_tasks")
        .update({ status: "skipped" } as never)
        .eq("session_id", sessionId)
        .eq("status", "pending");

      // Close session
      const { data, error } = await supabase
        .from("browser_automation_sessions")
        .update({
          status: "completed",
          ended_at: endTime,
        } as never)
        .eq("id", sessionId)
        .eq("user_id", this.userId)
        .select()
        .single();

      if (error) throw error;
      return data as BrowserSession;
    } catch (error) {
      throw new Error(
        `Failed to close session: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Add a task to a session
   */
  async addTask(
    sessionId: string,
    taskName: string,
    taskCategory: string,
    parameters: Record<string, unknown>,
    options?: {
      requires_approval?: boolean;
      description?: string;
      priority?: number;
    }
  ): Promise<BrowserTask> {
    if (!this.userId) {
      throw new Error("User ID not set. Call setUserId() first.");
    }

    try {
      const { data, error } = await supabase
        .from("browser_automation_tasks")
        .insert({
          session_id: sessionId,
          user_id: this.userId,
          action: `${taskCategory}:${taskName}`,
          provider: "playwright",
          parameters: parameters as never,
          requires_approval: options?.requires_approval || false,
          priority: options?.priority || 5,
          status: "pending",
        } as never)
        .select()
        .single();

      if (error) throw error;
      return data as BrowserTask;
    } catch (error) {
      throw new Error(
        `Failed to add task: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<BrowserTask | null> {
    try {
      const { data, error } = await supabase
        .from("browser_automation_tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (error) return null;
      return data as BrowserTask;
    } catch {
      return null;
    }
  }

  /**
   * Execute a task (via the appropriate executor)
   */
  async executeTask(taskId: string, sessionId: string): Promise<unknown> {
    if (!this.userId) {
      throw new Error("User ID not set. Call setUserId() first.");
    }

    try {
      // Get task details
      const task = await this.getTask(taskId);
      if (!task) throw new Error("Task not found");

      // Determine which executor to use based on action
      const actionParts = task.action.split(":");
      const taskCategory = actionParts[0] || "general";
      const executorFunction = this.selectExecutor(taskCategory);

      // Call the executor
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await supabase.functions.invoke(executorFunction, {
        body: {
          task_id: taskId,
          session_id: sessionId,
          user_id: this.userId,
          action: task.action,
          parameters: task.parameters || {},
        },
      });

      if (response.error) {
        throw new Error(`Execution failed: ${response.error.message}`);
      }

      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to execute task: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get session cost tracking
   */
  async getSessionCost(sessionId: string): Promise<{
    total_cost_usd: number;
    api_calls: number;
    cost_per_call: number;
  } | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return null;

      const totalCost = session.total_cost_usd || 0;
      const apiCalls = session.api_calls_count || 0;

      return {
        total_cost_usd: totalCost,
        api_calls: apiCalls,
        cost_per_call: apiCalls > 0 ? totalCost / apiCalls : 0,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get session audit trail
   */
  async getAuditTrail(sessionId: string, limit: number = 100): Promise<unknown[]> {
    try {
      const { data, error } = await supabase
        .from("browser_automation_audit")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  }

  /**
   * Request approval for a high-risk action
   */
  async requestApproval(
    sessionId: string,
    taskId: string,
    approvalType: string,
    description: string
  ): Promise<string> {
    if (!this.userId) {
      throw new Error("User ID not set. Call setUserId() first.");
    }

    try {
      const { data, error } = await supabase
        .from("browser_automation_approvals")
        .insert({
          task_id: taskId,
          user_id: this.userId,
          action: approvalType,
          details: { description, session_id: sessionId },
          status: "pending",
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        } as never)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Failed to create approval request");
      return (data as { id: string }).id;
    } catch (error) {
      throw new Error(
        `Failed to request approval: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Select the appropriate executor based on task category
   */
  private selectExecutor(taskCategory: string): string {
    switch (taskCategory) {
      case "trading":
        return "trading-browser-agent";
      case "blog":
        return "blog-publishing-executor";
      case "seo":
        return "seo-intelligence-agent";
      case "social":
        return "social-distribution-executor";
      case "form":
        return "form-intelligence-executor";
      case "visual":
        return "visual-analysis-executor";
      default:
        return "playwright-mcp-executor";
    }
  }
}

/**
 * Create a browser automation client instance
 */
export function createBrowserAutomationClient(
  supabaseUrl?: string,
  supabaseAnonKey?: string
): BrowserAutomationClient {
  return new BrowserAutomationClient({ supabaseUrl: supabaseUrl || "", supabaseAnonKey: supabaseAnonKey || "" });
}
