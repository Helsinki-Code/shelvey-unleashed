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

// Agent specializations and suggested MCP servers (agents can use ANY server)
const AGENT_SPECIALIZATIONS: Record<string, { name: string; suggestedMCPs: string[]; capabilities: string[] }> = {
  'market-research': {
    name: 'Market Research Agent',
    suggestedMCPs: ['mcp-perplexity', 'mcp-brightdata'],
    capabilities: ['market_analysis', 'competitor_research', 'trend_identification'],
  },
  'trend-prediction': {
    name: 'Trend Prediction Agent',
    suggestedMCPs: ['mcp-perplexity', 'mcp-brightdata'],
    capabilities: ['trend_forecasting', 'sentiment_analysis', 'market_signals'],
  },
  'brand-identity': {
    name: 'Brand Identity Agent',
    suggestedMCPs: ['lovable-ai-image', 'mcp-perplexity'],
    capabilities: ['logo_design', 'brand_guidelines', 'visual_identity'],
  },
  'visual-design': {
    name: 'Visual Design Agent',
    suggestedMCPs: ['lovable-ai-image', 'mcp-perplexity'],
    capabilities: ['image_generation', 'graphic_design', 'asset_creation'],
  },
  'content-creator': {
    name: 'Content Creator Agent',
    suggestedMCPs: ['mcp-perplexity', 'lovable-ai-image'],
    capabilities: ['content_writing', 'blog_posts', 'social_content', 'typography_selection'],
  },
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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, projectId, deliverableId, agentId, taskType, inputData, requestedMCPs, useComputerUse } = await req.json();

    console.log(`[agent-work-executor] Starting work for agent ${agentId} on deliverable ${deliverableId}`);

    // Get agent specialization
    const agentSpec = AGENT_SPECIALIZATIONS[agentId] || {
      name: agentId,
      suggestedMCPs: ['mcp-perplexity'],
      capabilities: ['general'],
    };

    // Determine which MCP servers to use
    let mcpServersToUse = requestedMCPs || [];
    if (mcpServersToUse.length === 0) {
      mcpServersToUse = selectMCPsForTask(taskType, agentSpec.suggestedMCPs);
    }

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

    // Log activity start
    await supabase.from('agent_activity_logs').insert({
      agent_id: agentId,
      agent_name: agentSpec.name,
      action: `Starting ${taskType} work with visual documentation`,
      status: 'in_progress',
      metadata: { deliverableId, mcpServers: mcpServersToUse, taskType, useComputerUse },
    });

    // Step 1: Start Computer Use session for browser research if applicable
    let computerUseSession: any = null;
    if (useComputerUse !== false && ['market_research', 'market_analysis', 'competitor_analysis', 'trend_analysis'].includes(taskType)) {
      try {
        workSteps.push({
          step: workSteps.length + 1,
          action: 'Initializing browser session for research',
          timestamp: new Date().toISOString(),
          reasoning: 'Starting Computer Use session to capture visual proof of research',
        });

        const sessionResponse = await fetch(`${supabaseUrl}/functions/v1/computer-use-agent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            action: 'start_session',
            task: {
              taskId: deliverableId,
              userId,
              agentId,
              objective: `Research: ${taskType} for ${inputData?.projectName || 'project'}`,
              startUrl: 'https://www.google.com',
              maxSteps: 10,
            },
          }),
        });

        if (sessionResponse.ok) {
          computerUseSession = await sessionResponse.json();
          console.log('[agent-work-executor] Computer Use session started:', computerUseSession.sessionId);
        }
      } catch (e) {
        console.log('[agent-work-executor] Computer Use not available, continuing without:', e);
      }
    }

    // Execute real work using MCP servers
    const workResults: any[] = [];
    let hasError = false;
    let errorMessage = '';

    for (const mcpServer of mcpServersToUse) {
      try {
        // Log step start
        const stepNumber = workSteps.length + 1;
        workSteps.push({
          step: stepNumber,
          action: `Executing ${taskType} via ${mcpServer}`,
          timestamp: new Date().toISOString(),
          reasoning: `Using ${mcpServer} to gather ${taskType} data`,
        });

        // Update activity in real-time
        await supabase.from('agent_activity_logs').insert({
          agent_id: agentId,
          agent_name: agentSpec.name,
          action: `Querying ${mcpServer} for ${taskType}`,
          status: 'in_progress',
          metadata: { step: stepNumber, mcpServer, deliverableId },
        });

        // Take screenshot if Computer Use is active
        if (computerUseSession?.sessionId) {
          try {
            const screenshotResponse = await fetch(`${supabaseUrl}/functions/v1/computer-use-agent`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                action: 'execute_step',
                sessionId: computerUseSession.sessionId,
                step: { type: 'screenshot' },
              }),
            });

            if (screenshotResponse.ok) {
              const ssResult = await screenshotResponse.json();
              if (ssResult.screenshot) {
                screenshots.push(ssResult.screenshot);
                workSteps[stepNumber - 1].screenshot = ssResult.screenshot;
              }
            }
          } catch (e) {
            console.log('[agent-work-executor] Screenshot failed:', e);
          }
        }

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

        // Send progress update message
        await supabase.from('agent_messages').insert({
          user_id: userId,
          project_id: projectId,
          from_agent_id: agentId,
          from_agent_name: agentSpec.name,
          message_type: 'status_update',
          subject: `Progress: ${mcpServer} work completed`,
          content: `Successfully completed ${taskType} work using ${mcpServer}. Found ${resultCitations.length} sources.`,
          context: { mcpServer, taskType, citationsCount: resultCitations.length },
          priority: 'normal',
        });

      } catch (mcpError) {
        const errMsg = mcpError instanceof Error ? mcpError.message : String(mcpError);
        console.error(`[agent-work-executor] MCP ${mcpServer} error:`, mcpError);
        workResults.push({
          mcpServer,
          success: false,
          error: errMsg,
        });
        hasError = true;
        errorMessage = errMsg;
      }
    }

    // Generate comprehensive report from work results
    let generatedContent = {};
    
    if (lovableApiKey && workResults.some(r => r.success)) {
      try {
        generatedContent = await generateComprehensiveReport(
          lovableApiKey,
          taskType,
          workResults,
          inputData,
          allCitations
        );
      } catch (reportError) {
        console.error('[agent-work-executor] Report generation error:', reportError);
        generatedContent = { rawResults: workResults };
      }
    } else {
      generatedContent = { rawResults: workResults };
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

    // Update deliverable with generated content, screenshots, citations
    if (deliverableId) {
      await supabase
        .from('phase_deliverables')
        .update({
          generated_content: generatedContent,
          screenshots: storedScreenshots,
          agent_work_steps: workSteps,
          citations: allCitations,
          status: hasError ? 'pending' : 'review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliverableId);
    }

    // Log completion
    await supabase.from('agent_activity_logs').insert({
      agent_id: agentId,
      agent_name: agentSpec.name,
      action: `Completed ${taskType} work with ${workSteps.length} steps and ${allCitations.length} citations`,
      status: hasError ? 'partial' : 'completed',
      metadata: { 
        deliverableId, 
        mcpServersUsed: mcpServersToUse,
        successCount: workResults.filter(r => r.success).length,
        totalCount: workResults.length,
        stepsCount: workSteps.length,
        citationsCount: allCitations.length,
        screenshotsCount: storedScreenshots.length,
      },
    });

    // If there was an error, consider escalating
    if (hasError) {
      await supabase.functions.invoke('escalation-handler', {
        body: {
          action: 'create_escalation',
          userId,
          projectId,
          agentId,
          agentName: agentSpec.name,
          issueType: 'technical_issue',
          issueDescription: `Work execution partially failed: ${errorMessage}`,
          context: { taskType, failedMCPs: workResults.filter(r => !r.success) },
          deliverableId,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: !hasError,
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
          hasError,
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
      citations.push({
        id: id++,
        source: new URL(page.url).hostname.replace('www.', ''),
        url: page.url,
        title: page.title || page.name,
        accessedAt: new Date().toISOString(),
        quote: page.snippet,
      });
    }
  }

  return citations;
}

function summarizeData(mcpResult: any): any {
  if (!mcpResult) return null;
  
  // Create a summary of the data extracted
  const summary: any = {};
  
  if (mcpResult.marketSize) summary.marketSize = mcpResult.marketSize;
  if (mcpResult.competitors) summary.competitorCount = mcpResult.competitors.length;
  if (mcpResult.trends) summary.trendCount = mcpResult.trends.length;
  if (mcpResult.insights) summary.insightCount = mcpResult.insights.length;
  if (mcpResult.keyFindings) summary.keyFindings = mcpResult.keyFindings;
  
  return Object.keys(summary).length > 0 ? summary : { dataReceived: true };
}

function selectMCPsForTask(taskType: string, suggestedMCPs: string[]): string[] {
  const taskMCPMapping: Record<string, string[]> = {
    'market_research': ['mcp-perplexity', 'mcp-brightdata'],
    'market_analysis': ['mcp-perplexity', 'mcp-brightdata'],
    'competitor_analysis': ['mcp-perplexity', 'mcp-brightdata'],
    'trend_analysis': ['mcp-perplexity'],
    'trend_forecast': ['mcp-perplexity'],
    'target_customer': ['mcp-perplexity'],
    'sentiment_analysis': ['mcp-perplexity'],
    'social_sentiment': ['mcp-perplexity'],
    'community_research': ['mcp-perplexity'],
    'brand_strategy': ['lovable-ai-image', 'mcp-perplexity'],
    'brand_identity': ['lovable-ai-image'],
    'logo_design': ['lovable-ai-image'],
    'color_palette': ['lovable-ai-image'],
    'brand_guidelines': ['lovable-ai-image', 'mcp-perplexity'],
    'visual_assets': ['lovable-ai-image'],
    'typography': ['lovable-ai-image'],
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

  return taskMCPMapping[taskType] || suggestedMCPs.slice(0, 2);
}

async function executeMCPWork(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  params: any
): Promise<any> {
  const { userId, projectId, agentId, mcpServerId, taskType, inputData } = params;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

  // Handle Lovable AI Image Generation
  if (mcpServerId === 'lovable-ai-image') {
    console.log('[executeMCPWork] Using Lovable AI for image generation:', taskType);
    return await generateImageWithLovableAI(lovableApiKey!, taskType, inputData);
  }

  const toolMapping: Record<string, Record<string, { tool: string; args: any }>> = {
    'mcp-perplexity': {
      'market_research': { tool: 'market_research', args: inputData },
      'market_analysis': { tool: 'market_research', args: inputData },
      'competitor_analysis': { tool: 'competitor_analysis', args: inputData },
      'trend_analysis': { tool: 'trend_analysis', args: inputData },
      'trend_forecast': { tool: 'trend_analysis', args: inputData },
      'target_customer': { tool: 'market_research', args: { ...inputData, focus: 'customer personas' } },
      'brand_strategy': { tool: 'research', args: { query: `brand strategy best practices for ${inputData?.industry || 'business'}` } },
      'color_palette': { tool: 'research', args: { query: `brand color palette for ${inputData?.industry || 'business'}` } },
      'default': { tool: 'research', args: { query: inputData?.query || inputData?.description || inputData?.projectName } },
    },
    'mcp-brightdata': {
      'market_research': { tool: 'scrape_search', args: { query: `${inputData?.industry} market size trends 2024` } },
      'competitor_analysis': { tool: 'scrape_search', args: { query: `${inputData?.industry} competitors top companies` } },
      'default': { tool: 'scrape_search', args: { query: inputData?.query || inputData?.industry } },
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

async function generateImageWithLovableAI(lovableApiKey: string, taskType: string, inputData: any): Promise<any> {
  let imagePrompt = '';
  const businessName = inputData?.projectName || inputData?.deliverableName || 'Business';
  const industry = inputData?.industry || 'general';
  
  // Create specialized prompts for different brand asset types
  switch (taskType) {
    case 'logo_design':
      imagePrompt = `Create a modern, professional, high-quality business logo for "${businessName}". Industry: ${industry}. Style: Clean, minimalist, memorable, scalable. The logo should be on a clean white background, suitable for business cards, websites, and marketing materials.`;
      break;
    case 'brand_strategy':
      imagePrompt = `Create a professional brand mood board visual for "${businessName}" in the ${industry} industry. Include visual elements representing: brand values, target audience aesthetics, competitor positioning, and brand personality. Modern, professional business style.`;
      break;
    case 'color_palette':
      imagePrompt = `Create a professional brand color palette visualization for "${businessName}" in the ${industry} industry. Show 5 harmonious colors as large color swatches with hex codes. Include primary, secondary, and accent colors that convey professionalism and trust.`;
      break;
    case 'brand_guidelines':
      imagePrompt = `Create a professional brand guidelines preview page for "${businessName}". Show logo placement rules, color usage examples, typography samples, and spacing guidelines. Clean, modern corporate design style.`;
      break;
    case 'visual_assets':
      imagePrompt = `Create a set of professional marketing visual assets for "${businessName}" in the ${industry} industry. Include social media banner concepts, business card design, and website hero image. Modern, cohesive brand style.`;
      break;
    case 'typography':
      imagePrompt = `Create a professional typography specimen sheet for "${businessName}" brand. Show heading and body font pairings, size hierarchy, and text styling examples. Clean, modern corporate design.`;
      break;
    default:
      imagePrompt = `Create a professional brand visual for "${businessName}" in the ${industry} industry. ${inputData?.description || 'Modern, clean, professional business style.'}`;
  }

  console.log('[generateImageWithLovableAI] Generating image for:', taskType, 'Prompt:', imagePrompt.substring(0, 100));

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image-preview',
      messages: [{ role: 'user', content: imagePrompt }],
      modalities: ['image', 'text'],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[generateImageWithLovableAI] Error:', response.status, errorText);
    throw new Error(`Lovable AI image generation failed: ${response.status}`);
  }

  const result = await response.json();
  const message = result.choices?.[0]?.message;

  console.log('[generateImageWithLovableAI] Generated', message?.images?.length || 0, 'images');

  return {
    success: true,
    taskType,
    assetType: taskType,
    generatedImages: (message?.images || []).map((img: any, idx: number) => ({
      id: `${taskType}-${idx + 1}`,
      url: img.image_url?.url || img.url,
      type: taskType,
    })),
    description: message?.content || '',
    brandName: businessName,
    industry: industry,
  };
}

async function generateComprehensiveReport(
  lovableApiKey: string,
  taskType: string,
  workResults: any[],
  inputData: any,
  citations: Citation[]
): Promise<any> {
  const successfulResults = workResults.filter(r => r.success);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
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