import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface RateLimitPolicy {
  domain: string;
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  backoff_strategy: "linear" | "exponential" | "adaptive";
}

interface RateLimitStatus {
  can_proceed: boolean;
  requests_remaining: number;
  throttle_until?: number; // milliseconds from now
  reason?: string;
}

interface ThrottleResponse {
  domain: string;
  throttled: boolean;
  wait_time_ms: number;
  message: string;
}

// Default rate limit policies (can be overridden per user)
const DEFAULT_POLICIES: Record<string, RateLimitPolicy> = {
  "alpaca.markets": {
    domain: "alpaca.markets",
    requests_per_minute: 30,
    requests_per_hour: 600,
    requests_per_day: 10000,
    backoff_strategy: "exponential",
  },
  "tradingview.com": {
    domain: "tradingview.com",
    requests_per_minute: 10,
    requests_per_hour: 200,
    requests_per_day: 2000,
    backoff_strategy: "exponential",
  },
  "binance.com": {
    domain: "binance.com",
    requests_per_minute: 20,
    requests_per_hour: 400,
    requests_per_day: 5000,
    backoff_strategy: "adaptive",
  },
  "wordpress.com": {
    domain: "wordpress.com",
    requests_per_minute: 30,
    requests_per_hour: 600,
    requests_per_day: 10000,
    backoff_strategy: "linear",
  },
  "medium.com": {
    domain: "medium.com",
    requests_per_minute: 20,
    requests_per_hour: 400,
    requests_per_day: 5000,
    backoff_strategy: "exponential",
  },
  "linkedin.com": {
    domain: "linkedin.com",
    requests_per_minute: 15,
    requests_per_hour: 300,
    requests_per_day: 3000,
    backoff_strategy: "exponential",
  },
};

/**
 * Get or create rate limit configuration for user/domain
 */
async function getRateLimitConfig(
  userId: string,
  domain: string
): Promise<RateLimitPolicy & { custom: boolean }> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Try to get custom policy
    const { data, error } = await client
      .from("browser_automation_rate_limits")
      .select("requests_per_minute, requests_per_hour, requests_per_day, backoff_strategy")
      .eq("user_id", userId)
      .eq("domain", domain)
      .single();

    if (!error && data) {
      return {
        domain,
        requests_per_minute: data.requests_per_minute,
        requests_per_hour: data.requests_per_hour,
        requests_per_day: data.requests_per_day,
        backoff_strategy: data.backoff_strategy as "linear" | "exponential" | "adaptive",
        custom: true,
      };
    }

    // Use default policy or create one
    const defaultPolicy = DEFAULT_POLICIES[domain] || {
      domain,
      requests_per_minute: 30,
      requests_per_hour: 600,
      requests_per_day: 10000,
      backoff_strategy: "linear" as const,
    };

    // Ensure record exists
    const { error: insertError } = await client
      .from("browser_automation_rate_limits")
      .insert({
        user_id: userId,
        domain,
        requests_per_minute: defaultPolicy.requests_per_minute,
        requests_per_hour: defaultPolicy.requests_per_hour,
        requests_per_day: defaultPolicy.requests_per_day,
        backoff_strategy: defaultPolicy.backoff_strategy,
        custom_policy: false,
      })
      .select()
      .single();

    if (insertError && insertError.code !== "23505") {
      // 23505 is unique violation - record already exists
      console.error("Failed to create rate limit config:", insertError);
    }

    return { ...defaultPolicy, custom: false };
  } catch (error) {
    console.error("Failed to get rate limit config:", error);
    // Return default
    return {
      domain,
      requests_per_minute: 30,
      requests_per_hour: 600,
      requests_per_day: 10000,
      backoff_strategy: "linear",
      custom: false,
    };
  }
}

/**
 * Check if request is allowed (sliding window implementation)
 */
async function canMakeRequest(
  userId: string,
  domain: string
): Promise<RateLimitStatus> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const policy = await getRateLimitConfig(userId, domain);
    const now = new Date();

    // Get rate limit record
    let { data: rateLimitRecord, error: fetchError } = await client
      .from("browser_automation_rate_limits")
      .select("*")
      .eq("user_id", userId)
      .eq("domain", domain)
      .single();

    if (fetchError) {
      // Create if doesn't exist
      const { data: newRecord, error: insertError } = await client
        .from("browser_automation_rate_limits")
        .insert({
          user_id: userId,
          domain,
          requests_per_minute: policy.requests_per_minute,
          requests_per_hour: policy.requests_per_hour,
          requests_per_day: policy.requests_per_day,
          backoff_strategy: policy.backoff_strategy,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      rateLimitRecord = newRecord;
    }

    // Check if currently throttled
    if (
      rateLimitRecord.is_throttled &&
      rateLimitRecord.throttle_until
    ) {
      const throttleUntil = new Date(rateLimitRecord.throttle_until);
      if (now < throttleUntil) {
        const waitMs = throttleUntil.getTime() - now.getTime();
        return {
          can_proceed: false,
          requests_remaining: 0,
          throttle_until: waitMs,
          reason: `Domain is throttled. Retry after ${Math.ceil(waitMs / 1000)} seconds`,
        };
      } else {
        // Throttle period has passed, reset
        await client
          .from("browser_automation_rate_limits")
          .update({ is_throttled: false, throttle_until: null })
          .eq("user_id", userId)
          .eq("domain", domain);
      }
    }

    // Sliding window check - minute
    const minuteAgo = new Date(now.getTime() - 60000);
    if (
      rateLimitRecord.minute_window_reset &&
      new Date(rateLimitRecord.minute_window_reset) < minuteAgo
    ) {
      // Reset minute window
      await client
        .from("browser_automation_rate_limits")
        .update({
          requests_last_minute: 0,
          minute_window_reset: now.toISOString(),
        })
        .eq("user_id", userId)
        .eq("domain", domain);

      rateLimitRecord.requests_last_minute = 0;
    }

    // Check minute limit
    if (
      rateLimitRecord.requests_last_minute >=
      policy.requests_per_minute
    ) {
      return {
        can_proceed: false,
        requests_remaining: 0,
        reason: `Minute rate limit exceeded (${rateLimitRecord.requests_last_minute}/${policy.requests_per_minute})`,
      };
    }

    // Sliding window check - hour
    const hourAgo = new Date(now.getTime() - 3600000);
    if (
      rateLimitRecord.hour_window_reset &&
      new Date(rateLimitRecord.hour_window_reset) < hourAgo
    ) {
      // Reset hour window
      await client
        .from("browser_automation_rate_limits")
        .update({
          requests_last_hour: 0,
          hour_window_reset: now.toISOString(),
        })
        .eq("user_id", userId)
        .eq("domain", domain);

      rateLimitRecord.requests_last_hour = 0;
    }

    // Check hour limit
    if (
      rateLimitRecord.requests_last_hour >=
      policy.requests_per_hour
    ) {
      return {
        can_proceed: false,
        requests_remaining: 0,
        reason: `Hour rate limit exceeded (${rateLimitRecord.requests_last_hour}/${policy.requests_per_hour})`,
      };
    }

    // Sliding window check - day
    const dayAgo = new Date(now.getTime() - 86400000);
    if (
      rateLimitRecord.day_window_reset &&
      new Date(rateLimitRecord.day_window_reset) < dayAgo
    ) {
      // Reset day window
      await client
        .from("browser_automation_rate_limits")
        .update({
          requests_last_day: 0,
          day_window_reset: now.toISOString(),
        })
        .eq("user_id", userId)
        .eq("domain", domain);

      rateLimitRecord.requests_last_day = 0;
    }

    // Check day limit
    if (
      rateLimitRecord.requests_last_day >=
      policy.requests_per_day
    ) {
      return {
        can_proceed: false,
        requests_remaining: 0,
        reason: `Day rate limit exceeded (${rateLimitRecord.requests_last_day}/${policy.requests_per_day})`,
      };
    }

    // All checks passed
    return {
      can_proceed: true,
      requests_remaining:
        policy.requests_per_minute - rateLimitRecord.requests_last_minute,
    };
  } catch (error) {
    console.error("Failed to check rate limit:", error);
    // On error, allow request but log it
    return {
      can_proceed: true,
      requests_remaining: 999,
      reason: "Error checking rate limit (allowed by default)",
    };
  }
}

/**
 * Record a request for rate limit tracking
 */
async function recordRequest(userId: string, domain: string): Promise<void> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date();

    const { error } = await client
      .from("browser_automation_rate_limits")
      .update({
        requests_last_minute: client.from("browser_automation_rate_limits").update({
          requests_last_minute: "requests_last_minute + 1",
          requests_last_hour: "requests_last_hour + 1",
          requests_last_day: "requests_last_day + 1",
          total_requests: "total_requests + 1",
          last_request_at: now.toISOString(),
          updated_at: now.toISOString(),
        }),
      })
      .eq("user_id", userId)
      .eq("domain", domain);

    if (error) {
      console.error("Failed to record request:", error);
    }
  } catch (error) {
    console.error("Error recording request:", error);
  }
}

/**
 * Calculate throttle time based on strategy
 */function calculateThrottleTime(
  consecutiveFailures: number,
  strategy: "linear" | "exponential" | "adaptive"
): number {
  const baseDelay = 1000; // 1 second

  switch (strategy) {
    case "linear":
      return baseDelay * consecutiveFailures;

    case "exponential":
      return baseDelay * Math.pow(2, Math.min(consecutiveFailures, 6)); // Cap at 64s

    case "adaptive":
      // Adaptive: increase slowly at first, then exponential
      if (consecutiveFailures <= 2) {
        return baseDelay * consecutiveFailures;
      } else {
        return baseDelay * Math.pow(2, consecutiveFailures - 2);
      }

    default:
      return baseDelay;
  }
}

/**
 * Apply throttle to domain
 */
async function applyThrottle(
  userId: string,
  domain: string,
  durationMs: number
): Promise<ThrottleResponse> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const throttleUntil = new Date(Date.now() + durationMs);

    const { error } = await client
      .from("browser_automation_rate_limits")
      .update({
        is_throttled: true,
        throttle_until: throttleUntil.toISOString(),
        throttle_reason: "429 Too Many Requests - automatic throttle applied",
      })
      .eq("user_id", userId)
      .eq("domain", domain);

    if (error) throw error;

    return {
      domain,
      throttled: true,
      wait_time_ms: durationMs,
      message: `Domain throttled for ${Math.ceil(durationMs / 1000)} seconds`,
    };
  } catch (error) {
    throw new Error(
      `Failed to apply throttle: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get throttle status
 */
async function getThrottleStatus(
  userId: string,
  domain: string
): Promise<{ throttled: boolean; wait_time_ms: number; reason?: string }> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error } = await client
      .from("browser_automation_rate_limits")
      .select("is_throttled, throttle_until, throttle_reason")
      .eq("user_id", userId)
      .eq("domain", domain)
      .single();

    if (error) {
      return { throttled: false, wait_time_ms: 0 };
    }

    if (!data.is_throttled) {
      return { throttled: false, wait_time_ms: 0 };
    }

    const now = new Date();
    const throttleUntil = new Date(data.throttle_until);

    if (now >= throttleUntil) {
      // Throttle has expired
      await client
        .from("browser_automation_rate_limits")
        .update({ is_throttled: false, throttle_until: null })
        .eq("user_id", userId)
        .eq("domain", domain);

      return { throttled: false, wait_time_ms: 0 };
    }

    const waitMs = throttleUntil.getTime() - now.getTime();
    return {
      throttled: true,
      wait_time_ms: waitMs,
      reason: data.throttle_reason,
    };
  } catch (error) {
    console.error("Failed to get throttle status:", error);
    return { throttled: false, wait_time_ms: 0 };
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
      case "can_make_request":
        response = await canMakeRequest(data.user_id, data.domain);
        break;

      case "record_request":
        await recordRequest(data.user_id, data.domain);
        response = { message: "Request recorded" };
        break;

      case "apply_throttle":
        response = await applyThrottle(
          data.user_id,
          data.domain,
          data.duration_ms
        );
        break;

      case "get_throttle_status":
        response = await getThrottleStatus(data.user_id, data.domain);
        break;

      case "get_rate_limit_config":
        response = await getRateLimitConfig(data.user_id, data.domain);
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
