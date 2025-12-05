import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Artifacts MMO API endpoint
const ARTIFACTS_API_URL = 'https://api.makemyown.dev';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, arguments: args, credentials } = await req.json();

    const apiToken = credentials?.ARTIFACTS_MMO_TOKEN;
    if (!apiToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'ARTIFACTS_MMO_TOKEN not provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[mcp-artifacts] Executing tool: ${tool}`);

    let result;

    switch (tool) {
      case 'generate_website':
        result = await generateWebsite(apiToken, args);
        break;
      case 'generate_report':
        result = await generateReport(apiToken, args);
        break;
      case 'generate_chart':
        result = await generateChart(apiToken, args);
        break;
      case 'generate_dashboard':
        result = await generateDashboard(apiToken, args);
        break;
      case 'generate_document':
        result = await generateDocument(apiToken, args);
        break;
      case 'generate_presentation':
        result = await generatePresentation(apiToken, args);
        break;
      case 'render_html':
        result = await renderHTML(apiToken, args);
        break;
      case 'export_artifact':
        result = await exportArtifact(apiToken, args);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown tool: ${tool}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`[mcp-artifacts] Tool ${tool} completed successfully`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-artifacts] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function callArtifactsAPI(apiToken: string, endpoint: string, payload: any) {
  const response = await fetch(`${ARTIFACTS_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Artifacts API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Generate a complete website artifact
async function generateWebsite(apiToken: string, args: any) {
  const { businessName, industry, brandColors, description, pages, branding } = args;
  
  const payload = {
    type: 'website',
    config: {
      businessName,
      industry,
      description,
      brandColors: brandColors || { primary: '#2D5A27', secondary: '#1a1a2e' },
      pages: pages || ['home', 'about', 'contact'],
      branding: branding || {},
      responsive: true,
      seo: true,
    },
  };

  const result = await callArtifactsAPI(apiToken, '/artifacts/generate', payload);
  
  return {
    websiteId: result.id,
    htmlContent: result.html,
    cssContent: result.css,
    jsContent: result.js,
    previewUrl: result.previewUrl,
    metadata: result.metadata,
    artifactType: 'website',
  };
}

// Generate a report artifact
async function generateReport(apiToken: string, args: any) {
  const { title, data, reportType, sections, format } = args;
  
  const payload = {
    type: 'report',
    config: {
      title,
      data,
      reportType: reportType || 'business',
      sections: sections || ['executive_summary', 'key_findings', 'analysis', 'recommendations'],
      format: format || 'html',
      includeCharts: true,
      includeTables: true,
    },
  };

  const result = await callArtifactsAPI(apiToken, '/artifacts/generate', payload);
  
  return {
    reportId: result.id,
    content: result.content,
    htmlContent: result.html,
    charts: result.charts || [],
    tables: result.tables || [],
    previewUrl: result.previewUrl,
    artifactType: 'report',
  };
}

// Generate a chart artifact
async function generateChart(apiToken: string, args: any) {
  const { chartType, data, title, options } = args;
  
  const payload = {
    type: 'chart',
    config: {
      chartType: chartType || 'bar',
      data,
      title,
      options: options || {},
      responsive: true,
      animated: true,
    },
  };

  const result = await callArtifactsAPI(apiToken, '/artifacts/generate', payload);
  
  return {
    chartId: result.id,
    svgContent: result.svg,
    imageUrl: result.imageUrl,
    embedCode: result.embedCode,
    artifactType: 'chart',
  };
}

// Generate a dashboard artifact
async function generateDashboard(apiToken: string, args: any) {
  const { title, widgets, layout, data, theme } = args;
  
  const payload = {
    type: 'dashboard',
    config: {
      title,
      widgets: widgets || ['metrics', 'chart', 'table', 'activity'],
      layout: layout || 'grid',
      data,
      theme: theme || 'dark',
      interactive: true,
      realtime: false,
    },
  };

  const result = await callArtifactsAPI(apiToken, '/artifacts/generate', payload);
  
  return {
    dashboardId: result.id,
    htmlContent: result.html,
    cssContent: result.css,
    jsContent: result.js,
    previewUrl: result.previewUrl,
    widgets: result.widgets,
    artifactType: 'dashboard',
  };
}

// Generate a document artifact (PDF-ready)
async function generateDocument(apiToken: string, args: any) {
  const { title, content, template, sections, format } = args;
  
  const payload = {
    type: 'document',
    config: {
      title,
      content,
      template: template || 'professional',
      sections,
      format: format || 'html',
      pdfReady: true,
      includeTOC: true,
    },
  };

  const result = await callArtifactsAPI(apiToken, '/artifacts/generate', payload);
  
  return {
    documentId: result.id,
    htmlContent: result.html,
    pdfUrl: result.pdfUrl,
    downloadUrl: result.downloadUrl,
    artifactType: 'document',
  };
}

// Generate a presentation artifact
async function generatePresentation(apiToken: string, args: any) {
  const { title, slides, theme, template } = args;
  
  const payload = {
    type: 'presentation',
    config: {
      title,
      slides,
      theme: theme || 'modern',
      template: template || 'business',
      animated: true,
      aspectRatio: '16:9',
    },
  };

  const result = await callArtifactsAPI(apiToken, '/artifacts/generate', payload);
  
  return {
    presentationId: result.id,
    htmlContent: result.html,
    slides: result.slides,
    previewUrl: result.previewUrl,
    downloadUrl: result.downloadUrl,
    artifactType: 'presentation',
  };
}

// Render custom HTML with styling
async function renderHTML(apiToken: string, args: any) {
  const { html, css, js, title } = args;
  
  const payload = {
    type: 'custom',
    config: {
      html,
      css,
      js,
      title,
      sandbox: true,
    },
  };

  const result = await callArtifactsAPI(apiToken, '/artifacts/render', payload);
  
  return {
    artifactId: result.id,
    previewUrl: result.previewUrl,
    embedCode: result.embedCode,
    artifactType: 'custom',
  };
}

// Export an artifact to various formats
async function exportArtifact(apiToken: string, args: any) {
  const { artifactId, format, options } = args;
  
  const payload = {
    artifactId,
    format: format || 'html',
    options: options || {},
  };

  const result = await callArtifactsAPI(apiToken, '/artifacts/export', payload);
  
  return {
    downloadUrl: result.downloadUrl,
    format: result.format,
    fileSize: result.fileSize,
    expiresAt: result.expiresAt,
  };
}
