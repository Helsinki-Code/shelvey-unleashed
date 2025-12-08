import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agent work step with visual documentation
interface AgentWorkStep {
  step: number;
  action: string;
  url?: string;
  screenshot?: string;
  timestamp: string;
  reasoning: string;
  dataExtracted?: any;
  citations?: Citation[];
}

interface Citation {
  id: number;
  source: string;
  url: string;
  title: string;
  accessedAt: string;
  quote?: string;
}

// Agent specializations - ALL Phase 1 agents included, using ONLY mcp-perplexity (no brightdata)
const AGENT_SPECIALIZATIONS: Record<string, { name: string; suggestedMCPs: string[]; capabilities: string[] }> = {
  // Phase 1 Research Agents
  'head-of-research': {
    name: 'Head of Research',
    suggestedMCPs: ['mcp-perplexity'],
    capabilities: ['oversight', 'coordination', 'quality_review', 'research_strategy'],
  },
  'market-research': {
    name: 'Market Research Agent',
    suggestedMCPs: ['mcp-perplexity'],
    capabilities: ['market_analysis', 'market_research', 'opportunity_assessment'],
  },
  'trend-prediction': {
    name: 'Trend Prediction Agent',
    suggestedMCPs: ['mcp-perplexity'],
    capabilities: ['trend_forecasting', 'trend_analysis', 'trend_forecast', 'market_signals'],
  },
  'customer-profiler': {
    name: 'Customer Profiler Agent',
    suggestedMCPs: ['mcp-perplexity'],
    capabilities: ['customer_personas', 'target_customer', 'demographics', 'psychographics'],
  },
  'competitor-analyst': {
    name: 'Competitor Analyst Agent',
    suggestedMCPs: ['mcp-perplexity'],
    capabilities: ['competitor_analysis', 'competitor_research', 'swot_analysis', 'market_positioning'],
  },
  // Phase 2 Branding Agents
  'brand-identity': {
    name: 'Brand Identity Agent',
    suggestedMCPs: ['mcp-falai', 'mcp-perplexity'],
    capabilities: ['logo_design', 'brand_guidelines', 'visual_identity', 'brand_strategy'],
  },
  'visual-design': {
    name: 'Visual Design Agent',
    suggestedMCPs: ['mcp-falai', 'mcp-perplexity'],
    capabilities: ['image_generation', 'graphic_design', 'asset_creation', 'color_palette'],
  },
  'content-creator': {
    name: 'Content Creator Agent',
    suggestedMCPs: ['mcp-perplexity', 'mcp-falai'],
    capabilities: ['content_writing', 'blog_posts', 'social_content', 'typography_selection'],
  },
  // Phase 3+ Agents
  'social-media': {
    name: 'Social Media Manager',
    suggestedMCPs: ['mcp-twitter', 'mcp-linkedin', 'mcp-facebook'],
    capabilities: ['social_posting', 'engagement', 'community_management'],
  },
  'seo-optimization': {
    name: 'SEO Optimization Agent',
    suggestedMCPs: ['mcp-perplexity', 'mcp-github'],
    capabilities: ['keyword_research', 'content_optimization', 'technical_seo'],
  },
  'sales-development': {
    name: 'Sales Development Agent',
    suggestedMCPs: ['mcp-linkedin', 'mcp-vapi', 'mcp-whatsapp'],
    capabilities: ['lead_generation', 'outreach', 'qualification'],
  },
  'sales-closer': {
    name: 'Sales Closer Agent',
    suggestedMCPs: ['mcp-vapi', 'mcp-stripe'],
    capabilities: ['sales_calls', 'negotiations', 'closing'],
  },
  'code-builder': {
    name: 'Code Builder Agent',
    suggestedMCPs: ['mcp-github'],
    capabilities: ['code_generation', 'repository_management', 'deployment'],
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, projectId, deliverableId, agentId, taskType, inputData, requestedMCPs, useComputerUse } = await req.json();

    console.log(`[agent-work-executor] Starting work for agent ${agentId} on deliverable ${deliverableId}, taskType: ${taskType}`);

    // Get agent specialization
    const agentSpec = AGENT_SPECIALIZATIONS[agentId] || {
      name: agentId.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      suggestedMCPs: ['mcp-perplexity'],
      capabilities: ['general'],
    };

    // Determine which MCP servers to use - ONLY use perplexity for Phase 1 research
    let mcpServersToUse = requestedMCPs || [];
    if (mcpServersToUse.length === 0) {
      mcpServersToUse = selectMCPsForTask(taskType, agentSpec.suggestedMCPs);
    }

    console.log(`[agent-work-executor] Using MCP servers: ${mcpServersToUse.join(', ')}`);

    // Initialize work tracking
    const workSteps: AgentWorkStep[] = [];
    const allCitations: Citation[] = [];
    const screenshots: string[] = [];
    let citationCounter = 1;

    // Update task status to processing
    if (deliverableId) {
      await supabase
        .from('phase_deliverables')
        .update({ status: 'in_progress', assigned_agent_id: agentId })
        .eq('id', deliverableId);
    }

    // Log activity start with project context
    await supabase.from('agent_activity_logs').insert({
      agent_id: agentId,
      agent_name: agentSpec.name,
      action: `Starting ${taskType} work`,
      status: 'in_progress',
      metadata: { deliverableId, projectId, mcpServers: mcpServersToUse, taskType, useComputerUse },
    });

    // Execute real work using MCP servers
    const workResults: any[] = [];
    let successCount = 0;
    let errorMessages: string[] = [];

    for (const mcpServer of mcpServersToUse) {
      try {
        const stepNumber = workSteps.length + 1;
        workSteps.push({
          step: stepNumber,
          action: `Executing ${taskType} via ${mcpServer}`,
          timestamp: new Date().toISOString(),
          reasoning: `Using ${mcpServer} to gather ${taskType} data`,
        });

        // Update activity in real-time with project context
        await supabase.from('agent_activity_logs').insert({
          agent_id: agentId,
          agent_name: agentSpec.name,
          action: `Querying ${mcpServer} for ${taskType}`,
          status: 'in_progress',
          metadata: { step: stepNumber, mcpServer, deliverableId, projectId },
        });

        const mcpResult = await executeMCPWork(supabase, supabaseUrl, supabaseServiceKey, {
          userId,
          projectId,
          agentId,
          mcpServerId: mcpServer,
          taskType,
          inputData,
        });

        // Extract citations from result
        const resultCitations = extractCitations(mcpResult, citationCounter);
        citationCounter += resultCitations.length;
        allCitations.push(...resultCitations);
        workSteps[workSteps.length - 1].citations = resultCitations;
        workSteps[workSteps.length - 1].dataExtracted = summarizeData(mcpResult);

        workResults.push({
          mcpServer,
          success: true,
          data: mcpResult,
          citations: resultCitations,
        });

        successCount++;
        console.log(`[agent-work-executor] ${mcpServer} succeeded with ${resultCitations.length} citations`);

        // Send progress update message
        await supabase.from('agent_messages').insert({
          user_id: userId,
          project_id: projectId,
          from_agent_id: agentId,
          from_agent_name: agentSpec.name,
          message_type: 'status_update',
          subject: `Progress: ${mcpServer} completed`,
          content: `Successfully completed ${taskType} work using ${mcpServer}. Found ${resultCitations.length} sources.`,
          context: { mcpServer, taskType, citationsCount: resultCitations.length },
          priority: 'normal',
        });

      } catch (mcpError) {
        const errMsg = mcpError instanceof Error ? mcpError.message : String(mcpError);
        console.error(`[agent-work-executor] MCP ${mcpServer} error:`, errMsg);
        workResults.push({
          mcpServer,
          success: false,
          error: errMsg,
        });
        errorMessages.push(`${mcpServer}: ${errMsg}`);
      }
    }

    // Determine if work was successful (at least one MCP succeeded)
    const hasAnySuccess = successCount > 0;
    const hasAllFailed = successCount === 0 && mcpServersToUse.length > 0;

    console.log(`[agent-work-executor] Work complete: ${successCount}/${mcpServersToUse.length} MCPs succeeded`);

    // Generate comprehensive report from work results
    let generatedContent: any = {};
    
    if (openaiApiKey && hasAnySuccess) {
      try {
        generatedContent = await generateComprehensiveReport(
          openaiApiKey,
          taskType,
          workResults,
          inputData,
          allCitations
        );
        console.log('[agent-work-executor] Report generated successfully');
      } catch (reportError) {
        console.error('[agent-work-executor] Report generation error:', reportError);
        generatedContent = { rawResults: workResults.filter(r => r.success) };
      }
    } else if (hasAnySuccess) {
      generatedContent = { rawResults: workResults.filter(r => r.success) };
    } else {
      generatedContent = { error: 'No data collected', messages: errorMessages };
    }

    // Store screenshots in Supabase Storage
    const storedScreenshots: string[] = [];
    for (let i = 0; i < screenshots.length; i++) {
      try {
        const fileName = `${userId}/${deliverableId}/step-${i + 1}-${Date.now()}.png`;
        const screenshotData = screenshots[i].replace(/^data:image\/\w+;base64,/, '');
        const binaryData = Uint8Array.from(atob(screenshotData), c => c.charCodeAt(0));
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('agent-work-media')
          .upload(fileName, binaryData, { contentType: 'image/png' });

        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('agent-work-media')
            .getPublicUrl(fileName);
          storedScreenshots.push(publicUrl);
        }
      } catch (e) {
        console.error('[agent-work-executor] Screenshot upload failed:', e);
      }
    }

    // Determine final status - only 'pending' if ALL failed, otherwise 'review'
    const finalStatus = hasAllFailed ? 'pending' : 'review';

    // Update deliverable with generated content
    if (deliverableId) {
      await supabase
        .from('phase_deliverables')
        .update({
          generated_content: generatedContent,
          screenshots: storedScreenshots,
          agent_work_steps: workSteps,
          citations: allCitations,
          status: finalStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliverableId);
    }

    // Log completion with project context
    await supabase.from('agent_activity_logs').insert({
      agent_id: agentId,
      agent_name: agentSpec.name,
      action: `Completed ${taskType} work with ${workSteps.length} steps and ${allCitations.length} citations`,
      status: hasAnySuccess ? 'completed' : 'failed',
      metadata: { 
        deliverableId,
        projectId,
        mcpServersUsed: mcpServersToUse,
        successCount,
        totalCount: mcpServersToUse.length,
        stepsCount: workSteps.length,
        citationsCount: allCitations.length,
        screenshotsCount: storedScreenshots.length,
      },
    });

    // Auto-trigger CEO review if work succeeded
    if (hasAnySuccess && deliverableId) {
      try {
        console.log('[agent-work-executor] Triggering CEO review for deliverable:', deliverableId);
        await supabase.functions.invoke('ceo-agent-chat', {
          body: {
            action: 'review_deliverable',
            userId,
            projectId,
            deliverableId,
          },
        });
      } catch (ceoError) {
        console.error('[agent-work-executor] CEO review trigger failed:', ceoError);
        // Non-blocking - don't fail the whole operation
      }
    }

    // Only escalate if ALL MCPs failed
    if (hasAllFailed) {
      await supabase.functions.invoke('escalation-handler', {
        body: {
          action: 'create_escalation',
          userId,
          projectId,
          agentId,
          agentName: agentSpec.name,
          issueType: 'technical_issue',
          issueDescription: `Work execution failed: ${errorMessages.join('; ')}`,
          context: { taskType, failedMCPs: workResults.filter(r => !r.success) },
          deliverableId,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: hasAnySuccess,
        data: {
          deliverableId,
          agentId,
          taskType,
          mcpServersUsed: mcpServersToUse,
          results: workResults,
          generatedContent,
          workSteps,
          citations: allCitations,
          screenshots: storedScreenshots,
          successCount,
          totalCount: mcpServersToUse.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[agent-work-executor] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractCitations(mcpResult: any, startId: number): Citation[] {
  const citations: Citation[] = [];
  let id = startId;

  if (!mcpResult) return citations;

  // Extract sources from various MCP response formats
  if (mcpResult?.sources) {
    for (const source of mcpResult.sources) {
      citations.push({
        id: id++,
        source: source.name || source.source || 'Unknown',
        url: source.url || source.link || '#',
        title: source.title || source.name || 'Source',
        accessedAt: new Date().toISOString(),
        quote: source.snippet || source.quote,
      });
    }
  }

  if (mcpResult?.citations) {
    for (const cite of mcpResult.citations) {
      citations.push({
        id: id++,
        source: cite.source || 'Unknown',
        url: cite.url || '#',
        title: cite.title || 'Source',
        accessedAt: new Date().toISOString(),
        quote: cite.quote,
      });
    }
  }

  // Extract from Perplexity-style results
  if (mcpResult?.webPages) {
    for (const page of mcpResult.webPages) {
      try {
        citations.push({
          id: id++,
          source: new URL(page.url).hostname.replace('www.', ''),
          url: page.url,
          title: page.title || page.name,
          accessedAt: new Date().toISOString(),
          quote: page.snippet,
        });
      } catch {
        citations.push({
          id: id++,
          source: 'Web Source',
          url: page.url || '#',
          title: page.title || 'Source',
          accessedAt: new Date().toISOString(),
        });
      }
    }
  }

  return citations;
}

function summarizeData(mcpResult: any): any {
  if (!mcpResult) return null;
  
  const summary: any = {};
  
  if (mcpResult.marketSize) summary.marketSize = mcpResult.marketSize;
  if (mcpResult.competitors) summary.competitorCount = Array.isArray(mcpResult.competitors) ? mcpResult.competitors.length : 0;
  if (mcpResult.trends) summary.trendCount = Array.isArray(mcpResult.trends) ? mcpResult.trends.length : 0;
  if (mcpResult.insights) summary.insightCount = Array.isArray(mcpResult.insights) ? mcpResult.insights.length : 0;
  if (mcpResult.keyFindings) summary.keyFindings = mcpResult.keyFindings;
  if (mcpResult.answer) summary.hasAnswer = true;
  if (mcpResult.data) summary.hasData = true;
  
  return Object.keys(summary).length > 0 ? summary : { dataReceived: true };
}

// FIXED: Removed mcp-brightdata from all Phase 1 tasks - only use mcp-perplexity
function selectMCPsForTask(taskType: string, suggestedMCPs: string[]): string[] {
  const taskMCPMapping: Record<string, string[]> = {
    // Phase 1 Research tasks - ONLY Perplexity (no BrightData)
    'market_research': ['mcp-perplexity'],
    'market_analysis': ['mcp-perplexity'],
    'competitor_analysis': ['mcp-perplexity'],
    'trend_analysis': ['mcp-perplexity'],
    'trend_forecast': ['mcp-perplexity'],
    'target_customer': ['mcp-perplexity'],
    'sentiment_analysis': ['mcp-perplexity'],
    'social_sentiment': ['mcp-perplexity'],
    'community_research': ['mcp-perplexity'],
    // Phase 2 Branding tasks
    'brand_strategy': ['mcp-falai', 'mcp-perplexity'],
    'brand_identity': ['mcp-falai'],
    'logo_design': ['mcp-falai'],
    'color_palette': ['mcp-falai'],
    'brand_guidelines': ['mcp-falai', 'mcp-perplexity'],
    'visual_assets': ['mcp-falai'],
    'typography': ['mcp-falai'],
    // Phase 3+ tasks
    'content_creation': ['mcp-perplexity'],
    'social_media': ['mcp-perplexity', 'mcp-linkedin'],
    'lead_generation': ['mcp-linkedin'],
    'sales_outreach': ['mcp-vapi', 'mcp-linkedin'],
    'code_development': ['mcp-github'],
    'website_generation': ['mcp-21st-magic', 'mcp-shadcn'],
    'website': ['mcp-21st-magic', 'mcp-shadcn'],
    'landing_page': ['mcp-21st-magic', 'mcp-shadcn'],
    'ui_component': ['mcp-21st-magic', 'mcp-shadcn'],
    'react_component': ['mcp-21st-magic', 'mcp-shadcn'],
    'report_generation': ['mcp-artifacts'],
    'dashboard_generation': ['mcp-artifacts'],
    'chart_generation': ['mcp-artifacts'],
    'document_generation': ['mcp-artifacts'],
    'presentation_generation': ['mcp-artifacts'],
    'content_strategy': ['mcp-perplexity'],
    'blog_content': ['mcp-perplexity'],
    'social_content': ['mcp-perplexity'],
    'marketing_strategy': ['mcp-perplexity'],
    'ad_campaigns': ['mcp-perplexity'],
    'email_sequences': ['mcp-perplexity'],
    'sales_strategy': ['mcp-perplexity'],
    'sales_scripts': ['mcp-perplexity'],
    'crm_setup': ['mcp-perplexity'],
  };

  return taskMCPMapping[taskType] || suggestedMCPs.slice(0, 1) || ['mcp-perplexity'];
}

async function executeMCPWork(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  params: any
): Promise<any> {
  const { userId, projectId, agentId, mcpServerId, taskType, inputData } = params;

  // Route any lovable-ai-image requests to mcp-falai instead
  if (mcpServerId === 'lovable-ai-image') {
    console.log('[executeMCPWork] Routing lovable-ai-image to mcp-falai:', taskType);
    const response = await fetch(`${supabaseUrl}/functions/v1/mcp-falai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        userId,
        tool: 'generate_logo',
        arguments: {
          brandName: inputData?.projectName || 'Business',
          industry: inputData?.industry || 'general',
          style: 'modern minimalist',
        },
      }),
    });
    if (!response.ok) {
      throw new Error(`Fal AI call failed: ${await response.text()}`);
    }
    return await response.json();
  }

  const brandName = inputData?.projectName || inputData?.deliverableName || 'Business';
  const industry = inputData?.industry || 'general';

  const toolMapping: Record<string, Record<string, { tool: string; args: any }>> = {
    'mcp-perplexity': {
      'market_research': { tool: 'research', args: { query: `${industry} market size growth trends opportunities 2024`, projectName: brandName } },
      'market_analysis': { tool: 'research', args: { query: `${industry} market analysis size growth potential`, projectName: brandName } },
      'competitor_analysis': { tool: 'research', args: { query: `${industry} top competitors market leaders analysis`, projectName: brandName } },
      'trend_analysis': { tool: 'research', args: { query: `${industry} emerging trends future predictions 2024 2025`, projectName: brandName } },
      'trend_forecast': { tool: 'research', args: { query: `${industry} trend forecast future market predictions`, projectName: brandName } },
      'target_customer': { tool: 'research', args: { query: `${industry} target customer demographics psychographics personas`, projectName: brandName } },
      'brand_strategy': { tool: 'research', args: { query: `brand strategy best practices for ${industry}` } },
      'color_palette': { tool: 'research', args: { query: `brand color palette for ${industry}` } },
      'default': { tool: 'research', args: { query: inputData?.query || inputData?.description || `${brandName} ${industry} research` } },
    },
    'mcp-falai': {
      'logo_design': { 
        tool: 'generate_logo', 
        args: { brandName, industry, style: inputData?.style || 'modern minimalist', colors: inputData?.colors } 
      },
      'brand_strategy': { 
        tool: 'generate_brand_assets', 
        args: { type: 'mood_board', brandName, industry, style: inputData?.style } 
      },
      'brand_identity': { 
        tool: 'generate_brand_assets', 
        args: { type: 'mood_board', brandName, industry, style: inputData?.style } 
      },
      'color_palette': { 
        tool: 'generate_brand_assets', 
        args: { type: 'color_palette', brandName, industry, style: inputData?.style } 
      },
      'brand_guidelines': { 
        tool: 'generate_brand_assets', 
        args: { type: 'guidelines', brandName, industry, style: inputData?.style } 
      },
      'visual_assets': { 
        tool: 'generate_brand_assets', 
        args: { type: 'marketing_visuals', brandName, industry, style: inputData?.style, colors: inputData?.colors } 
      },
      'typography': { 
        tool: 'generate_brand_assets', 
        args: { type: 'guidelines', brandName, industry, description: 'Focus on typography and font pairings' } 
      },
      'default': { 
        tool: 'generate_image', 
        args: { prompt: `Professional brand visual for ${brandName} in the ${industry} industry` } 
      },
    },
    'mcp-linkedin': {
      'lead_generation': { tool: 'search_people', args: inputData },
      'company_research': { tool: 'search_companies', args: inputData },
      'default': { tool: 'get_profile', args: {} },
    },
    'mcp-github': {
      'code_development': { tool: 'search_repos', args: { query: inputData?.query } },
      'default': { tool: 'get_user', args: {} },
    },
  };

  const serverTools = toolMapping[mcpServerId] || {};
  const toolConfig = serverTools[taskType] || serverTools['default'] || { tool: 'default', args: {} };

  console.log(`[executeMCPWork] Calling ${mcpServerId} with tool: ${toolConfig.tool}`);

  const response = await fetch(`${supabaseUrl}/functions/v1/mcp-gateway`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      userId,
      projectId,
      agentId,
      mcpServerId,
      tool: toolConfig.tool,
      arguments: toolConfig.args,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MCP Gateway error: ${errorText}`);
  }

  return await response.json();
}

async function generateComprehensiveReport(
  openaiApiKey: string,
  taskType: string,
  workResults: any[],
  inputData: any,
  citations: Citation[]
): Promise<any> {
  const successfulResults = workResults.filter(r => r.success);

  if (successfulResults.length === 0) {
    return { error: 'No successful results to generate report from' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a senior business analyst creating comprehensive deliverable reports with proper citations.
Generate a detailed, professional report. Include citation numbers [1], [2], etc. matching the provided sources.
Format as JSON with: executive_summary, key_findings (array), detailed_analysis, data_statistics, recommendations (array), next_steps (array), cited_sources (array of source IDs used).`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            taskType,
            inputContext: inputData,
            researchResults: successfulResults.map(r => r.data),
            availableCitations: citations.map(c => ({ id: c.id, source: c.source, title: c.title })),
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[generateComprehensiveReport] OpenAI error:', errorText);
    throw new Error('Failed to generate report');
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content || '';

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch {
    return { report: content };
  }
}
