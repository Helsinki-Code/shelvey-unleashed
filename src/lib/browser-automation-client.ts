/**
 * Browser Automation Client SDK
 * Main interface for interacting with browser automation services
 */

import { createClient } from "@supabase/supabase-js";

interface BrowserSession {
  id: string;
  user_id: string;
  session_type:
    | "trading"
    | "blog"
    | "seo"
    | "social"
    | "form"
    | "visual"
    | "general";
  session_name?: string;
  provider: "agent-browser" | "playwright" | "brightdata" | "fallback";
  status: "pending" | "initializing" | "running" | "paused" | "completed" | "failed";
  cost_usd: number;
  api_calls: number;
  screenshot_urls: string[];
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

interface BrowserTask {
  id: string;
  session_id: string;
  task_name: string;
  task_category: string;
  status: string;
  result?: Record<string, unknown>;
  error?: string;
  requires_approval: boolean;
}

interface BrowserAutomationClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export class BrowserAutomationClient {
  private supabase: ReturnType<typeof createClient>;
  private userId: string | null = null;

  constructor(config: BrowserAutomationClientConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
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
      const { data, error } = await this.supabase
        .from("browser_automation_sessions")
        .insert({
          user_id: this.userId,
          session_type: sessionType,
          session_name: options?.name,
          description: options?.description,
          provider: "playwright", // Will be optimized based on tasks
          status: "initializing",
          metadata: options?.metadata || {},
          tags: options?.tags || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { data, error } = await this.supabase
        .from("browser_automation_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", this.userId)
        .single();

      if (error) return null;
      return data;
    } catch (error) {
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
      const { data, error } = await this.supabase
        .from("browser_automation_sessions")
        .select("*")
        .eq("user_id", this.userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
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
      await this.supabase
        .from("browser_automation_tasks")
        .update({ status: "skipped" })
        .eq("session_id", sessionId)
        .eq("status", "pending");

      // Close session
      const { data, error } = await this.supabase
        .from("browser_automation_sessions")
        .update({
          status: "completed",
          end_time: endTime,
          completed_at: endTime,
          updated_at: endTime,
        })
        .eq("id", sessionId)
        .eq("user_id", this.userId)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { data, error } = await this.supabase
        .from("browser_automation_tasks")
        .insert({
          session_id: sessionId,
          user_id: this.userId,
          task_name: taskName,
          task_category: taskCategory,
          task_description: options?.description,
          parameters,
          requires_approval: options?.requires_approval || false,
          priority: options?.priority || 5,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { data, error } = await this.supabase
        .from("browser_automation_tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (error) return null;
      return data;
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

      // Determine which executor to use based on task complexity
      const executorFunction = this.selectExecutor(task.task_category);

      // Call the executor
      const response = await fetch(
        `${window.location.origin}/functions/v1/${executorFunction}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await this.getAuthToken()}`,
          },
          body: JSON.stringify({
            task_id: taskId,
            session_id: sessionId,
            user_id: this.userId,
            task_name: task.task_name,
            parameters: task.parameters || {},
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Execution failed with status ${response.status}`);
      }

      return await response.json();
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

      return {
        total_cost_usd: session.cost_usd,
        api_calls: session.api_calls,
        cost_per_call:
          session.api_calls > 0
            ? session.cost_usd / session.api_calls
            : 0,
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
      const { data, error } = await this.supabase
        .from("browser_automation_audit")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(
        `Failed to get audit trail: ${error instanceof Error ? error.message : "Unknown error"}`
      );
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
      const { data, error } = await this.supabase
        .from("browser_automation_approvals")
        .insert({
          session_id: sessionId,
          task_id: taskId,
          requester_id: this.userId,
          approval_type: approvalType,
          action_description: description,
          status: "pending",
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
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

  /**
   * Get current auth token
   */
  private async getAuthToken(): Promise<string> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    if (!session) throw new Error("No active session");
    return session.access_token;
  }
}

/**
 * Create a browser automation client instance
 */
export function createBrowserAutomationClient(
  supabaseUrl: string,
  supabaseAnonKey: string
): BrowserAutomationClient {
  return new BrowserAutomationClient({ supabaseUrl, supabaseAnonKey });
}
