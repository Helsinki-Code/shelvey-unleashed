import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const logStep = (step: string, details?: any) => {
  console.log(`[PHASE-CONSOLIDATED-REPORT] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { phaseId, projectId, userId } = await req.json();

    logStep("Starting consolidated report generation", { phaseId, projectId, userId });

    // Fetch phase details
    const { data: phase, error: phaseError } = await supabase
      .from('business_phases')
      .select('*, teams(*)')
      .eq('id', phaseId)
      .single();

    if (phaseError || !phase) {
      throw new Error('Phase not found');
    }

    // Fetch project details
    const { data: project } = await supabase
      .from('business_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    // Fetch all deliverables with screenshots and citations
    const { data: deliverables } = await supabase
      .from('phase_deliverables')
      .select('*')
      .eq('phase_id', phaseId)
      .order('created_at');

    // Fetch team members
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', phase.team_id);

    // Fetch user's CEO
    const { data: userCeo } = await supabase
      .from('user_ceos')
      .select('*')
      .eq('user_id', userId)
      .single();

    logStep("Collected data", {
      deliverableCount: deliverables?.length,
      teamMemberCount: teamMembers?.length,
      ceoName: userCeo?.ceo_name
    });

    // Compile all screenshots
    const allScreenshots: any[] = [];
    const allCitations: any[] = [];
    const agentWorkSummaries: any[] = [];

    for (const deliverable of deliverables || []) {
      // Collect screenshots
      const screenshots = Array.isArray(deliverable.screenshots) ? deliverable.screenshots : [];
      for (const screenshot of screenshots) {
        allScreenshots.push({
          ...screenshot,
          deliverableName: deliverable.name,
          agentId: deliverable.assigned_agent_id
        });
      }

      // Collect citations
      const citations = Array.isArray(deliverable.citations) ? deliverable.citations : [];
      for (const citation of citations) {
        allCitations.push({
          ...citation,
          deliverableName: deliverable.name
        });
      }

      // Build agent work summary
      const agent = teamMembers?.find(m => m.agent_id === deliverable.assigned_agent_id);
      agentWorkSummaries.push({
        agentId: deliverable.assigned_agent_id,
        agentName: agent?.agent_name || 'Unknown Agent',
        deliverableName: deliverable.name,
        deliverableType: deliverable.deliverable_type,
        status: deliverable.status,
        version: deliverable.version || 1,
        workSteps: deliverable.agent_work_steps || [],
        screenshotCount: screenshots.length,
        citationCount: citations.length,
        generatedContent: deliverable.generated_content
      });
    }

    logStep("Compiled report data", {
      screenshotCount: allScreenshots.length,
      citationCount: allCitations.length,
      agentSummaryCount: agentWorkSummaries.length
    });

    // Generate executive summary using AI
    const summaryPrompt = `You are the Phase Manager for a business building AI platform. 
Generate a professional executive summary for the Phase ${phase.phase_number} (${phase.phase_name}) consolidated report.

Project: ${project?.name}
Industry: ${project?.industry || 'Not specified'}
Description: ${project?.description || 'Not specified'}

Deliverables completed:
${agentWorkSummaries.map(s => `- ${s.deliverableName} (${s.deliverableType}) by ${s.agentName}: ${s.status}`).join('\n')}

Total screenshots captured: ${allScreenshots.length}
Total citations/sources: ${allCitations.length}

Write a concise 3-4 paragraph executive summary highlighting:
1. Key accomplishments of this phase
2. Major findings or deliverables
3. Quality of work and methodology
4. Readiness for next phase

Be professional and specific.`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a professional business report writer." },
          { role: "user", content: summaryPrompt }
        ],
      }),
    });

    let executiveSummary = "Phase completed successfully with all deliverables approved.";
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      executiveSummary = aiData.choices?.[0]?.message?.content || executiveSummary;
    }

    // Build consolidated report object
    const consolidatedReport = {
      phaseNumber: phase.phase_number,
      phaseName: phase.phase_name,
      projectId: projectId,
      projectName: project?.name,
      projectIndustry: project?.industry,
      teamName: phase.teams?.name,
      completedAt: new Date().toISOString(),
      executiveSummary,
      agentWorkSummaries,
      allScreenshots,
      allCitations,
      metrics: {
        totalDeliverables: deliverables?.length || 0,
        totalScreenshots: allScreenshots.length,
        totalCitations: allCitations.length,
        totalAgents: teamMembers?.length || 0,
        phaseDuration: phase.started_at && phase.completed_at 
          ? `${Math.round((new Date(phase.completed_at).getTime() - new Date(phase.started_at).getTime()) / (1000 * 60 * 60))} hours`
          : 'Not tracked'
      }
    };

    logStep("Generated consolidated report", { 
      reportSize: JSON.stringify(consolidatedReport).length 
    });

    // Store the report in agent_messages as a phase manager submission
    await supabase.from('agent_messages').insert({
      user_id: userId,
      from_agent_id: 'phase-manager',
      from_agent_name: 'Phase Manager',
      to_agent_id: 'ceo',
      to_agent_name: userCeo?.ceo_name || 'CEO Agent',
      message_type: 'consolidated_report',
      subject: `Phase ${phase.phase_number} Consolidated Report: ${project?.name}`,
      content: executiveSummary,
      context: consolidatedReport,
      priority: 'high'
    });

    // Log manager activity
    await supabase.from('agent_activity_logs').insert({
      agent_id: 'phase-manager',
      agent_name: `Phase ${phase.phase_number} Manager`,
      action: `Compiled consolidated report for Phase ${phase.phase_number}: ${phase.phase_name}`,
      status: 'completed',
      metadata: { 
        projectId, 
        phaseId, 
        deliverableCount: deliverables?.length,
        screenshotCount: allScreenshots.length
      }
    });

    // CEO automatically reviews and approves the consolidated report
    // Then trigger email to user
    logStep("Triggering CEO review and email to user");

    try {
      await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          userId,
          type: 'consolidated_report',
          data: {
            phaseNumber: phase.phase_number,
            phaseName: phase.phase_name,
            projectName: project?.name,
            ceoName: userCeo?.ceo_name || 'Your CEO',
            executiveSummary,
            deliverableCount: deliverables?.length || 0,
            screenshotCount: allScreenshots.length,
            citationCount: allCitations.length,
            reportData: consolidatedReport
          },
        }),
      });
      logStep("Email notification triggered successfully");
    } catch (emailError) {
      console.error('Failed to send consolidated report email:', emailError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      report: consolidatedReport 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Phase consolidated report error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
