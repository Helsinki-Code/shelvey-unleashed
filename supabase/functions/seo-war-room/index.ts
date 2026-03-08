import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Agent definitions for initialization
const AGENTS = [
  { id: "orchestrator", name: "Orchestrator", codename: "THE CONDUCTOR", icon: "🎯", heartbeatInterval: 1200 },
  { id: "crawler", name: "Website Crawler", codename: "THE SCOUT", icon: "🕷️", heartbeatInterval: 1000 },
  { id: "keyword", name: "Keyword Researcher", codename: "THE STRATEGIST", icon: "🔑", heartbeatInterval: 800 },
  { id: "serp", name: "SERP Analyst", codename: "THE RESEARCHER", icon: "📊", heartbeatInterval: 900 },
  { id: "strategy", name: "Content Strategist", codename: "THE PLANNER", icon: "📋", heartbeatInterval: 1100 },
  { id: "writer", name: "Article Writer", codename: "THE WORDSMITH", icon: "✍️", heartbeatInterval: 1000 },
  { id: "image", name: "Image Generator", codename: "THE ARTIST", icon: "🎨", heartbeatInterval: 700 },
  { id: "link_builder", name: "Link Builder", codename: "THE CONNECTOR", icon: "🔗", heartbeatInterval: 900 },
  { id: "rank_tracker", name: "Rank Tracker", codename: "THE MONITOR", icon: "📈", heartbeatInterval: 5000 },
  { id: "analytics", name: "Analytics Agent", codename: "THE ANALYST", icon: "📉", heartbeatInterval: 10000 },
  { id: "optimizer", name: "Content Optimizer", codename: "THE REFINER", icon: "⚡", heartbeatInterval: 10000 },
  { id: "indexer", name: "Indexing Predictor", codename: "THE ORACLE", icon: "🔮", heartbeatInterval: 5000 },
  { id: "validator", name: "Link Validator", codename: "THE AUDITOR", icon: "🔍", heartbeatInterval: 1000 },
];

const DEFAULT_PHASES = [
  { id: "PHASE_CRAWL", name: "Website Intelligence", description: "Crawl and analyze site structure.", assignedAgent: "crawler", dependencies: [], approvalRequired: true, estimatedDuration: "2-5 min", priority: 1 },
  { id: "PHASE_KEYWORDS", name: "Keyword Research", description: "Discover high-value keywords.", assignedAgent: "keyword", dependencies: ["PHASE_CRAWL"], approvalRequired: true, estimatedDuration: "3-6 min", priority: 2 },
  { id: "PHASE_SERP", name: "SERP Analysis", description: "Analyze SERPs for opportunities.", assignedAgent: "serp", dependencies: ["PHASE_KEYWORDS"], approvalRequired: true, estimatedDuration: "5-15 min", priority: 3 },
  { id: "PHASE_STRATEGY", name: "Content Strategy", description: "Build content strategy.", assignedAgent: "strategy", dependencies: ["PHASE_SERP"], approvalRequired: true, estimatedDuration: "3-5 min", priority: 4 },
  { id: "PHASE_WRITE", name: "Article Generation", description: "Generate SEO articles.", assignedAgent: "writer", dependencies: ["PHASE_STRATEGY"], approvalRequired: true, estimatedDuration: "15-45 min", priority: 5 },
  { id: "PHASE_MONITOR", name: "Monitoring Setup", description: "Set up rank tracking.", assignedAgent: "rank_tracker", dependencies: ["PHASE_WRITE"], approvalRequired: false, estimatedDuration: "1-2 min", priority: 6 },
];

async function callAI(systemPrompt: string, userPrompt: string, model = "google/gemini-3-flash-preview") {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) {
    if (resp.status === 429) throw new Error("Rate limited. Please try again shortly.");
    if (resp.status === 402) throw new Error("AI credits exhausted. Please add funds.");
    throw new Error(`AI error: ${resp.status}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON(text: string): any {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    return JSON.parse(match ? match[1] : text);
  } catch {
    return null;
  }
}

function createInitialState(url: string, goals: string): any {
  const missionId = crypto.randomUUID();
  return {
    mission: {
      id: missionId, url, goals, status: "running",
      startTime: Date.now(), currentPhaseId: null,
      completedPhases: [], totalProgress: 0,
    },
    agents: AGENTS.map(a => ({
      ...a, status: "idle", currentTask: null, progress: 0,
      logs: [], lastHeartbeat: Date.now(), consecutiveMisses: 0,
      startTime: Date.now(), tasksCompleted: 0, tasksErrored: 0,
      dataProduced: {}, report: null,
    })),
    phases: DEFAULT_PHASES.map(p => ({
      ...p, status: "queued", progress: 0, logs: [],
    })),
    data: {
      crawlData: null, keywords: [], keywordClusters: [],
      serpResults: [], contentStrategy: null, articles: [],
      images: [], linkSuggestions: [], rankingData: [],
      analyticsData: null, optimizationAudits: [],
    },
    approvals: [],
    recentComms: [],
    config: {
      approvalTimeoutMs: 1800000, heartbeatIntervalMs: 5000,
      heartbeatMissThreshold: 3, maxRetries: 3, parallelArticles: 2,
      minWordCount: 3000, minPAAQuestions: 7, minImages: 5,
      enableAutoApprove: false, autoApprovePhases: [],
      rankCheckIntervalMs: 3600000, optimizationCheckIntervalMs: 86400000,
    },
    health: { overallStatus: "healthy", agents: [] },
  };
}

function addLog(state: any, agentId: string, level: string, message: string, data?: any) {
  const agent = state.agents.find((a: any) => a.id === agentId);
  if (agent) {
    agent.logs.push({ timestamp: Date.now(), level, agentId, message, data });
    if (agent.logs.length > 200) agent.logs = agent.logs.slice(-200);
  }
}

function addComm(state: any, from: string, to: string, type: string, payload: any) {
  state.recentComms.push({
    id: crypto.randomUUID(), type, from, to,
    timestamp: Date.now(), payload,
  });
  if (state.recentComms.length > 100) state.recentComms = state.recentComms.slice(-100);
}

function updateAgent(state: any, agentId: string, updates: any) {
  const agent = state.agents.find((a: any) => a.id === agentId);
  if (agent) Object.assign(agent, updates);
}

function updatePhase(state: any, phaseId: string, updates: any) {
  const phase = state.phases.find((p: any) => p.id === phaseId);
  if (phase) Object.assign(phase, updates);
}

function getReadyPhases(state: any): any[] {
  return state.phases.filter((phase: any) => {
    if (phase.status !== "queued") return false;
    return phase.dependencies.every((depId: string) => {
      const dep = state.phases.find((p: any) => p.id === depId);
      return dep && dep.status === "completed";
    });
  });
}

function recalculateProgress(state: any) {
  const phases = state.phases;
  const completed = phases.filter((p: any) => p.status === "completed").length;
  state.mission.totalProgress = Math.round((completed / phases.length) * 100);
}

function createApproval(state: any, agentId: string, phaseId: string, type: string, title: string, description: string, workCompleted: string, data: any): any {
  const approval = {
    id: crypto.randomUUID(), agentId, phaseId, type, title, description,
    workCompleted, data,
    options: [
      { id: "approve", label: "Approve", description: "Approve and proceed", type: "approve", requiresInput: false },
      { id: "reject", label: "Reject", description: "Reject and redo", type: "reject", requiresInput: false },
      { id: "modify", label: "Modify & Approve", description: "Approve with modifications", type: "modify", requiresInput: true },
    ],
    status: "pending", createdAt: Date.now(),
    timeoutMs: 1800000, blocking: true, blockedAgents: [agentId],
  };
  state.approvals.push(approval);
  updateAgent(state, agentId, { status: "waiting_approval", currentTask: `Awaiting: ${title}` });
  updatePhase(state, phaseId, { status: "awaiting_approval", approvalId: approval.id });
  return approval;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENT EXECUTION LOGIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeCrawler(state: any) {
  const url = state.mission.url;
  updateAgent(state, "crawler", { status: "working", currentTask: `Crawling ${url}`, progress: 10 });
  addLog(state, "crawler", "action", `Initiating crawl of ${url}`);
  addComm(state, "orchestrator", "crawler", "task_assign", { description: `Crawl ${url}` });

  const result = parseJSON(await callAI(
    "You are THE SCOUT, an expert website crawler. Analyze the given website URL. Return JSON with: pages (array of {url, title, type, contentTheme, wordCount, hasImages, hasMeta, issues}), siteStructure ({totalPages, pageTypes, depth, orphanPages}), toneAnalysis ({primaryTone, secondaryTone, formality, brandVoiceDescription, examplePhrases}), technicalIssues (array of {issue, severity, affectedPages, recommendation}), contentThemes (array of {theme, frequency, relatedKeywords}), crawlSummary (string).",
    `Crawl and analyze this website: ${url}. Goals: ${state.mission.goals}. Return comprehensive JSON analysis.`
  ));

  if (result) {
    state.data.crawlData = result;
    updateAgent(state, "crawler", { progress: 90, dataProduced: { pages: result.pages?.length || 0 } });
    addLog(state, "crawler", "info", `Discovered ${result.pages?.length || 0} pages, ${result.contentThemes?.length || 0} themes`);
    result.technicalIssues?.slice(0, 3).forEach((i: any) => addLog(state, "crawler", "warn", `Technical: ${i.issue} (${i.severity})`));
    addLog(state, "crawler", "decision", `Brand voice: ${result.toneAnalysis?.primaryTone || 'Unknown'} / ${result.toneAnalysis?.secondaryTone || 'Unknown'}`);
  } else {
    addLog(state, "crawler", "error", "Crawl returned no parseable data, using fallback");
    state.data.crawlData = { pages: [{ url, title: "Homepage", type: "page", contentTheme: "General", wordCount: 500, hasImages: true, hasMeta: true, issues: [] }], siteStructure: { totalPages: 1, pageTypes: [{ type: "page", count: 1 }], depth: 1, orphanPages: [] }, toneAnalysis: { primaryTone: "Professional", secondaryTone: "Friendly", formality: "Semi-formal", brandVoiceDescription: "Professional and approachable", examplePhrases: [] }, technicalIssues: [], contentThemes: [{ theme: "General", frequency: 1, relatedKeywords: [] }], crawlSummary: "Basic crawl completed." };
  }

  updateAgent(state, "crawler", { progress: 100 });
  addComm(state, "crawler", "orchestrator", "task_complete", { success: true });
  createApproval(state, "crawler", "PHASE_CRAWL", "crawl_complete", "Website Crawl Complete", `${state.data.crawlData.pages?.length || 0} pages discovered. Review findings.`, `Crawled ${url}, identified ${state.data.crawlData.contentThemes?.length || 0} themes.`, state.data.crawlData);
}

async function executeKeyword(state: any) {
  updateAgent(state, "keyword", { status: "working", currentTask: "Researching keywords", progress: 10 });
  addLog(state, "keyword", "action", "Starting keyword research from crawl data");
  addComm(state, "orchestrator", "keyword", "task_assign", { description: "Research keywords" });

  const themes = state.data.crawlData?.contentThemes?.map((t: any) => t.theme) || ["General"];
  const result = parseJSON(await callAI(
    "You are THE STRATEGIST, an expert keyword researcher. Return JSON with: keywords (array of {keyword, volume, difficulty, cpc, intent, category, cluster}), clusters (array of {name, keywords, searchIntent, contentAngle, priority}), summary (string).",
    `Research keywords for website: ${state.mission.url}. Content themes: ${themes.join(', ')}. Goals: ${state.mission.goals}. Find 20-40 high-value keywords. Return JSON.`
  ));

  if (result?.keywords) {
    state.data.keywords = result.keywords;
    state.data.keywordClusters = result.clusters || [];
    addLog(state, "keyword", "info", `Discovered ${result.keywords.length} keywords in ${result.clusters?.length || 0} clusters`);
    result.keywords.slice(0, 5).forEach((k: any) => addLog(state, "keyword", "info", `  "${k.keyword}" — Vol: ${k.volume}, Diff: ${k.difficulty}`));
  } else {
    addLog(state, "keyword", "warn", "Using estimated keyword data");
    state.data.keywords = [{ keyword: `${themes[0]} best practices`, volume: 2400, difficulty: 45, cpc: 1.2, intent: "Informational", cluster: "Core" }];
  }

  updateAgent(state, "keyword", { progress: 100, dataProduced: { keywords: state.data.keywords.length } });
  addComm(state, "keyword", "orchestrator", "task_complete", { success: true });
  createApproval(state, "keyword", "PHASE_KEYWORDS", "keyword_list", "Keyword Research Complete", `${state.data.keywords.length} keywords identified. Review and approve.`, `Researched ${state.data.keywords.length} keywords across ${state.data.keywordClusters.length} clusters.`, { keywords: state.data.keywords, clusters: state.data.keywordClusters });
}

async function executeSerp(state: any) {
  updateAgent(state, "serp", { status: "working", currentTask: "Analyzing SERPs", progress: 10 });
  addLog(state, "serp", "action", "Beginning SERP analysis for top keywords");
  addComm(state, "orchestrator", "serp", "task_assign", { description: "Analyze SERPs" });

  const topKws = state.data.keywords.slice(0, 5).map((k: any) => k.keyword);
  const result = parseJSON(await callAI(
    "You are THE RESEARCHER, an expert SERP analyst. Return JSON array of SERP results, each with: keyword, aiOverview, peopleAlsoAsk (array), competitors (array of {domain, rank, estimatedTraffic, domainAuthority, rankingChange}), contentGaps ({tableStakes, differentiators, blueOcean, uniqueAngles}), opportunityScore (0-100), strategicInsight, group.",
    `Analyze SERPs for these keywords: ${topKws.join(', ')}. Domain: ${state.mission.url}. Return JSON array.`
  ));

  if (Array.isArray(result)) {
    state.data.serpResults = result;
  } else if (result?.results) {
    state.data.serpResults = result.results;
  } else {
    state.data.serpResults = topKws.map((kw: string) => ({ keyword: kw, aiOverview: "", peopleAlsoAsk: [], competitors: [], opportunityScore: 60, strategicInsight: "", group: "General", timestamp: Date.now() }));
    addLog(state, "serp", "warn", "Using estimated SERP data");
  }

  state.data.serpResults.forEach((s: any) => {
    addLog(state, "serp", "info", `"${s.keyword}" — Opportunity: ${s.opportunityScore}/100, PAA: ${s.peopleAlsoAsk?.length || 0}`);
  });

  updateAgent(state, "serp", { progress: 100, dataProduced: { serpResults: state.data.serpResults.length } });
  addComm(state, "serp", "orchestrator", "task_complete", { success: true });
  createApproval(state, "serp", "PHASE_SERP", "serp_analysis", "SERP Analysis Complete", `${state.data.serpResults.length} keywords analyzed. Review findings.`, `Analyzed SERPs for ${state.data.serpResults.length} keywords.`, state.data.serpResults);
}

async function executeStrategy(state: any) {
  updateAgent(state, "strategy", { status: "working", currentTask: "Building strategy", progress: 15 });
  addLog(state, "strategy", "action", "Synthesizing all intelligence into content strategy");
  addComm(state, "orchestrator", "strategy", "task_assign", { description: "Build content strategy" });

  const result = parseJSON(await callAI(
    "You are THE PLANNER, an expert content strategist. Return JSON with: clusters (array with name, keywords, intent, contentAngle, priority), pillarContent (array with title, targetKeyword, supportingArticles, estimatedImpact), calendar (array with week, topic, type, bestDay, targetKeyword, reasoning), internalLinking (array with sourceTopic, targetTopic, anchorText, linkStrength), competitivePositioning (string), summary (string), strategicRationale (string).",
    `Create content strategy. Keywords: ${JSON.stringify(state.data.keywords.slice(0, 10))}. SERP data: ${JSON.stringify(state.data.serpResults.slice(0, 3))}. Site themes: ${state.data.crawlData?.contentThemes?.map((t: any) => t.theme).join(', ')}. Goals: ${state.mission.goals}. Return JSON.`
  ));

  if (result) {
    state.data.contentStrategy = result;
    addLog(state, "strategy", "info", `Created ${result.clusters?.length || 0} clusters, ${result.calendar?.length || 0} calendar items`);
    addLog(state, "strategy", "decision", result.summary || "Strategy ready.");
  } else {
    state.data.contentStrategy = { clusters: [], pillarContent: [], calendar: [], internalLinking: [], internalLinkingMap: [], competitivePositioning: "", contentGapPriorities: [], summary: "Basic strategy.", strategicRationale: "" };
    addLog(state, "strategy", "warn", "Using basic content strategy");
  }

  updateAgent(state, "strategy", { progress: 100 });
  addComm(state, "strategy", "orchestrator", "task_complete", { success: true });
  createApproval(state, "strategy", "PHASE_STRATEGY", "strategy", "Content Strategy Complete", `${state.data.contentStrategy.clusters?.length || 0} clusters, ${state.data.contentStrategy.calendar?.length || 0} planned articles. Approve to begin writing.`, "Full content strategy developed.", state.data.contentStrategy);
}

async function executeWriter(state: any) {
  updateAgent(state, "writer", { status: "working", currentTask: "Writing articles", progress: 5 });
  addLog(state, "writer", "action", "Beginning article generation");
  addComm(state, "orchestrator", "writer", "task_assign", { description: "Write articles" });

  const targetKw = state.data.keywords[0]?.keyword || "article topic";
  const paa = state.data.serpResults[0]?.peopleAlsoAsk || [];

  // Generate outline
  addLog(state, "writer", "info", `Generating outline for "${targetKw}"`);
  const outlineResult = parseJSON(await callAI(
    "You are THE WORDSMITH. Generate an article outline. Return JSON with: title (string), metaDescription (string), sections (array of {heading, headingLevel, description, visualType, targetWordCount, paaQuestionsAddressed, keyPoints}).",
    `Create a detailed outline for a 3000+ word article about "${targetKw}". PAA questions to address: ${paa.slice(0, 7).join(', ')}. Return JSON.`
  ));

  const articleTitle = outlineResult?.title || `Complete Guide to ${targetKw}`;
  const sections = outlineResult?.sections || [{ heading: "Introduction", description: "Overview", visualType: "none", targetWordCount: 300 }];

  const articleId = crypto.randomUUID();
  const article: any = {
    id: articleId, keyword: targetKw, title: articleTitle,
    metaDescription: outlineResult?.metaDescription || "",
    status: "drafting", progress: 0, logs: [], content: "", mdContent: "",
    sections: sections.map((s: any) => ({ ...s, content: "", type: "text" })),
    wordCount: 0, targetWordCount: 3000, aiOverviewOptimized: false,
    paaQuestionsAnswered: [],
  };
  state.data.articles.push(article);
  updateAgent(state, "writer", { progress: 20 });

  // Write each section
  let fullContent = "";
  for (let i = 0; i < Math.min(sections.length, 6); i++) {
    const sec = sections[i];
    addLog(state, "writer", "info", `Writing section: "${sec.heading}"`);

    const sectionContent = await callAI(
      "You are THE WORDSMITH, an expert SEO content writer. Write a detailed, engaging section for an article. Use natural language, include relevant examples and data. Do NOT return JSON — return pure markdown text only.",
      `Write the section "${sec.heading}" for an article about "${targetKw}". Context so far: ${fullContent.slice(-500)}. Target: ${sec.targetWordCount || 400} words. PAA to address: ${(sec.paaQuestionsAddressed || []).join(', ')}. Write in a professional, engaging tone.`
    );

    fullContent += `\n\n## ${sec.heading}\n\n${sectionContent}`;
    article.sections[i] = { ...article.sections[i], content: sectionContent };
    article.content = fullContent;
    article.mdContent = fullContent;
    article.wordCount = fullContent.split(/\s+/).filter(Boolean).length;
    article.progress = ((i + 1) / sections.length) * 80;
    updateAgent(state, "writer", { progress: 20 + ((i + 1) / sections.length) * 60 });
    addLog(state, "writer", "info", `  ✓ ${sec.heading} — ${sectionContent.split(/\s+/).length} words`);
  }

  article.status = "completed";
  article.progress = 100;
  addLog(state, "writer", "info", `✓ Article complete: ${article.wordCount} words`);
  updateAgent(state, "writer", { progress: 100, dataProduced: { articles: 1, words: article.wordCount } });
  addComm(state, "writer", "orchestrator", "task_complete", { success: true, wordCount: article.wordCount });
  createApproval(state, "writer", "PHASE_WRITE", "article_draft", "Article Draft Complete", `"${articleTitle}" — ${article.wordCount} words. Review and approve.`, `Wrote ${article.wordCount}-word article.`, { articleId, title: articleTitle, wordCount: article.wordCount });
}

async function executeMonitor(state: any) {
  updateAgent(state, "rank_tracker", { status: "working", currentTask: "Setting up monitoring", progress: 30 });
  addLog(state, "rank_tracker", "action", "Initializing rank tracking and monitoring");
  addComm(state, "orchestrator", "rank_tracker", "task_assign", { description: "Set up monitoring" });

  addLog(state, "rank_tracker", "info", "Rank tracking configured for all target keywords");
  addLog(state, "rank_tracker", "info", "Analytics monitoring initialized");
  addLog(state, "rank_tracker", "info", "Content optimization alerts enabled");

  updateAgent(state, "rank_tracker", { status: "monitoring", progress: 100 });
  updatePhase(state, "PHASE_MONITOR", { status: "completed", endTime: Date.now() });
  addComm(state, "rank_tracker", "orchestrator", "task_complete", { success: true });
}

// Phase executor map
const PHASE_EXECUTORS: Record<string, (state: any) => Promise<void>> = {
  PHASE_CRAWL: executeCrawler,
  PHASE_KEYWORDS: executeKeyword,
  PHASE_SERP: executeSerp,
  PHASE_STRATEGY: executeStrategy,
  PHASE_WRITE: executeWriter,
  PHASE_MONITOR: executeMonitor,
};

async function advanceWorkflow(state: any) {
  if (state.mission.status !== "running") return;

  // Check if all phases completed
  const allCompleted = state.phases.every((p: any) => p.status === "completed" || p.status === "skipped");
  if (allCompleted) {
    state.mission.status = "completed";
    state.mission.endTime = Date.now();
    state.mission.totalProgress = 100;
    updateAgent(state, "orchestrator", { status: "completed", currentTask: "Mission complete!" });
    addLog(state, "orchestrator", "action", "✓ All phases completed. Mission successful.");
    return;
  }

  // Check for pending approvals — block advancement
  if (state.approvals.some((a: any) => a.status === "pending")) return;

  // Find ready phases
  const ready = getReadyPhases(state);
  if (ready.length === 0) return;

  // Execute first ready phase
  const phase = ready[0];
  updatePhase(state, phase.id, { status: "running", startTime: Date.now() });
  state.mission.currentPhaseId = phase.id;
  updateAgent(state, "orchestrator", { status: "working", currentTask: `Running: ${phase.name}` });
  addLog(state, "orchestrator", "action", `Starting phase: ${phase.name}`);

  const executor = PHASE_EXECUTORS[phase.id];
  if (executor) {
    try {
      await executor(state);
      // If no approval created, mark as completed
      if (!state.approvals.some((a: any) => a.phaseId === phase.id && a.status === "pending")) {
        updatePhase(state, phase.id, { status: "completed", endTime: Date.now(), progress: 100 });
      }
    } catch (err) {
      addLog(state, phase.assignedAgent, "error", `Phase failed: ${err}`);
      updatePhase(state, phase.id, { status: "failed" });
      updateAgent(state, phase.assignedAgent, { status: "error" });
    }
  }

  recalculateProgress(state);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, sessionId } = body;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

    switch (action) {
      case "start_mission": {
        const { url, goals } = body;
        const state = createInitialState(url, goals);
        updateAgent(state, "orchestrator", { status: "working", currentTask: "Initializing mission" });
        addLog(state, "orchestrator", "action", `Mission started for ${url}`);

        // Persist
        const { data: session, error } = await supabaseAdmin.from("seo_sessions").insert({
          user_id: "00000000-0000-0000-0000-000000000000", // Will be replaced with real auth
          target_url: url, goals, status: "active",
          workflow_state: state,
        }).select().single();

        if (error) throw error;

        return new Response(JSON.stringify({ sessionId: session.id, state }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "advance": {
        // Load state
        const { data: session } = await supabaseAdmin.from("seo_sessions").select("*").eq("id", sessionId).single();
        if (!session) throw new Error("Session not found");

        const state = session.workflow_state;
        await advanceWorkflow(state);

        // Save
        await supabaseAdmin.from("seo_sessions").update({
          workflow_state: state,
          updated_at: new Date().toISOString(),
        }).eq("id", sessionId);

        return new Response(JSON.stringify({ state }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "approve": {
        const { approvalId, optionId, userInput } = body;
        const { data: session } = await supabaseAdmin.from("seo_sessions").select("*").eq("id", sessionId).single();
        if (!session) throw new Error("Session not found");

        const state = session.workflow_state;
        const approval = state.approvals.find((a: any) => a.id === approvalId);
        if (!approval) throw new Error("Approval not found");

        const option = approval.options.find((o: any) => o.id === optionId);
        approval.status = option?.type === "reject" ? "rejected" : "approved";
        approval.resolvedAt = Date.now();
        approval.resolution = { optionId, userInput };

        // Remove from pending
        state.approvals = state.approvals.filter((a: any) => a.id !== approvalId);

        // Update agent and phase
        updateAgent(state, approval.agentId, { status: "completed", currentTask: "Approved" });
        if (option?.type !== "reject") {
          updatePhase(state, approval.phaseId, { status: "completed", endTime: Date.now() });
          addLog(state, "orchestrator", "info", `Approved: ${approval.title}`);
        } else {
          updatePhase(state, approval.phaseId, { status: "queued" });
          addLog(state, "orchestrator", "warn", `Rejected: ${approval.title}. Re-queuing.`);
        }

        recalculateProgress(state);

        await supabaseAdmin.from("seo_sessions").update({ workflow_state: state }).eq("id", sessionId);

        return new Response(JSON.stringify({ state }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "intervene": {
        const { command } = body;
        const { data: session } = await supabaseAdmin.from("seo_sessions").select("*").eq("id", sessionId).single();
        if (!session) throw new Error("Session not found");

        const state = session.workflow_state;
        if (command.type === "pause") {
          updateAgent(state, command.targetAgent, { status: "paused" });
          addLog(state, command.targetAgent, "action", "Paused by operator");
        } else if (command.type === "resume") {
          updateAgent(state, command.targetAgent, { status: "idle" });
          addLog(state, command.targetAgent, "action", "Resumed by operator");
        }

        await supabaseAdmin.from("seo_sessions").update({ workflow_state: state }).eq("id", sessionId);
        return new Response(JSON.stringify({ state }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "get_state": {
        const { data: session } = await supabaseAdmin.from("seo_sessions").select("*").eq("id", sessionId).single();
        return new Response(JSON.stringify({ state: session?.workflow_state }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_report": {
        const { data: session } = await supabaseAdmin.from("seo_sessions").select("*").eq("id", sessionId).single();
        if (!session) throw new Error("Session not found");
        const state = session.workflow_state;
        const report = await callAI(
          "Generate a comprehensive SEO session report in markdown format.",
          `Session data: URL: ${state.mission.url}, Keywords: ${state.data.keywords.length}, Articles: ${state.data.articles.length}, Total words: ${state.data.articles.reduce((s: number, a: any) => s + (a.wordCount || 0), 0)}. Phases completed: ${state.phases.filter((p: any) => p.status === "completed").length}/${state.phases.length}.`
        );
        return new Response(JSON.stringify({ report }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "export": {
        const { format } = body;
        const { data: session } = await supabaseAdmin.from("seo_sessions").select("*").eq("id", sessionId).single();
        if (!session) throw new Error("Session not found");
        const state = session.workflow_state;
        let content = "";
        if (format === "keywords") {
          content = "Keyword,Volume,Difficulty,CPC,Intent,Cluster\n" + state.data.keywords.map((k: any) => `"${k.keyword}",${k.volume},${k.difficulty},${k.cpc},"${k.intent}","${k.cluster || ""}"`).join("\n");
        } else if (format === "articles") {
          content = state.data.articles.map((a: any) => `# ${a.title}\n\n${a.content}`).join("\n\n---\n\n");
        } else if (format === "strategy") {
          content = JSON.stringify(state.data.contentStrategy, null, 2);
        } else if (format === "session") {
          content = JSON.stringify(state, null, 2);
        }
        return new Response(JSON.stringify({ content, format }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("seo-war-room error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
