import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface SelectorRule {
  id: string;
  domain: string;
  element_identifier: string;
  selectors: Array<{
    selector: string;
    type: "css" | "xpath" | "text" | "aria";
    success_rate: number;
    tested_count: number;
    last_tested: string;
  }>;
  primary_selector: string;
  backup_selectors: string[];
  success_count: number;
  failure_count: number;
  success_rate: number;
  confidence_score: number;
  version: number;
}

interface LearnResponse {
  rule_id: string;
  new_selector: string;
  selector_type: string;
  confidence_score: number;
  message: string;
}

interface TestSelectorResponse {
  selector: string;
  success: boolean;
  reason: string;
  latency_ms: number;
}

/**
 * Get existing rule for domain and element
 */
async function getRule(
  userId: string,
  domain: string,
  elementIdentifier: string
): Promise<SelectorRule | null> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error } = await client
      .from("browser_automation_rules")
      .select("*")
      .eq("user_id", userId)
      .eq("domain", domain)
      .eq("element_identifier", elementIdentifier)
      .eq("active", true)
      .single();

    if (error) return null;
    return data;
  } catch (error) {
    console.error("Failed to get rule:", error);
    return null;
  }
}

/**
 * Extract text-based selector suggestions from screenshot description
 * In production, would use Claude Opus 4.5 vision to analyze actual screenshot
 */
function generateSelectorSuggestions(
  _screenshotPath: string,
  elementDescription: string
): string[] {
  // Simulate selector generation based on element description
  const suggestions: string[] = [];

  // Common selector patterns (in real app, would come from Claude vision analysis)
  const descriptors = elementDescription.toLowerCase();

  if (descriptors.includes("button")) {
    suggestions.push('button[type="submit"]');
    suggestions.push("button:contains('Submit')");
    suggestions.push('[role="button"]');
  }

  if (descriptors.includes("login")) {
    suggestions.push('input[name="email"], input[name="username"], input[name="login"]');
    suggestions.push('[aria-label*="email" i]');
    suggestions.push('[placeholder*="email" i]');
  }

  if (descriptors.includes("password")) {
    suggestions.push('input[type="password"]');
    suggestions.push('[aria-label*="password" i]');
    suggestions.push('[name="password"]');
  }

  if (descriptors.includes("search")) {
    suggestions.push('input[type="search"]');
    suggestions.push('[role="searchbox"]');
    suggestions.push('[placeholder*="search" i]');
  }

  if (descriptors.includes("link")) {
    suggestions.push("a[href]");
    suggestions.push('[role="link"]');
  }

  // Fallback to generic suggestions
  if (suggestions.length === 0) {
    suggestions.push('[class*="input"]');
    suggestions.push('[class*="field"]');
    suggestions.push('[data-testid]');
    suggestions.push('[aria-label]');
  }

  return suggestions;
}

/**
 * Test a selector against a URL
 * Simulated - in production would use Playwright to test
 */
async function testSelector(
  _selector: string,
  _url: string
): Promise<TestSelectorResponse> {
  // Simulate selector testing with 70% success rate
  const success = Math.random() > 0.3;

  return {
    selector: _selector,
    success,
    reason: success ? "Element found and accessible" : "Element not found or not accessible",
    latency_ms: Math.random() * 2000 + 500,
  };
}

/**
 * Learn new selector from failed selector
 */
async function learnFromFailure(
  userId: string,
  domain: string,
  elementIdentifier: string,
  failedSelector: string,
  screenshotPath: string,
  screenshotDescription: string
): Promise<LearnResponse> {
  try {
    // Get current rule if exists
    let rule = await getRule(userId, domain, elementIdentifier);

    // Generate selector suggestions from screenshot analysis
    const suggestions = generateSelectorSuggestions(screenshotPath, screenshotDescription);

    if (suggestions.length === 0) {
      throw new Error("Could not generate selector suggestions from screenshot");
    }

    // Test each suggestion
    const testedSelectors: Array<{
      selector: string;
      success: boolean;
      latency_ms: number;
    }> = [];
    let bestSelector = "";
    let highestSuccessRate = 0;

    for (const selector of suggestions) {
      const testResult = await testSelector(selector, domain);
      testedSelectors.push({
        selector,
        success: testResult.success,
        latency_ms: testResult.latency_ms,
      });

      if (testResult.success) {
        if (!bestSelector || testResult.latency_ms < 1000) {
          bestSelector = selector;
          highestSuccessRate = 100;
        }
      }
    }

    if (!bestSelector) {
      throw new Error("No successful selector found in suggestions");
    }

    const client = createClient(supabaseUrl, supabaseServiceKey);

    // Update or create rule
    if (!rule) {
      // Create new rule
      const { data: newRule, error } = await client
        .from("browser_automation_rules")
        .insert({
          user_id: userId,
          rule_name: `Learned: ${elementIdentifier} on ${domain}`,
          rule_type: "selector",
          domain,
          element_identifier: elementIdentifier,
          primary_selector: bestSelector,
          backup_selectors: testedSelectors
            .filter((t) => t.success && t.selector !== bestSelector)
            .map((t) => t.selector),
          selectors: testedSelectors.map((t) => ({
            selector: t.selector,
            type: "css",
            success_rate: t.success ? 100 : 0,
            tested_count: 1,
            last_tested: new Date().toISOString(),
          })),
          success_count: 1,
          failure_count: 0,
          success_rate: 100,
          confidence_score: highestSuccessRate,
          auto_learn: true,
          active: true,
          last_learned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      rule = newRule;
    } else {
      // Update existing rule
      const updatedSelectors = rule.selectors || [];

      // Add or update the new selector in the list
      const existingIndex = updatedSelectors.findIndex(
        (s: { selector: string }) => s.selector === bestSelector
      );
      if (existingIndex >= 0) {
        updatedSelectors[existingIndex].success_rate = 100;
        updatedSelectors[existingIndex].tested_count =
          (updatedSelectors[existingIndex].tested_count || 0) + 1;
        updatedSelectors[existingIndex].last_tested = new Date().toISOString();
      } else {
        updatedSelectors.push({
          selector: bestSelector,
          type: "css",
          success_rate: 100,
          tested_count: 1,
          last_tested: new Date().toISOString(),
        });
      }

      // Mark failed selector as unsuccessful
      const failedIndex = updatedSelectors.findIndex(
        (s: { selector: string }) => s.selector === failedSelector
      );
      if (failedIndex >= 0) {
        updatedSelectors[failedIndex].success_rate = 0;
        updatedSelectors[failedIndex].tested_count =
          (updatedSelectors[failedIndex].tested_count || 0) + 1;
      }

      // Calculate new success rate
      const successCount = updatedSelectors.filter(
        (s: { success_rate: number }) => s.success_rate > 50
      ).length;
      const newSuccessRate =
        updatedSelectors.length > 0
          ? (successCount / updatedSelectors.length) * 100
          : 0;

      const { error } = await client
        .from("browser_automation_rules")
        .update({
          primary_selector: bestSelector,
          backup_selectors: updatedSelectors
            .filter((s: { selector: string; success_rate: number }) => s.success_rate > 50 && s.selector !== bestSelector)
            .map((s: { selector: string }) => s.selector),
          selectors: updatedSelectors,
          success_count: rule.success_count + 1,
          success_rate: newSuccessRate,
          confidence_score: highestSuccessRate,
          version: (rule.version || 1) + 1,
          last_learned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", rule.id);

      if (error) throw error;
    }

    return {
      rule_id: rule.id,
      new_selector: bestSelector,
      selector_type: "css",
      confidence_score: highestSuccessRate,
      message: `Successfully learned new selector: ${bestSelector}`,
    };
  } catch (error) {
    throw new Error(
      `Failed to learn from failure: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Update rule with tested selector result
 */
async function updateSelectorResult(
  ruleId: string,
  selector: string,
  success: boolean
): Promise<{ rule_id: string; message: string }> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: rule, error: fetchError } = await client
      .from("browser_automation_rules")
      .select("*")
      .eq("id", ruleId)
      .single();

    if (fetchError) throw fetchError;

    // Update selector in list
    const selectors = rule.selectors || [];
    const selectorIndex = selectors.findIndex(
      (s: { selector: string }) => s.selector === selector
    );

    if (selectorIndex >= 0) {
      const selectorData = selectors[selectorIndex];
      const testedCount = (selectorData.tested_count || 0) + 1;
      const successCount = (selectorData.success_rate * selectorData.tested_count +
        (success ? 1 : 0)) /
        testedCount;

      selectors[selectorIndex] = {
        ...selectorData,
        success_rate: successCount * 100,
        tested_count: testedCount,
        last_tested: new Date().toISOString(),
      };
    }

    // Recalculate overall success rate
    const totalSuccess = selectors.reduce(
      (sum: number, s: { tested_count: number; success_rate: number }) => sum + s.tested_count * (s.success_rate / 100),
      0
    );
    const totalTested = selectors.reduce((sum: number, s: { tested_count: number }) => sum + s.tested_count, 0);
    const newSuccessRate = totalTested > 0 ? (totalSuccess / totalTested) * 100 : 0;

    // Update rule
    const { error: updateError } = await client
      .from("browser_automation_rules")
      .update({
        selectors,
        success_rate: newSuccessRate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId);

    if (updateError) throw updateError;

    return {
      rule_id: ruleId,
      message: `Updated selector ${selector} with success=${success}`,
    };
  } catch (error) {
    throw new Error(
      `Failed to update selector result: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get rule by domain and element identifier
 */
async function getRuleByDomainElement(
  userId: string,
  domain: string,
  elementIdentifier: string
): Promise<SelectorRule | null> {
  return getRule(userId, domain, elementIdentifier);
}

/**
 * Get all learned selectors for a domain
 */
async function getSelectorsByDomain(
  userId: string,
  domain: string
): Promise<SelectorRule[]> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error } = await client
      .from("browser_automation_rules")
      .select("*")
      .eq("user_id", userId)
      .eq("domain", domain)
      .eq("active", true)
      .order("success_rate", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to get selectors by domain:", error);
    return [];
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
      case "learn_from_failure":
        response = await learnFromFailure(
          data.user_id,
          data.domain,
          data.element_identifier,
          data.failed_selector,
          data.screenshot_path,
          data.screenshot_description
        );
        break;

      case "update_selector_result":
        response = await updateSelectorResult(
          data.rule_id,
          data.selector,
          data.success
        );
        break;

      case "get_rule":
        response = await getRuleByDomainElement(
          data.user_id,
          data.domain,
          data.element_identifier
        );
        break;

      case "get_selectors_by_domain":
        response = await getSelectorsByDomain(data.user_id, data.domain);
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
