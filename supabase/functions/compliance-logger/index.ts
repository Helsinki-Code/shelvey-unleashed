import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface ComplianceCheck {
  pii_detected: boolean;
  pii_fields: string[];
  tos_violation_risk: boolean;
  tos_violation_reason?: string;
  rate_limit_warning: boolean;
  anti_bot_detected: boolean;
  confidence_scores: Record<string, number>;
}

interface LogResponse {
  audit_id: string;
  compliance_flags: string[];
  message: string;
}

// PII patterns - used to detect sensitive data in logs
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  credit_card: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  api_key: /[a-zA-Z0-9_-]{32,}/g,
  password: /(password|passwd|pwd)\s*[:=]\s*['"]?([^'"\s]+)['"]?/gi,
};

// TOS restrictions by domain
const TOS_RESTRICTIONS: Record<string, {
  allowed_actions: string[];
  restricted_actions: string[];
  rate_limit_per_minute: number;
}> = {
  "wordpress.com": {
    allowed_actions: [
      "navigate",
      "read_content",
      "create_post",
      "edit_post",
      "publish_post",
    ],
    restricted_actions: ["modify_user_permissions", "delete_site", "inject_js"],
    rate_limit_per_minute: 30,
  },
  "tradingview.com": {
    allowed_actions: ["navigate", "read_content", "screenshot"],
    restricted_actions: ["place_order", "modify_settings", "scrape_data"],
    rate_limit_per_minute: 10,
  },
  "medium.com": {
    allowed_actions: ["navigate", "read_content", "publish_article"],
    restricted_actions: ["scrape_articles", "modify_other_users", "inject_js"],
    rate_limit_per_minute: 20,
  },
  "linkedin.com": {
    allowed_actions: ["navigate", "read_content", "post_content"],
    restricted_actions: ["scrape_data", "automate_messages", "modify_profiles"],
    rate_limit_per_minute: 15,
  },
};

/**
 * Detect PII in text/data
 */
function detectPII(
  data: string | Record<string, unknown>
): { pii_found: boolean; fields: string[] } {
  const text =
    typeof data === "string" ? data : JSON.stringify(data).substring(0, 1000);
  const found: string[] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    if (pattern.test(text)) {
      found.push(type);
    }
  }

  return {
    pii_found: found.length > 0,
    fields: found,
  };
}

/**
 * Check if action violates TOS
 */
function checkTOSViolation(
  domain: string,
  actionType: string
): { is_violation: boolean; reason: string; risk_score: number } {
  const restrictions = TOS_RESTRICTIONS[domain];

  if (!restrictions) {
    // Unknown domain - cautiously assume it might be restricted
    return {
      is_violation: false,
      reason: "Unknown domain - manual review recommended",
      risk_score: 30,
    };
  }

  // Check if action is restricted
  if (restrictions.restricted_actions.includes(actionType)) {
    return {
      is_violation: true,
      reason: `Action '${actionType}' is restricted on ${domain}`,
      risk_score: 100,
    };
  }

  // Check if action is allowed (if list is restrictive)
  if (
    restrictions.allowed_actions.length > 0 &&
    !restrictions.allowed_actions.includes(actionType)
  ) {
    return {
      is_violation: true,
      reason: `Action '${actionType}' not in allowed list for ${domain}`,
      risk_score: 80,
    };
  }

  return {
    is_violation: false,
    reason: "Action allowed by TOS",
    risk_score: 0,
  };
}

/**
 * Detect anti-bot signatures in response
 */
function detectAntiBotSignatures(
  responseData: Record<string, unknown>
): { detected: boolean; reason: string } {
  const dataStr = JSON.stringify(responseData).toLowerCase();

  const signatures = [
    "cloudflare",
    "challenge",
    "robot",
    "captcha",
    "recaptcha",
    "403 forbidden",
    "429 too many requests",
    "blocked",
    "verify",
  ];

  for (const sig of signatures) {
    if (dataStr.includes(sig)) {
      return {
        detected: true,
        reason: `Anti-bot signature detected: ${sig}`,
      };
    }
  }

  return { detected: false, reason: "" };
}

/**
 * Perform comprehensive compliance check
 */function performComplianceCheck(
  domain: string,
  actionType: string,
  actionData?: Record<string, unknown>,
  responseData?: Record<string, unknown>
): ComplianceCheck {
  const complianceCheck: ComplianceCheck = {
    pii_detected: false,
    pii_fields: [],
    tos_violation_risk: false,
    rate_limit_warning: false,
    anti_bot_detected: false,
    confidence_scores: {},
  };

  // Check for PII in action data
  if (actionData) {
    const piiCheck = detectPII(actionData);
    if (piiCheck.pii_found) {
      complianceCheck.pii_detected = true;
      complianceCheck.pii_fields = piiCheck.fields;
      complianceCheck.confidence_scores.pii_detection = 95;
    }
  }

  // Check for TOS violations
  const tosCheck = checkTOSViolation(domain, actionType);
  if (tosCheck.is_violation) {
    complianceCheck.tos_violation_risk = true;
    complianceCheck.confidence_scores.tos_violation = tosCheck.risk_score;
  }

  // Check for anti-bot detection
  if (responseData) {
    const antiBotCheck = detectAntiBotSignatures(responseData);
    if (antiBotCheck.detected) {
      complianceCheck.anti_bot_detected = true;
      complianceCheck.confidence_scores.anti_bot = 90;
    }
  }

  // Check rate limit potential
  const restrictions = TOS_RESTRICTIONS[domain];
  if (restrictions) {
    // In production, would check actual request history
    // For now, flag as warning if action is frequently called
    if (actionType === "extract" || actionType === "scrape") {
      complianceCheck.rate_limit_warning = true;
      complianceCheck.confidence_scores.rate_limit = 60;
    }
  }

  return complianceCheck;
}

/**
 * Redact PII from screenshot or text
 */
function redactPII(text: string): string {
  let redacted = text;

  // Redact emails
  redacted = redacted.replace(
    PII_PATTERNS.email,
    "[REDACTED_EMAIL]"
  );

  // Redact phone numbers
  redacted = redacted.replace(
    PII_PATTERNS.phone,
    "[REDACTED_PHONE]"
  );

  // Redact SSN
  redacted = redacted.replace(
    PII_PATTERNS.ssn,
    "[REDACTED_SSN]"
  );

  // Redact credit cards
  redacted = redacted.replace(
    PII_PATTERNS.credit_card,
    "[REDACTED_CC]"
  );

  // Redact API keys
  redacted = redacted.replace(
    PII_PATTERNS.api_key,
    "[REDACTED_KEY]"
  );

  // Redact passwords
  redacted = redacted.replace(
    PII_PATTERNS.password,
    "$1=[REDACTED_PASSWORD]"
  );

  return redacted;
}

/**
 * Log action with compliance checks
 */
async function logAction(
  sessionId: string,
  taskId: string,
  userId: string,
  actionData: {
    action_type: string;
    action_description: string;
    url: string;
    element_selector?: string;
    element_xpath?: string;
    success: boolean;
    response_data?: Record<string, unknown>;
    error?: string;
    screenshot_url?: string;
    duration_ms?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<LogResponse> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Perform compliance check
    const complianceCheck = performComplianceCheck(
      actionData.url,
      actionData.action_type,
      actionData.metadata,
      actionData.response_data
    );

    // Build compliance flags
    const complianceFlags: string[] = [];
    if (complianceCheck.pii_detected) {
      complianceFlags.push("PII_DETECTED");
    }
    if (complianceCheck.tos_violation_risk) {
      complianceFlags.push("TOS_VIOLATION_RISK");
    }
    if (complianceCheck.rate_limit_warning) {
      complianceFlags.push("RATE_LIMIT_WARNING");
    }
    if (complianceCheck.anti_bot_detected) {
      complianceFlags.push("ANTI_BOT_DETECTED");
    }

    // Redact PII from response data if present
    let safeResponseData = actionData.response_data;
    if (safeResponseData && complianceCheck.pii_detected) {
      const redactedStr = redactPII(JSON.stringify(safeResponseData));
      safeResponseData = JSON.parse(redactedStr);
    }

    // Create audit record
    const { data: audit, error } = await client
      .from("browser_automation_audit")
      .insert({
        session_id: sessionId,
        task_id: taskId,
        user_id: userId,
        action_type: actionData.action_type,
        action_description: actionData.action_description,
        url: actionData.url,
        element_selector: actionData.element_selector,
        element_xpath: actionData.element_xpath,
        success: actionData.success,
        response_data: safeResponseData || {},
        error: actionData.error,
        screenshot_url: actionData.screenshot_url,
        duration_ms: actionData.duration_ms,
        metadata: actionData.metadata || {},
        compliance_flags: complianceFlags,
        pii_detected: complianceCheck.pii_detected,
        pii_fields: complianceCheck.pii_fields,
        tos_violation_risk: complianceCheck.tos_violation_risk,
        rate_limit_warning: complianceCheck.rate_limit_warning,
        anti_bot_detection: complianceCheck.anti_bot_detected,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Log any compliance violations
    if (complianceFlags.length > 0) {
      console.warn(`⚠️ COMPLIANCE FLAGS: ${complianceFlags.join(", ")} (Audit: ${audit.id})`);
    }

    return {
      audit_id: audit.id,
      compliance_flags: complianceFlags,
      message: `Action logged with ${complianceFlags.length} compliance flags`,
    };
  } catch (error) {
    throw new Error(
      `Failed to log action: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get compliance report for session
 */
async function getComplianceReport(
  sessionId: string,
  userId: string
): Promise<{
  total_actions: number;
  pii_detected_count: number;
  tos_violations_count: number;
  anti_bot_detections: number;
  overall_compliance_score: number;
}> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: audits, error } = await client
      .from("browser_automation_audit")
      .select("pii_detected, tos_violation_risk, anti_bot_detection")
      .eq("session_id", sessionId)
      .eq("user_id", userId);

    if (error) throw error;

    const auditRecords = audits || [];
    const piiCount = auditRecords.filter((a: { pii_detected: boolean }) => a.pii_detected).length;
    const tosCount = auditRecords.filter((a: { tos_violation_risk: boolean }) => a.tos_violation_risk).length;
    const botCount = auditRecords.filter((a: { anti_bot_detection: boolean }) => a.anti_bot_detection).length;

    // Calculate compliance score (0-100, higher is better)
    const complianceScore =
      auditRecords.length > 0
        ? Math.max(
            0,
            100 -
              (piiCount * 20 + tosCount * 30 + botCount * 25) /
                auditRecords.length
          )
        : 100;

    return {
      total_actions: auditRecords.length,
      pii_detected_count: piiCount,
      tos_violations_count: tosCount,
      anti_bot_detections: botCount,
      overall_compliance_score: Math.round(complianceScore),
    };
  } catch (error) {
    console.error("Failed to get compliance report:", error);
    return {
      total_actions: 0,
      pii_detected_count: 0,
      tos_violations_count: 0,
      anti_bot_detections: 0,
      overall_compliance_score: 0,
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
      case "log_action":
        response = await logAction(
          data.session_id,
          data.task_id,
          data.user_id,
          data.action_data
        );
        break;

      case "check_compliance":
        response = performComplianceCheck(
          data.domain,
          data.action_type,
          data.action_data,
          data.response_data
        );
        break;

      case "redact_pii":
        response = {
          redacted_text: redactPII(data.text),
        };
        break;

      case "get_compliance_report":
        response = await getComplianceReport(data.session_id, data.user_id);
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
