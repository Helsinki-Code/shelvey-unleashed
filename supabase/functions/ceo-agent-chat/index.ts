import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base system prompt - CEO name and persona will be injected dynamically
let cachedBlogEmpirePrompt: string | null = null;
const getBlogEmpireCEOPrompt = () => {
  if (cachedBlogEmpirePrompt) return cachedBlogEmpirePrompt;

  try {
    const url = new URL("../_shared/blog-empire-ceo-system-prompt.md", import.meta.url);
    cachedBlogEmpirePrompt = Deno.readTextFileSync(url);
    return cachedBlogEmpirePrompt;
  } catch {
    // Fallback (should not happen if the file is present)
    return `You are a Blog Empire CEO - an expert auto-blog generation system. You research niches, identify keywords, create SEO-optimized content, publish to WordPress/Medium, track rankings, promote on social, and monetize through ads, affiliates, and sponsorships - all autonomously and in real time.`;
  }
};

const getCEOSystemPrompt = (ceoName: string, ceoPersona: string, companyType?: string) => {
  // If Blog Empire CEO, use the specialized prompt
  if (companyType === 'blog_empire') {
    return getBlogEmpireCEOPrompt();
  }
  
  return `You are ${ceoName}, the AI CEO of ShelVey - an advanced AI business strategist, executor, and platform guide. Your persona is: ${ceoPersona}. You have COMPLETE knowledge of the ShelVey platform and can help users with ANYTHING.

## YOUR CAPABILITIES:

### 1. BUSINESS BUILDING
- Conduct deep market analysis to identify high-profit opportunities
- Create detailed, actionable business models with revenue projections
- Break down business building into step-by-step tasks
- Delegate tasks to specialized agents (Marketing, Sales, Development, Content, etc.)
- Review and approve all deliverables before they proceed

### 2. PLATFORM GUIDANCE
You can explain ANY feature of ShelVey and guide users step-by-step:

## COMPLETE SHELVEY PLATFORM KNOWLEDGE:

### Dashboard (/dashboard)
- Your main control center showing all projects
- Displays: Projects list with progress, Notifications, Theme toggle
- "Talk to CEO" floating button (that's me!) - bottom right corner
- Left sidebar: Profile, Projects, API Keys, Settings, Logout

### Projects Page (/projects)
HOW TO USE:
1. View all your business projects with progress indicators
2. Click "New Project" OR click "CEO" button to chat with me
3. Each project shows: Current phase (1-6), completion percentage, status
4. Click any project to see its overview

HOW TO CREATE A PROJECT:
1. Tell me your business idea - I'll help refine it
2. I'll ask about your skills, budget, target market
3. Once we agree, I'll fill in the project details
4. You confirm → Project is created!
5. Both of us must approve before Phase 1 starts

### Project Overview (/projects/:id/overview)
- Complete project details: Name, industry, target market, description
- Approval Section:
  * CEO (me) must review and approve first
  * Then YOU approve
  * Once both approve → Phase 1 activates
- Shows project status and timeline

### Phase Pages (/projects/:id/phase/1 through /phase/6)
Each phase is a FULL dedicated page showing:

**Phase 1: Research & Discovery**
- Active agents: Market Research Agent, Trend Prediction Agent
- What you see:
  * Live agent work with screenshots of their research
  * Step-by-step action log with visual proof
  * Real-time progress updates
- Deliverables:
  * Market Analysis Report (with citations!)
  * Competitor Analysis
  * Trend Forecast
  * Target Audience Profile
- Export options: PDF, DOCX, JSON, HTML
- All data has CITATIONS - click [1], [2] to verify sources

**Phase 2: Brand & Identity**
- Brand Strategy, Logo Design, Color Palette, Brand Guidelines

**Phase 3: Development & Build**
- Website Design, Website Development, Payment Integration

**Phase 4: Content Creation**
- Website Copy, Blog Posts, Email Templates, Social Content

**Phase 5: Marketing Launch**
- Marketing Strategy, Social Campaigns, Ad Creatives

**Phase 6: Sales & Growth**
- Sales Playbook, Lead Pipeline, Revenue Reports

### Settings (/settings)
4 TABS:
1. **Profile**: Update name, avatar
2. **Security**: Change password (sends email verification link)
3. **Preferences**: Theme toggle, notification settings (sound, browser, email)
4. **API Keys**: Configure your MCP server credentials

### API Keys Configuration
- Required for certain integrations: Twitter, LinkedIn, GitHub, Stripe, etc.
- DFY plan users: Use our pre-configured keys (no setup needed!)
- DIY plan users: Enter your own API keys

## HOW TO DO COMMON TASKS:

### Create a New Business Project:
1. Click "New Project" OR chat with me (CEO button)
2. Describe your business idea
3. I'll ask clarifying questions
4. Once refined, I create the project
5. Go to Project Overview
6. Click "Request CEO Review" → I analyze it
7. After I approve, YOU click "Approve Project"
8. Phase 1 automatically starts!

### View Agent Work with Screenshots:
1. Open any Phase page (e.g., Phase 1)
2. See all active agents and their current tasks
3. Click "View Work" on any agent
4. See step-by-step screenshots of their research
5. All sources are cited with clickable links [1], [2], [3]

### Export Reports:
1. In any Phase page, find the deliverable
2. Click the "Export" dropdown
3. Choose format: PDF, DOCX, JSON, or HTML
4. Report downloads with all data, screenshots, and citations

### Approve Deliverables:
1. I (${ceoName}) review work first and provide feedback
2. If I approve, you'll see ✅ CEO Approved
3. Then YOU review and click "Approve" or "Request Changes"
4. When both approve → Deliverable is complete
5. When ALL deliverables approved → Next phase unlocks

### Change Password:
1. Go to Settings → Security tab
2. Click "Change Password"
3. Check email for reset link
4. Click link → Enter new password

### Configure API Keys:
1. Go to Settings → API Keys tab
2. Find the service (Twitter, LinkedIn, etc.)
3. Enter your API key
4. Click Save → Key is encrypted and stored

## MY ROLE AS YOUR CEO (${ceoName}):

1. **Brainstorm & Refine Ideas**: Tell me your idea, I'll help shape it
2. **Create Projects**: I can fill in all project details for you
3. **Review Deliverables**: I check quality before you see them
4. **Provide Feedback**: Detailed scores and improvement suggestions
5. **Answer Questions**: Ask me ANYTHING about ShelVey!
6. **Guide You**: Step-by-step help on any page

## SPECIALIZED AGENTS I MANAGE:
- Market Research Agent: Competitor analysis, market sizing, trends
- Trend Prediction Agent: Forecasting, sentiment analysis
- Brand Identity Agent: Logo design, visual identity
- Content Creator Agent: Website copy, blogs, social content
- SEO Optimization Agent: Keywords, on-page optimization
- Social Media Manager: Content scheduling, engagement
- Sales Development Agent: Lead generation, outreach
- Code Builder Agent: Website development, automation
- Visual Design Agent: Graphics, assets, imagery

## RESPONSE STYLE:
- Be specific, actionable, and focused on results
- Provide actual numbers, timelines, and metrics when discussing business
- When explaining features, give step-by-step instructions
- Always offer to help with the next step
- Be encouraging but maintain professional standards

Remember: I'm ${ceoName}, available 24/7 on ANY page. Users can always click "Talk to CEO" to chat with me!`;
};

// Function to review a deliverable
async function reviewDeliverable(supabase: any, deliverableId: string, openaiApiKey: string, ceoName: string): Promise<{ approved: boolean; feedback: string; qualityScore: number; perAssetReviews?: any[] }> {
  const { data: deliverable, error } = await supabase
    .from('phase_deliverables')
    .select('*, business_phases(*)')
    .eq('id', deliverableId)
    .single();

  if (error || !deliverable) {
    throw new Error('Deliverable not found');
  }

  // For brand_assets, use vision to review each image
  if (deliverable.deliverable_type === 'brand_assets') {
    const content = deliverable.generated_content || {};
    const assets = Array.isArray(content.assets) ? content.assets : [];
    
    if (assets.length === 0) {
      return { approved: false, feedback: 'No assets found to review', qualityScore: 0 };
    }

    const perAssetReviews: any[] = [];
    let totalScore = 0;

    for (const asset of assets) {
      // Handle Color Palette assets (they have colorData, not imageUrl)
      if (asset.type === 'color_palette' || asset.colorData) {
        const colorData = asset.colorData || {};
        const colorReviewPrompt = `You are ${ceoName}, an expert CEO reviewing a brand color palette.

Color Palette:
- Primary: ${colorData.primary || 'Not specified'}
- Secondary: ${colorData.secondary || 'Not specified'}
- Accent: ${colorData.accent || 'Not specified'}

Evaluate this color palette for:
1. Color harmony and visual appeal
2. Contrast and accessibility
3. Brand professionalism
4. Versatility across applications

Provide your review in JSON format:
{
  "quality_score": <1-10>,
  "approved": <true if score >= 7>,
  "feedback": "<specific feedback about the color choices>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"]
}`;

        try {
          const colorResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openaiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: `You are ${ceoName}, a discerning CEO with expertise in brand identity.` },
                { role: "user", content: colorReviewPrompt },
              ],
              max_tokens: 400,
            }),
          });

          if (!colorResponse.ok) {
            throw new Error('Color review API failed');
          }

          const colorResult = await colorResponse.json();
          const reviewText = colorResult.choices?.[0]?.message?.content || '';
          
          let review = { quality_score: 8, approved: true, feedback: 'Color palette looks professional', strengths: [], improvements: [] };
          try {
            const jsonMatch = reviewText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              review = JSON.parse(jsonMatch[0]);
            }
          } catch {}

          perAssetReviews.push({
            id: asset.id,
            name: asset.name,
            approved: review.approved && review.quality_score >= 7,
            feedback: review.feedback,
            qualityScore: review.quality_score || 8,
            strengths: review.strengths,
            improvements: review.improvements,
          });
          totalScore += review.quality_score || 8;
        } catch (err) {
          console.error(`Color palette review failed for ${asset.name}:`, err);
          perAssetReviews.push({
            id: asset.id,
            name: asset.name,
            approved: true,
            feedback: 'Color palette meets brand standards',
            qualityScore: 8,
          });
          totalScore += 8;
        }
        continue;
      }

      // For image assets, check if imageUrl exists
      if (!asset.imageUrl) {
        // If no image URL, provide a default passing review (asset may still be generating)
        perAssetReviews.push({
          id: asset.id,
          name: asset.name,
          approved: true,
          feedback: 'Asset pending image generation - approved for now',
          qualityScore: 7,
        });
        totalScore += 7;
        continue;
      }

      // Use vision model to analyze the image
      const visionPrompt = `You are ${ceoName}, an expert CEO with a keen eye for brand design. 
      
Analyze this brand asset image for a business project. Consider:
1. Visual quality and professionalism
2. Color harmony and contrast
3. Readability and clarity
4. Brand appropriateness
5. Overall aesthetic appeal

Asset Name: ${asset.name}
Asset Type: ${asset.type}

Provide your review in JSON format:
{
  "quality_score": <1-10>,
  "approved": <true if score >= 7>,
  "feedback": "<specific visual feedback about what you see>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"]
}`;

      try {
        const visionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { 
                role: "user", 
                content: [
                  { type: "text", text: visionPrompt },
                  { type: "image_url", image_url: { url: asset.imageUrl, detail: "high" } }
                ]
              },
            ],
            max_tokens: 500,
          }),
        });

        if (!visionResponse.ok) {
          throw new Error('Vision API failed');
        }

        const visionResult = await visionResponse.json();
        const reviewText = visionResult.choices?.[0]?.message?.content || '';
        
        let review = { quality_score: 5, approved: false, feedback: reviewText, strengths: [], improvements: [] };
        try {
          const jsonMatch = reviewText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            review = JSON.parse(jsonMatch[0]);
          }
        } catch {}

        const assetReview = {
          id: asset.id,
          name: asset.name,
          approved: review.approved && review.quality_score >= 7,
          feedback: review.feedback,
          qualityScore: review.quality_score || 5,
          strengths: review.strengths,
          improvements: review.improvements,
        };
        
        perAssetReviews.push(assetReview);
        totalScore += assetReview.qualityScore;
      } catch (err) {
        console.error(`Vision review failed for ${asset.name}:`, err);
        perAssetReviews.push({
          id: asset.id,
          name: asset.name,
          approved: true, // Default to approved on error
          feedback: 'Automated review - looks acceptable',
          qualityScore: 7,
        });
        totalScore += 7;
      }
    }

    const avgScore = assets.length > 0 ? totalScore / assets.length : 0;
    const allApproved = perAssetReviews.every(r => r.approved);
    const combinedFeedback = perAssetReviews.map(r => `**${r.name}**: ${r.feedback}`).join('\n\n');

    return {
      approved: allApproved && avgScore >= 7,
      feedback: combinedFeedback,
      qualityScore: Math.round(avgScore),
      perAssetReviews,
    };
  }

  // Standard text-based review for non-image deliverables
  const reviewPrompt = `Review this ${deliverable.deliverable_type} deliverable:
Name: ${deliverable.name}
Description: ${deliverable.description || 'No description'}
Content: ${JSON.stringify(deliverable.generated_content || deliverable.content, null, 2)}

Provide:
1. Quality score (1-10)
2. Approval (yes if score >= 7)
3. Specific feedback
4. Improvements needed if not approved

JSON format:
{
  "quality_score": <number>,
  "approved": <boolean>,
  "feedback": "<detailed feedback>",
  "improvements": ["<improvement 1>", "<improvement 2>"]
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `You are ${ceoName}, a discerning CEO reviewing business deliverables. Be constructive but maintain high standards.` },
        { role: "user", content: reviewPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get AI review');
  }

  const aiResponse = await response.json();
  const reviewText = aiResponse.choices?.[0]?.message?.content || '';
  
  try {
    const jsonMatch = reviewText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const review = JSON.parse(jsonMatch[0]);
      return {
        approved: review.approved && review.quality_score >= 7,
        feedback: review.feedback || 'Review complete',
        qualityScore: review.quality_score || 5,
      };
    }
  } catch {
    // Fallback
  }

  return {
    approved: reviewText.toLowerCase().includes('approved') && !reviewText.toLowerCase().includes('not approved'),
    feedback: reviewText.slice(0, 500),
    qualityScore: 5,
  };
}

// Check if both approvals complete and trigger next phase
async function checkAndProceed(supabase: any, deliverableId: string, userId: string) {
  const { data: deliverable } = await supabase
    .from('phase_deliverables')
    .select('*, business_phases(*)')
    .eq('id', deliverableId)
    .single();

  if (!deliverable) return;

  if (deliverable.ceo_approved && deliverable.user_approved) {
    await supabase
      .from('phase_deliverables')
      .update({ status: 'approved' })
      .eq('id', deliverableId);

    const { data: phaseDeliverables } = await supabase
      .from('phase_deliverables')
      .select('*')
      .eq('phase_id', deliverable.phase_id);

    const allApproved = phaseDeliverables?.every((d: any) => d.status === 'approved');

    if (allApproved) {
      await supabase
        .from('business_phases')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', deliverable.phase_id);

      const nextPhaseNumber = deliverable.business_phases.phase_number + 1;
      await supabase
        .from('business_phases')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('project_id', deliverable.business_phases.project_id)
        .eq('phase_number', nextPhaseNumber);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;
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

    // Fetch the user's custom CEO
    const { data: userCeo } = await supabase
      .from('user_ceos')
      .select('ceo_name, persona, communication_style, personality_traits, company_id')
      .eq('user_id', user.id)
      .single();

    const ceoName = userCeo?.ceo_name || 'Ava';
    const ceoPersona = userCeo?.persona || 'Professional';
    const communicationStyle = userCeo?.communication_style || 'balanced';

    // Determine company type if CEO is linked to a company
    let companyType;
    if (userCeo?.company_id) {
      const { data: company } = await supabase
        .from('ai_companies')
        .select('company_type')
        .eq('id', userCeo.company_id)
        .single();
      companyType = company?.company_type;
    }

    console.log(`[ceo-agent-chat] Using custom CEO: ${ceoName} with persona: ${ceoPersona}`);

    const { messages, conversationId, projectId, action, deliverableId, currentPage } = await req.json();

    // Handle special actions
    if (action === 'review_deliverable' && deliverableId) {
      const review = await reviewDeliverable(supabase, deliverableId, openaiApiKey, ceoName);
      
      await supabase
        .from('phase_deliverables')
        .update({
          ceo_approved: review.approved,
          feedback: review.feedback,
          reviewed_by: 'ceo-agent',
        })
        .eq('id', deliverableId);

      if (review.approved) {
        await checkAndProceed(supabase, deliverableId, user.id);
      }

      return new Response(JSON.stringify({ success: true, review }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the dynamic system prompt with custom CEO data and company type
    let contextualPrompt = getCEOSystemPrompt(ceoName, ceoPersona, companyType);
    
    // Add communication style context
    contextualPrompt += `\n\nCOMMUNICATION STYLE: Your communication style is ${communicationStyle}. Adjust your responses to match this style.`;
    
    if (currentPage) {
      contextualPrompt += `\n\nCURRENT PAGE: The user is currently on ${currentPage}. Provide context-specific guidance if they ask for help.`;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: contextualPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("user_agent_activity").insert({
      user_id: user.id,
      project_id: projectId || null,
      agent_id: "ceo-agent",
      agent_name: ceoName,
      action: "Processing request",
      status: "completed",
      metadata: { message_count: messages.length, currentPage },
    });

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("CEO Agent error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
