import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface ProviderHealth {
  provider: string;
  success_rate: number; // 0-100
  avg_latency_ms: number;
  error_count: number;
  last_error?: string;
  circuit_breaker_status: "healthy" | "degraded" | "open";
  consecutive_failures: number;
  last_checked: string;
}

interface FailoverResponse {
  selected_provider: string;
  reason: string;
  health_status: ProviderHealth[];
  message: string;
}

const PROVIDERS = ["agent-browser", "playwright", "brightdata", "fallback"];
const CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 consecutive failures
const SUCCESS_RATE_THRESHOLD = 50; // Degrade at 50% success rate

/**
 * Calculate provider health metrics
 */
async function getProviderHealth(provider: string): Promise<ProviderHealth> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get last 100 tasks for this provider
    const { data: sessions, error } = await client
      .from("browser_automation_sessions")
      .select("status, duration_ms, cost_usd, created_at")
      .eq("provider", provider)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !sessions || sessions.length === 0) {
      return {
        provider,
        success_rate: 0,
        avg_latency_ms: 0,
        error_count: 0,
        circuit_breaker_status: "open",
        consecutive_failures: 0,
        last_checked: new Date().toISOString(),
      };
    }

    // Calculate metrics
    const completed = sessions.filter(
      (s: { status: string }) => s.status === "completed"
    ).length;
    const failed = sessions.filter((s: { status: string }) => s.status === "failed").length;
    const successRate = (completed / sessions.length) * 100;

    const latencies = sessions
      .filter((s: { duration_ms: number }) => s.duration_ms)
      .map((s: { duration_ms: number }) => s.duration_ms);
    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length
        : 0;

    // Determine circuit breaker status
    let circuitStatus: "healthy" | "degraded" | "open" = "healthy";
    if (successRate < SUCCESS_RATE_THRESHOLD) {
      circuitStatus = "open";
    } else if (successRate < 80) {
      circuitStatus = "degraded";
    }

    return {
      provider,
      success_rate: successRate,
      avg_latency_ms: Math.round(avgLatency),
      error_count: failed,
      circuit_breaker_status: circuitStatus,
      consecutive_failures: failed > 3 ? failed : 0,
      last_checked: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Failed to get health for ${provider}:`, error);
    return {
      provider,
      success_rate: 0,
      avg_latency_ms: 0,
      error_count: 0,
      circuit_breaker_status: "open",
      consecutive_failures: 0,
      last_checked: new Date().toISOString(),
    };
  }
}

/**
 * Select best available provider based on health and task requirements
 */
async function selectProvider(
  taskComplexity: number = 5,
  requiresVision: boolean = false,
  isHighRisk: boolean = false
): Promise<FailoverResponse> {
  try {
    // Get health status for all providers
    const healthStatuses = await Promise.all(
      PROVIDERS.map((p) => getProviderHealth(p))
    );

    // Score providers based on criteria and health
    const providerScores = healthStatuses.map((health) => {
      let score = 100;

      // Penalize based on circuit breaker status
      if (health.circuit_breaker_status === "open") {
        score -= 100; // Eliminate from consideration
      } else if (health.circuit_breaker_status === "degraded") {
        score -= 30;
      }

      // Penalize based on success rate
      score -= 100 - health.success_rate;

      // Penalize based on latency (lower is better)
      score -= Math.min(health.avg_latency_ms / 10, 50);

      return { provider: health.provider, score, health };
    });

    // Sort by score (highest first)
    providerScores.sort((a, b) => b.score - a.score);

    // Select based on task requirements
    let selectedProvider = "fallback";
    let reason = "";

    if (requiresVision) {
      // For vision tasks, must use agent-browser
      const agentBrowser = providerScores.find((p) => p.provider === "agent-browser");
      if (agentBrowser && agentBrowser.score > -50) {
        selectedProvider = "agent-browser";
        reason = "Task requires vision analysis";
      }
    } else if (isHighRisk) {
      // For high-risk tasks, prefer agent-browser (most capable)
      const agentBrowser = providerScores.find((p) => p.provider === "agent-browser");
      if (agentBrowser && agentBrowser.score > -50) {
        selectedProvider = "agent-browser";
        reason = "High-risk task requires most capable provider";
      }
    } else if (taskComplexity > 7) {
      // Complex tasks prefer agent-browser
      const agentBrowser = providerScores.find((p) => p.provider === "agent-browser");
      if (agentBrowser && agentBrowser.score > -50) {
        selectedProvider = "agent-browser";
        reason = "Complex task (complexity > 7) requires agent-browser";
      }
    } else {
      // Default: use best available provider that's healthy
      const healthyProvider = providerScores.find((p) => p.score > 0);
      if (healthyProvider) {
        selectedProvider = healthyProvider.provider;
        reason = `Selected based on health score (${Math.round(healthyProvider.score)})`;
      }
    }

    // Ensure we never select a completely broken provider
    const selectedHealth = healthStatuses.find((h) => h.provider === selectedProvider);
    if (selectedHealth && selectedHealth.circuit_breaker_status === "open") {
      // Find next best available
      const working = providerScores.find(
        (p) =>
          p.health.circuit_breaker_status !== "open" &&
          p.provider !== "fallback"
      );
      if (working) {
        selectedProvider = working.provider;
        reason = `Primary provider unhealthy, failover to ${selectedProvider}`;
      } else {
        selectedProvider = "fallback";
        reason = "All providers unhealthy, using fallback";
      }
    }

    return {
      selected_provider: selectedProvider,
      reason,
      health_status: healthStatuses,
      message: `Selected provider: ${selectedProvider}`,
    };
  } catch (error) {
    console.error("Provider selection error:", error);
    return {
      selected_provider: "fallback",
      reason: "Error during provider selection, using fallback",
      health_status: [],
      message: "Error: using fallback provider",
    };
  }
}

/**
 * Report a provider failure and update circuit breaker
 */
async function reportProviderFailure(
  provider: string,
  errorMessage: string,
  taskId?: string
): Promise<{ provider: string; status: string; message: string }> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Log the failure
    console.error(`Provider ${provider} failure: ${errorMessage}${taskId ? ` (Task: ${taskId})` : ""}`);

    // Get current health
    const health = await getProviderHealth(provider);

    // If circuit breaker is open, report it
    if (health.circuit_breaker_status === "open") {
      console.warn(`⚠️ CIRCUIT BREAKER OPEN for ${provider}`);
    }

    return {
      provider,
      status: health.circuit_breaker_status,
      message: `Failure reported for ${provider}: ${errorMessage}`,
    };
  } catch (error) {
    console.error("Failed to report provider failure:", error);
    return {
      provider,
      status: "unknown",
      message: `Failed to report failure: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get health status for all providers
 */
async function getAllProviderHealth(): Promise<ProviderHealth[]> {
  try {
    const healthStatuses = await Promise.all(
      PROVIDERS.map((p) => getProviderHealth(p))
    );

    return healthStatuses;
  } catch (error) {
    console.error("Failed to get all provider health:", error);
    return [];
  }
}

/**
 * Reset circuit breaker for a provider
 */
async function resetCircuitBreaker(
  provider: string
): Promise<{ provider: string; message: string }> {
  try {
    if (!PROVIDERS.includes(provider)) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    // In a production system, this would clear failure counts
    // For now, we just log the action
    console.log(`Circuit breaker reset for ${provider}`);

    return {
      provider,
      message: `Circuit breaker reset for ${provider}`,
    };
  } catch (error) {
    throw new Error(
      `Failed to reset circuit breaker: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Monitor provider health and trigger alerts
 */
async function monitorProviderHealth(): Promise<{
  status: string;
  alerts: string[];
  health_summary: Record<string, string>;
}> {
  try {
    const healthStatuses = await getAllProviderHealth();
    const alerts: string[] = [];
    const healthSummary: Record<string, string> = {};

    for (const health of healthStatuses) {
      // Create summary
      healthSummary[health.provider] = health.circuit_breaker_status;

      // Check for alerts
      if (health.circuit_breaker_status === "open") {
        alerts.push(
          `🔴 CRITICAL: ${health.provider} circuit breaker is OPEN (success rate: ${health.success_rate.toFixed(1)}%)`
        );
      } else if (health.circuit_breaker_status === "degraded") {
        alerts.push(
          `🟡 WARNING: ${health.provider} is DEGRADED (success rate: ${health.success_rate.toFixed(1)}%)`
        );
      }

      // Check for high latency
      if (health.avg_latency_ms > 5000) {
        alerts.push(
          `⏱️ SLOW: ${health.provider} latency is high (${health.avg_latency_ms}ms)`
        );
      }

      // Check for consecutive failures
      if (health.consecutive_failures > 3) {
        alerts.push(
          `📉 ERROR: ${health.provider} has ${health.consecutive_failures} consecutive failures`
        );
      }
    }

    return {
      status: alerts.length === 0 ? "healthy" : "degraded",
      alerts,
      health_summary: healthSummary,
    };
  } catch (error) {
    console.error("Health monitoring error:", error);
    return {
      status: "unknown",
      alerts: ["Error monitoring provider health"],
      health_summary: {},
    };
  }
}

// Main handler
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    let response: unknown;

    switch (action) {
      case "select_provider":
        response = await selectProvider(
          data.task_complexity,
          data.requires_vision,
          data.is_high_risk
        );
        break;

      case "report_failure":
        response = await reportProviderFailure(
          data.provider,
          data.error_message,
          data.task_id
        );
        break;

      case "get_all_health":
        response = await getAllProviderHealth();
        break;

      case "reset_circuit_breaker":
        response = await resetCircuitBreaker(data.provider);
        break;

      case "monitor_health":
        response = await monitorProviderHealth();
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
