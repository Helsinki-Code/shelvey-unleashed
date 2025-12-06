import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agent specializations and suggested MCP servers (agents can use ANY server)
const AGENT_SPECIALIZATIONS: Record<string, { name: string; suggestedMCPs: string[]; capabilities: string[] }> = {
  'market-research': {
    name: 'Market Research Agent',
    suggestedMCPs: ['mcp-perplexity', 'mcp-twitter', 'mcp-linkedin'],
    capabilities: ['market_analysis', 'competitor_research', 'trend_identification'],
  },
  'trend-prediction': {
    name: 'Trend Prediction Agent',
    suggestedMCPs: ['mcp-perplexity', 'mcp-twitter'],
    capabilities: ['trend_forecasting', 'sentiment_analysis', 'market_signals'],
  },
  'brand-identity': {
    name: 'Brand Identity Agent',
    suggestedMCPs: ['mcp-falai', 'mcp-canva'],
    capabilities: ['logo_design', 'brand_guidelines', 'visual_identity'],
  },
  'visual-design': {
    name: 'Visual Design Agent',
    suggestedMCPs: ['mcp-falai', 'mcp-canva'],
    capabilities: ['image_generation', 'graphic_design', 'asset_creation'],
  },
  'content-creator': {
    name: 'Content Creator Agent',
    suggestedMCPs: ['mcp-perplexity', 'mcp-falai'],
    capabilities: ['content_writing', 'blog_posts', 'social_content'],
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

    const { userId, projectId, deliverableId, agentId, taskType, inputData, requestedMCPs } = await req.json();

    console.log(`[agent-work-executor] Starting work for agent ${agentId} on deliverable ${deliverableId}`);

    // Get agent specialization (suggestions only, not restrictions)
    const agentSpec = AGENT_SPECIALIZATIONS[agentId] || {
      name: agentId,
      suggestedMCPs: ['mcp-perplexity'],
      capabilities: ['general'],
    };

    // Determine which MCP servers to use
    // Priority: 1. Explicitly requested, 2. Based on task type, 3. Agent suggestions
    let mcpServersToUse = requestedMCPs || [];
    
    if (mcpServersToUse.length === 0) {
      // Intelligently select MCPs based on task type
      mcpServersToUse = selectMCPsForTask(taskType, agentSpec.suggestedMCPs);
    }

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
      action: `Starting ${taskType} work`,
      status: 'in_progress',
      metadata: { deliverableId, mcpServers: mcpServersToUse, taskType },
    });

    // Execute real work using MCP servers
    const workResults: any[] = [];
    let hasError = false;
    let errorMessage = '';

    for (const mcpServer of mcpServersToUse) {
      try {
        const mcpResult = await executeMCPWork(supabase, supabaseUrl, supabaseServiceKey, {
          userId,
          projectId,
          agentId,
          mcpServerId: mcpServer,
          taskType,
          inputData,
        });

        workResults.push({
          mcpServer,
          success: true,
          data: mcpResult,
        });

        // Send progress update message
        await supabase.from('agent_messages').insert({
          user_id: userId,
          project_id: projectId,
          from_agent_id: agentId,
          from_agent_name: agentSpec.name,
          message_type: 'status_update',
          subject: `Progress: ${mcpServer} work completed`,
          content: `Successfully completed ${taskType} work using ${mcpServer}`,
          context: { mcpServer, taskType },
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
          inputData
        );
      } catch (reportError) {
        console.error('[agent-work-executor] Report generation error:', reportError);
        generatedContent = { rawResults: workResults };
      }
    } else {
      generatedContent = { rawResults: workResults };
    }

    // Update deliverable with generated content
    if (deliverableId) {
      await supabase
        .from('phase_deliverables')
        .update({
          generated_content: generatedContent,
          status: hasError ? 'pending' : 'review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliverableId);
    }

    // Log completion
    await supabase.from('agent_activity_logs').insert({
      agent_id: agentId,
      agent_name: agentSpec.name,
      action: `Completed ${taskType} work`,
      status: hasError ? 'partial' : 'completed',
      metadata: { 
        deliverableId, 
        mcpServersUsed: mcpServersToUse,
        successCount: workResults.filter(r => r.success).length,
        totalCount: workResults.length,
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

function selectMCPsForTask(taskType: string, suggestedMCPs: string[]): string[] {
  // Updated mapping: Use Perplexity for sentiment/social analysis (more reliable than Twitter)
  // Use 21st.dev Magic + shadcn for modern React website generation
  // Use Artifacts MMO for reports/dashboards/presentations
  // Use 'lovable-ai-image' for logo generation (no external API key needed!)
  const taskMCPMapping: Record<string, string[]> = {
    'market_research': ['mcp-perplexity'],
    'market_analysis': ['mcp-perplexity'],
    'competitor_analysis': ['mcp-perplexity'],
    'trend_analysis': ['mcp-perplexity'],
    'trend_forecast': ['mcp-perplexity'],
    'target_customer': ['mcp-perplexity'],
    'sentiment_analysis': ['mcp-perplexity'],
    'social_sentiment': ['mcp-perplexity'],
    'community_research': ['mcp-perplexity'],
    // Branding Phase - use Lovable AI image generation (no FAL_KEY needed!)
    'brand_strategy': ['mcp-perplexity'],
    'brand_identity': ['lovable-ai-image'],
    'logo_design': ['lovable-ai-image'],
    'color_palette': ['mcp-perplexity'],
    'brand_guidelines': ['mcp-perplexity'],
    'visual_assets': ['lovable-ai-image'],
    'content_creation': ['mcp-perplexity'],
    'social_media': ['mcp-perplexity', 'mcp-linkedin'],
    'lead_generation': ['mcp-linkedin'],
    'sales_outreach': ['mcp-vapi', 'mcp-linkedin'],
    'code_development': ['mcp-github'],
    // Modern React website generation with 21st.dev Magic + shadcn
    'website_generation': ['mcp-21st-magic', 'mcp-shadcn'],
    'website': ['mcp-21st-magic', 'mcp-shadcn'],
    'landing_page': ['mcp-21st-magic', 'mcp-shadcn'],
    'ui_component': ['mcp-21st-magic', 'mcp-shadcn'],
    'react_component': ['mcp-21st-magic', 'mcp-shadcn'],
    // Artifacts MMO for reports/dashboards
    'report_generation': ['mcp-artifacts'],
    'dashboard_generation': ['mcp-artifacts'],
    'chart_generation': ['mcp-artifacts'],
    'document_generation': ['mcp-artifacts'],
    'presentation_generation': ['mcp-artifacts'],
    // Content phase
    'content_strategy': ['mcp-perplexity'],
    'blog_content': ['mcp-perplexity'],
    'social_content': ['mcp-perplexity'],
    // Marketing phase
    'marketing_strategy': ['mcp-perplexity'],
    'ad_campaigns': ['mcp-perplexity'],
    'email_sequences': ['mcp-perplexity'],
    // Sales phase
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

  // Handle Lovable AI Image Generation (no external API key needed!)
  if (mcpServerId === 'lovable-ai-image') {
    console.log('[executeMCPWork] Using Lovable AI for image generation:', taskType);
    return await generateImageWithLovableAI(lovableApiKey!, taskType, inputData);
  }

  // Determine the tool to use based on task type and MCP server
  // Perplexity is now the primary source for social sentiment (includes Reddit/Twitter/forum data)
  const toolMapping: Record<string, Record<string, { tool: string; args: any }>> = {
    'mcp-perplexity': {
      'market_research': { tool: 'market_research', args: inputData },
      'market_analysis': { tool: 'market_research', args: inputData },
      'competitor_analysis': { tool: 'competitor_analysis', args: inputData },
      'trend_analysis': { tool: 'trend_analysis', args: inputData },
      'trend_forecast': { tool: 'trend_analysis', args: inputData },
      'target_customer': { tool: 'market_research', args: { ...inputData, focus: 'customer personas' } },
      'brand_strategy': { tool: 'research', args: { query: `brand strategy best practices for ${inputData?.industry || 'business'} ${inputData?.projectName || ''}` } },
      'color_palette': { tool: 'research', args: { query: `brand color palette recommendations for ${inputData?.industry || 'business'} ${inputData?.projectName || ''}` } },
      'brand_guidelines': { tool: 'research', args: { query: `brand guidelines template and best practices for ${inputData?.industry || 'business'}` } },
      'content_strategy': { tool: 'research', args: { query: `content strategy for ${inputData?.industry || 'business'} ${inputData?.projectName || ''}` } },
      'blog_content': { tool: 'research', args: { query: `blog topics for ${inputData?.industry || 'business'} ${inputData?.projectName || ''}` } },
      'social_content': { tool: 'research', args: { query: `social media content ideas for ${inputData?.industry || 'business'}` } },
      'marketing_strategy': { tool: 'research', args: { query: `marketing strategy for ${inputData?.industry || 'business'} startup` } },
      'ad_campaigns': { tool: 'research', args: { query: `ad campaign ideas for ${inputData?.industry || 'business'}` } },
      'email_sequences': { tool: 'research', args: { query: `email marketing sequences for ${inputData?.industry || 'business'}` } },
      'sales_strategy': { tool: 'research', args: { query: `sales strategy for ${inputData?.industry || 'business'} startup` } },
      'sales_scripts': { tool: 'research', args: { query: `sales scripts for ${inputData?.industry || 'business'}` } },
      'crm_setup': { tool: 'research', args: { query: `CRM setup best practices for ${inputData?.industry || 'business'}` } },
      // Social sentiment tools
      'sentiment_analysis': { tool: 'social_sentiment', args: { query: inputData?.query, industry: inputData?.industry, brand: inputData?.brand } },
      'social_sentiment': { tool: 'social_sentiment', args: { query: inputData?.query, industry: inputData?.industry, brand: inputData?.brand } },
      'community_research': { tool: 'community_research', args: { topic: inputData?.topic || inputData?.query, industry: inputData?.industry } },
      'social_trends': { tool: 'social_trends', args: { industry: inputData?.industry, category: inputData?.category } },
      'default': { tool: 'research', args: { query: inputData?.query || inputData?.description || inputData?.projectName } },
    },
    'mcp-twitter': {
      // Twitter still available but gateway will auto-fallback to Perplexity if rate limited
      'trend_analysis': { tool: 'get_trends', args: {} },
      'social_media': { tool: 'search_tweets', args: { query: inputData?.query } },
      'default': { tool: 'analyze_sentiment', args: { query: inputData?.query || inputData?.industry } },
    },
    'mcp-linkedin': {
      'lead_generation': { tool: 'search_people', args: inputData },
      'company_research': { tool: 'search_companies', args: inputData },
      'default': { tool: 'get_profile', args: {} },
    },
    'mcp-falai': {
      'logo_design': { tool: 'generate_logo', args: inputData },
      'brand_identity': { tool: 'generate_logo', args: inputData },
      'default': { tool: 'generate_image', args: { prompt: inputData?.prompt || inputData?.description } },
    },
    'mcp-github': {
      'code_development': { tool: 'search_repos', args: { query: inputData?.query } },
      'default': { tool: 'get_user', args: {} },
    },
    'mcp-vapi': {
      'sales_outreach': { tool: 'get_assistants', args: {} },
      'default': { tool: 'get_assistants', args: {} },
    },
    'mcp-artifacts': {
      'report_generation': { tool: 'generate_report', args: { title: inputData?.title, data: inputData?.data, reportType: inputData?.reportType, sections: inputData?.sections } },
      'dashboard_generation': { tool: 'generate_dashboard', args: { title: inputData?.title, widgets: inputData?.widgets, data: inputData?.data, theme: inputData?.theme } },
      'chart_generation': { tool: 'generate_chart', args: { chartType: inputData?.chartType, data: inputData?.data, title: inputData?.title } },
      'document_generation': { tool: 'generate_document', args: { title: inputData?.title, content: inputData?.content, template: inputData?.template } },
      'presentation_generation': { tool: 'generate_presentation', args: { title: inputData?.title, slides: inputData?.slides, theme: inputData?.theme } },
      'default': { tool: 'generate_report', args: inputData },
    },
    // Modern React website generation with 21st.dev Magic
    'mcp-21st-magic': {
      'website_generation': { tool: 'generate_landing_page', args: { businessName: inputData?.businessName, industry: inputData?.industry, brandColors: inputData?.brandColors, description: inputData?.description, sections: ['hero', 'features', 'pricing', 'testimonials', 'cta', 'footer'] } },
      'landing_page': { tool: 'generate_landing_page', args: { businessName: inputData?.businessName, industry: inputData?.industry, brandColors: inputData?.brandColors, description: inputData?.description, sections: inputData?.sections || ['hero', 'features', 'cta'] } },
      'ui_component': { tool: 'generate_component', args: { description: inputData?.description, framework: 'react', styling: 'tailwind' } },
      'react_component': { tool: 'generate_component', args: { description: inputData?.description, framework: 'react', styling: 'tailwind' } },
      'default': { tool: 'generate_component', args: { description: inputData?.description || 'Create a modern React component' } },
    },
    // shadcn/ui components
    'mcp-shadcn': {
      'website_generation': { tool: 'get_block', args: { name: 'dashboard-01' } },
      'landing_page': { tool: 'list_components', args: { category: 'layout' } },
      'ui_component': { tool: 'get_component', args: { name: inputData?.componentName || 'button' } },
      'react_component': { tool: 'get_component', args: { name: inputData?.componentName || 'card' } },
      'default': { tool: 'list_components', args: {} },
    },
  };

  const serverTools = toolMapping[mcpServerId] || {};
  const toolConfig = serverTools[taskType] || serverTools['default'] || { tool: 'default', args: {} };

  // Call the MCP gateway
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

// Generate images using Lovable AI (no external API key needed!)
async function generateImageWithLovableAI(lovableApiKey: string, taskType: string, inputData: any): Promise<any> {
  console.log('[generateImageWithLovableAI] Generating image for:', taskType, inputData);
  
  let imagePrompt = '';
  
  if (taskType === 'logo_design') {
    imagePrompt = `Create a modern, professional logo for a business called "${inputData?.projectName || 'Business'}". 
Industry: ${inputData?.industry || 'general'}. 
Description: ${inputData?.description || 'A professional business'}. 
Style: Clean, minimalist, memorable, suitable for web and print. 
The logo should be iconic and work well at small sizes.`;
  } else if (taskType === 'brand_identity' || taskType === 'visual_assets') {
    imagePrompt = `Create a brand visual asset for "${inputData?.projectName || 'Business'}". 
Industry: ${inputData?.industry || 'general'}. 
Description: ${inputData?.description || 'A professional business'}.
Style: Modern, cohesive brand imagery.`;
  } else {
    imagePrompt = `Create a professional image for ${inputData?.projectName || 'a business'}. ${inputData?.description || ''}`;
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image-preview',
      messages: [
        { role: 'user', content: imagePrompt }
      ],
      modalities: ['image', 'text'],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[generateImageWithLovableAI] Error:', errorText);
    throw new Error(`Lovable AI image generation failed: ${errorText}`);
  }

  const result = await response.json();
  const message = result.choices?.[0]?.message;
  const images = message?.images || [];
  const textContent = message?.content || '';

  console.log('[generateImageWithLovableAI] Generated', images.length, 'images');

  return {
    success: true,
    taskType,
    generatedImages: images.map((img: any, idx: number) => ({
      id: `logo-${idx + 1}`,
      url: img.image_url?.url || img.url,
      type: taskType,
    })),
    description: textContent,
    metadata: {
      prompt: imagePrompt,
      model: 'google/gemini-2.5-flash-image-preview',
      generatedAt: new Date().toISOString(),
    },
  };
}

async function generateComprehensiveReport(
  lovableApiKey: string,
  taskType: string,
  workResults: any[],
  inputData: any
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
          content: `You are a senior business analyst creating comprehensive deliverable reports. 
Generate a detailed, professional report based on the research data provided.
The report should include:
1. Executive Summary
2. Key Findings
3. Detailed Analysis
4. Data and Statistics
5. Recommendations
6. Next Steps

Format as JSON with these sections as keys.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            taskType,
            inputContext: inputData,
            researchResults: successfulResults.map(r => r.data),
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
    return JSON.parse(content);
  } catch {
    return { report: content };
  }
}
