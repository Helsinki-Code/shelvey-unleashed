import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExportOptions {
  format: 'pdf' | 'docx' | 'json' | 'html';
  includeScreenshots: boolean;
  includeCitations: boolean;
  includeAgentActivity: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { deliverableId, options }: { deliverableId: string; options: ExportOptions } = await req.json();

    // Fetch deliverable with all data
    const { data: deliverable, error } = await supabase
      .from('phase_deliverables')
      .select('*, business_phases(*, business_projects(*))')
      .eq('id', deliverableId)
      .single();

    if (error || !deliverable) {
      return new Response(JSON.stringify({ error: "Deliverable not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user owns this deliverable
    if (deliverable.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const project = deliverable.business_phases?.business_projects;
    const phase = deliverable.business_phases;

    // Build report content based on format
    if (options.format === 'json') {
      const jsonReport = {
        meta: {
          exportedAt: new Date().toISOString(),
          deliverableName: deliverable.name,
          projectName: project?.name,
          phase: phase?.phase_name,
          version: deliverable.version || 1,
        },
        content: deliverable.generated_content || deliverable.content,
        citations: options.includeCitations ? deliverable.citations : undefined,
        screenshots: options.includeScreenshots ? deliverable.screenshots : undefined,
        agentWorkSteps: options.includeAgentActivity ? deliverable.agent_work_steps : undefined,
        approval: {
          ceoApproved: deliverable.ceo_approved,
          userApproved: deliverable.user_approved,
          feedback: deliverable.feedback,
        },
      };

      return new Response(JSON.stringify(jsonReport, null, 2), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${deliverable.name.replace(/\s+/g, '_')}_report.json"`,
        },
      });
    }

    // For HTML export, generate formatted HTML
    if (options.format === 'html') {
      const htmlContent = generateHTMLReport(deliverable, project, phase, options);
      
      return new Response(htmlContent, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="${deliverable.name.replace(/\s+/g, '_')}_report.html"`,
        },
      });
    }

    // For PDF/DOCX, use AI to generate formatted content
    const formattedContent = await generateFormattedReport(
      lovableApiKey,
      deliverable,
      project,
      phase,
      options
    );

    return new Response(JSON.stringify({
      success: true,
      format: options.format,
      content: formattedContent,
      downloadReady: true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateHTMLReport(
  deliverable: any,
  project: any,
  phase: any,
  options: ExportOptions
): string {
  const content = deliverable.generated_content || deliverable.content || {};
  const citations = deliverable.citations || [];
  const screenshots = deliverable.screenshots || [];
  const workSteps = deliverable.agent_work_steps || [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${deliverable.name} - ShelVey Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .header { border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #10b981; margin-bottom: 10px; }
    h1 { font-size: 28px; color: #1a1a1a; }
    .meta { color: #666; font-size: 14px; margin-top: 10px; }
    .section { margin-bottom: 30px; }
    .section h2 { font-size: 20px; color: #10b981; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px; margin-bottom: 15px; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
    .citation { color: #10b981; font-weight: 500; cursor: pointer; }
    .citations-list { list-style: none; }
    .citations-list li { padding: 10px 0; border-bottom: 1px solid #eee; }
    .citations-list a { color: #10b981; text-decoration: none; }
    .screenshot { max-width: 100%; border-radius: 8px; margin: 10px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .step { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 15px; margin-bottom: 10px; }
    .step-number { display: inline-block; background: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; margin-right: 10px; }
    .approval { display: flex; gap: 20px; margin-top: 20px; }
    .approval-item { padding: 15px; border-radius: 8px; flex: 1; }
    .approved { background: #d1fae5; color: #065f46; }
    .pending { background: #fef3c7; color: #92400e; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">ShelVey</div>
    <h1>${deliverable.name}</h1>
    <div class="meta">
      <strong>Project:</strong> ${project?.name || 'N/A'} | 
      <strong>Phase:</strong> ${phase?.phase_name || 'N/A'} | 
      <strong>Generated:</strong> ${new Date().toLocaleDateString()}
    </div>
  </div>

  ${content.executive_summary ? `
  <div class="section">
    <h2>Executive Summary</h2>
    <div class="content">${content.executive_summary}</div>
  </div>
  ` : ''}

  ${content.key_findings ? `
  <div class="section">
    <h2>Key Findings</h2>
    <div class="content">
      <ul>
        ${Array.isArray(content.key_findings) ? content.key_findings.map((f: string) => `<li>${f}</li>`).join('') : content.key_findings}
      </ul>
    </div>
  </div>
  ` : ''}

  ${content.detailed_analysis ? `
  <div class="section">
    <h2>Detailed Analysis</h2>
    <div class="content">${typeof content.detailed_analysis === 'string' ? content.detailed_analysis : JSON.stringify(content.detailed_analysis, null, 2)}</div>
  </div>
  ` : ''}

  ${content.recommendations ? `
  <div class="section">
    <h2>Recommendations</h2>
    <div class="content">
      <ul>
        ${Array.isArray(content.recommendations) ? content.recommendations.map((r: string) => `<li>${r}</li>`).join('') : content.recommendations}
      </ul>
    </div>
  </div>
  ` : ''}

  ${options.includeAgentActivity && workSteps.length > 0 ? `
  <div class="section">
    <h2>Agent Work Steps</h2>
    ${workSteps.map((step: any) => `
      <div class="step">
        <span class="step-number">${step.step}</span>
        <strong>${step.action}</strong>
        <p style="margin-top: 8px; color: #666;">${step.reasoning || ''}</p>
        ${step.url ? `<p style="font-size: 12px; color: #999;">URL: ${step.url}</p>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${options.includeScreenshots && screenshots.length > 0 ? `
  <div class="section">
    <h2>Visual Documentation</h2>
    ${screenshots.map((url: string, i: number) => `
      <img src="${url}" alt="Step ${i + 1} Screenshot" class="screenshot" />
    `).join('')}
  </div>
  ` : ''}

  ${options.includeCitations && citations.length > 0 ? `
  <div class="section">
    <h2>Sources & Citations</h2>
    <ul class="citations-list">
      ${citations.map((c: any) => `
        <li>
          <span class="citation">[${c.id}]</span>
          <a href="${c.url}" target="_blank">${c.title || c.source}</a>
          <span style="color: #999; font-size: 12px;"> - ${c.source}</span>
          ${c.quote ? `<p style="font-style: italic; color: #666; margin-top: 5px;">"${c.quote}"</p>` : ''}
        </li>
      `).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="section">
    <h2>Approval Status</h2>
    <div class="approval">
      <div class="approval-item ${deliverable.ceo_approved ? 'approved' : 'pending'}">
        <strong>CEO Review:</strong> ${deliverable.ceo_approved ? '✅ Approved' : '⏳ Pending'}
      </div>
      <div class="approval-item ${deliverable.user_approved ? 'approved' : 'pending'}">
        <strong>User Review:</strong> ${deliverable.user_approved ? '✅ Approved' : '⏳ Pending'}
      </div>
    </div>
    ${deliverable.feedback ? `<div class="content" style="margin-top: 15px;"><strong>Feedback:</strong> ${deliverable.feedback}</div>` : ''}
  </div>

  <div class="footer">
    <p>Generated by ShelVey - The Real Workforce AI</p>
    <p>© ${new Date().getFullYear()} ShelVey, LLC. All rights reserved.</p>
  </div>
</body>
</html>`;
}

async function generateFormattedReport(
  lovableApiKey: string,
  deliverable: any,
  project: any,
  phase: any,
  options: ExportOptions
): Promise<string> {
  const content = deliverable.generated_content || deliverable.content || {};
  
  const prompt = `Format this business report content for ${options.format.toUpperCase()} export:
  
Report: ${deliverable.name}
Project: ${project?.name}
Phase: ${phase?.phase_name}

Content:
${JSON.stringify(content, null, 2)}

${options.includeCitations ? `Citations: ${JSON.stringify(deliverable.citations || [])}` : ''}

Generate a professionally formatted report with proper headings, sections, and formatting suitable for ${options.format} export.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a professional report formatter. Create clean, well-structured reports." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to format report");
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || JSON.stringify(content);
}