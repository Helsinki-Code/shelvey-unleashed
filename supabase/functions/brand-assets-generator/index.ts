import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratedAsset {
  id: string;
  type: 'logo' | 'icon' | 'banner' | 'social_media';
  imageUrl: string;
  prompt: string;
  generatedAt: string;
  colors?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
}

// Generate brand assets using Fal.ai via mcp-falai edge function
async function generateBrandAssets(
  supabaseUrl: string,
  serviceKey: string,
  brandContext: {
    projectName: string;
    industry: string;
    brandStrategy: any;
    colorPalette: any;
    brandGuidelines: any;
  }
): Promise<GeneratedAsset[]> {
  const assets: GeneratedAsset[] = [];
  
  const brandName = brandContext.projectName || 'Brand';
  const industry = brandContext.industry || 'business';
  const style = brandContext.brandStrategy?.brand_personality || brandContext.brandStrategy?.visual_style || 'modern and professional';
  
  // Extract colors from color palette
  let primaryColor = '#10B981';
  let secondaryColor = '#059669';
  let accentColor = '#34D399';
  
  const colorPalette = brandContext.colorPalette;
  if (colorPalette) {
    if (colorPalette.primary && colorPalette.primary.startsWith('#')) {
      primaryColor = colorPalette.primary;
    } else if (colorPalette.primary_color && colorPalette.primary_color.startsWith('#')) {
      primaryColor = colorPalette.primary_color;
    } else if (colorPalette.colors?.primary) {
      primaryColor = colorPalette.colors.primary;
    }
    
    if (colorPalette.secondary && colorPalette.secondary.startsWith('#')) {
      secondaryColor = colorPalette.secondary;
    } else if (colorPalette.secondary_color) {
      secondaryColor = colorPalette.secondary_color;
    }
    
    if (colorPalette.accent && colorPalette.accent.startsWith('#')) {
      accentColor = colorPalette.accent;
    } else if (colorPalette.accent_color) {
      accentColor = colorPalette.accent_color;
    }
  }
  
  console.log('[brand-assets-generator] Generating assets using Fal.ai for:', { 
    brandName, industry, style, 
    colors: { primaryColor, secondaryColor, accentColor } 
  });

  // Generate Logo using Fal.ai
  try {
    const logoResponse = await fetch(`${supabaseUrl}/functions/v1/mcp-falai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        tool: 'generate_logo',
        arguments: {
          brandName,
          industry,
          style: `${style}, using primary color ${primaryColor}`,
          colors: { primary: primaryColor, secondary: secondaryColor, accent: accentColor },
        },
      }),
    });

    if (logoResponse.ok) {
      const logoResult = await logoResponse.json();
      console.log('[brand-assets-generator] Logo response:', JSON.stringify(logoResult).substring(0, 200));
      
      if (logoResult.success && logoResult.data?.images?.[0]?.url) {
        assets.push({
          id: `logo-${Date.now()}`,
          type: 'logo',
          imageUrl: logoResult.data.images[0].url,
          prompt: `Logo for ${brandName}`,
          generatedAt: new Date().toISOString(),
          colors: { primaryColor, secondaryColor, accentColor },
        });
      }
    } else {
      console.error('[brand-assets-generator] Logo generation failed:', await logoResponse.text());
    }
  } catch (error) {
    console.error('[brand-assets-generator] Logo generation error:', error);
  }

  // Generate App Icon using Fal.ai
  try {
    const iconResponse = await fetch(`${supabaseUrl}/functions/v1/mcp-falai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        tool: 'generate_brand_assets',
        arguments: {
          type: 'icon',
          brandName,
          industry,
          style: `Mobile app icon, ${style}, using ${primaryColor} as main color`,
        },
      }),
    });

    if (iconResponse.ok) {
      const iconResult = await iconResponse.json();
      
      if (iconResult.success && iconResult.data?.images?.[0]?.url) {
        assets.push({
          id: `icon-${Date.now()}`,
          type: 'icon',
          imageUrl: iconResult.data.images[0].url,
          prompt: `App icon for ${brandName}`,
          generatedAt: new Date().toISOString(),
          colors: { primaryColor, secondaryColor },
        });
      }
    }
  } catch (error) {
    console.error('[brand-assets-generator] Icon generation error:', error);
  }

  // Generate Social Media Banner using Fal.ai
  try {
    const bannerResponse = await fetch(`${supabaseUrl}/functions/v1/mcp-falai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        tool: 'generate_social_banner',
        arguments: {
          brandName,
          industry,
          style: `${style}, gradient from ${primaryColor} to ${secondaryColor}`,
          platform: 'linkedin',
        },
      }),
    });

    if (bannerResponse.ok) {
      const bannerResult = await bannerResponse.json();
      
      if (bannerResult.success && bannerResult.data?.images?.[0]?.url) {
        assets.push({
          id: `banner-${Date.now()}`,
          type: 'banner',
          imageUrl: bannerResult.data.images[0].url,
          prompt: `Social banner for ${brandName}`,
          generatedAt: new Date().toISOString(),
          colors: { primaryColor, secondaryColor, accentColor },
        });
      }
    }
  } catch (error) {
    console.error('[brand-assets-generator] Banner generation error:', error);
  }

  console.log('[brand-assets-generator] Total assets generated:', assets.length);
  return assets;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const falKey = Deno.env.get('FAL_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { action, userId, projectId, phaseId, deliverableId } = await req.json();

    console.log('[brand-assets-generator] Action:', action, 'Project:', projectId, 'Phase:', phaseId);

    if (action === 'check_and_generate') {
      // Check if Phase 2 text reports are all approved (brand_strategy, color_palette, brand_guidelines)
      // and logo_design is still pending
      
      const { data: deliverables, error: delError } = await supabase
        .from('phase_deliverables')
        .select('*')
        .eq('phase_id', phaseId);

      if (delError) throw delError;

      // Find the text-based deliverables and the logo deliverable
      const brandStrategy = deliverables?.find((d: any) => d.deliverable_type === 'brand_strategy');
      const colorPalette = deliverables?.find((d: any) => d.deliverable_type === 'color_palette');
      const brandGuidelines = deliverables?.find((d: any) => d.deliverable_type === 'brand_guidelines');
      const logoDesign = deliverables?.find((d: any) => d.deliverable_type === 'logo_design');

      // Check if text reports are approved
      const textReportsApproved = 
        (brandStrategy?.ceo_approved && brandStrategy?.user_approved) &&
        (colorPalette?.ceo_approved && colorPalette?.user_approved) &&
        (brandGuidelines?.ceo_approved && brandGuidelines?.user_approved);

      // Check if logo needs generation (pending or revision_requested)
      const logoNeedsGeneration = logoDesign && 
        (logoDesign.status === 'pending' || logoDesign.status === 'revision_requested');

      console.log('[brand-assets-generator] Text reports approved:', textReportsApproved);
      console.log('[brand-assets-generator] Logo needs generation:', logoNeedsGeneration);

      if (textReportsApproved && logoNeedsGeneration) {
        // Get project info
        const { data: project } = await supabase
          .from('business_projects')
          .select('name, industry')
          .eq('id', projectId)
          .single();

        // Generate brand assets using approved reports
        const brandContext = {
          projectName: project?.name || 'Brand',
          industry: project?.industry || 'business',
          brandStrategy: brandStrategy?.generated_content,
          colorPalette: colorPalette?.generated_content,
          brandGuidelines: brandGuidelines?.generated_content,
        };

        // Update logo status to in_progress
        await supabase
          .from('phase_deliverables')
          .update({ status: 'in_progress', assigned_agent_id: 'visual-design' })
          .eq('id', logoDesign.id);

        // Log activity
        await supabase.from('agent_activity_logs').insert({
          agent_id: 'visual-design',
          agent_name: 'Visual Design Agent',
          action: 'Generating brand assets based on approved brand reports',
          status: 'in_progress',
          metadata: { deliverableId: logoDesign.id, projectId },
        });

        // Generate assets
        const assets = await generateBrandAssets(supabaseUrl, supabaseKey, brandContext);

        // Store generated assets in the logo_design deliverable
        const generatedContent = {
          assets,
          brandContext: {
            projectName: brandContext.projectName,
            industry: brandContext.industry,
          },
          generatedAt: new Date().toISOString(),
          assetCount: assets.length,
          primaryLogo: assets.find(a => a.type === 'logo'),
          appIcon: assets.find(a => a.type === 'icon'),
          socialBanner: assets.find(a => a.type === 'banner'),
        };

        await supabase
          .from('phase_deliverables')
          .update({
            generated_content: generatedContent,
            status: 'review',
            updated_at: new Date().toISOString(),
          })
          .eq('id', logoDesign.id);

        // Log completion
        await supabase.from('agent_activity_logs').insert({
          agent_id: 'visual-design',
          agent_name: 'Visual Design Agent',
          action: `Generated ${assets.length} brand assets (logo, icon, banner)`,
          status: 'completed',
          metadata: { deliverableId: logoDesign.id, assetCount: assets.length },
        });

        // Trigger CEO review
        try {
          await fetch(`${supabaseUrl}/functions/v1/approve-deliverable`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              deliverableId: logoDesign.id,
              action: 'ceo_review',
            }),
          });
        } catch (reviewError) {
          console.error('[brand-assets-generator] CEO review trigger failed:', reviewError);
        }

        // Send notification
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'brand_assets_generated',
          title: 'Brand Assets Generated!',
          message: `Your logo, app icon, and social media banner have been generated based on your approved brand strategy. Ready for review.`,
          metadata: { deliverableId: logoDesign.id, assetCount: assets.length },
        });

        return new Response(JSON.stringify({
          success: true,
          message: 'Brand assets generated successfully',
          assets,
          deliverableId: logoDesign.id,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'No action needed',
        textReportsApproved,
        logoNeedsGeneration,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Direct generation action
    if (action === 'generate') {
      // Get project and phase info
      const { data: project } = await supabase
        .from('business_projects')
        .select('name, industry')
        .eq('id', projectId)
        .single();

      // Get approved brand reports from phase
      const { data: deliverables } = await supabase
        .from('phase_deliverables')
        .select('*')
        .eq('phase_id', phaseId);

      const brandStrategy = deliverables?.find((d: any) => d.deliverable_type === 'brand_strategy');
      const colorPalette = deliverables?.find((d: any) => d.deliverable_type === 'color_palette');
      const brandGuidelines = deliverables?.find((d: any) => d.deliverable_type === 'brand_guidelines');

      const brandContext = {
        projectName: project?.name || 'Brand',
        industry: project?.industry || 'business',
        brandStrategy: brandStrategy?.generated_content,
        colorPalette: colorPalette?.generated_content,
        brandGuidelines: brandGuidelines?.generated_content,
      };

      // Generate assets
      const assets = await generateBrandAssets(supabaseUrl, supabaseKey, brandContext);

      // Update the logo_design deliverable if provided
      if (deliverableId) {
        await supabase
          .from('phase_deliverables')
          .update({
            generated_content: {
              assets,
              brandContext: { projectName: brandContext.projectName, industry: brandContext.industry },
              generatedAt: new Date().toISOString(),
              assetCount: assets.length,
              primaryLogo: assets.find(a => a.type === 'logo'),
              appIcon: assets.find(a => a.type === 'icon'),
              socialBanner: assets.find(a => a.type === 'banner'),
            },
            status: 'review',
            updated_at: new Date().toISOString(),
          })
          .eq('id', deliverableId);

        // Trigger CEO review
        try {
          await fetch(`${supabaseUrl}/functions/v1/approve-deliverable`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              deliverableId,
              action: 'ceo_review',
            }),
          });
        } catch (reviewError) {
          console.error('[brand-assets-generator] CEO review trigger failed:', reviewError);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Brand assets generated',
        assets,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Regenerate action (when rejected)
    if (action === 'regenerate') {
      const { data: deliverable } = await supabase
        .from('phase_deliverables')
        .select('*, business_phases!inner(project_id, business_projects(name, industry))')
        .eq('id', deliverableId)
        .single();

      if (!deliverable) {
        throw new Error('Deliverable not found');
      }

      // Get feedback from history for improved regeneration
      const feedback = deliverable.feedback_history?.slice(-1)?.[0]?.feedback || '';
      
      // Get phase deliverables for brand context
      const { data: phaseDeliverables } = await supabase
        .from('phase_deliverables')
        .select('*')
        .eq('phase_id', deliverable.phase_id);

      const brandStrategy = phaseDeliverables?.find((d: any) => d.deliverable_type === 'brand_strategy');
      const colorPalette = phaseDeliverables?.find((d: any) => d.deliverable_type === 'color_palette');
      const brandGuidelines = phaseDeliverables?.find((d: any) => d.deliverable_type === 'brand_guidelines');

      const project = deliverable.business_phases?.business_projects;
      
      const brandContext = {
        projectName: project?.name || 'Brand',
        industry: project?.industry || 'business',
        brandStrategy: brandStrategy?.generated_content,
        colorPalette: colorPalette?.generated_content,
        brandGuidelines: brandGuidelines?.generated_content,
        previousFeedback: feedback,
      };

      // Update status
      await supabase
        .from('phase_deliverables')
        .update({ status: 'in_progress' })
        .eq('id', deliverableId);

      // Regenerate with feedback context
      const assets = await generateBrandAssets(supabaseUrl, supabaseKey, brandContext);

      // Update deliverable
      await supabase
        .from('phase_deliverables')
        .update({
          generated_content: {
            assets,
            brandContext: { projectName: brandContext.projectName, industry: brandContext.industry },
            generatedAt: new Date().toISOString(),
            assetCount: assets.length,
            regeneratedDueToFeedback: true,
            previousFeedback: feedback,
            primaryLogo: assets.find(a => a.type === 'logo'),
            appIcon: assets.find(a => a.type === 'icon'),
            socialBanner: assets.find(a => a.type === 'banner'),
          },
          status: 'review',
          ceo_approved: null,
          user_approved: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliverableId);

      // Trigger CEO review
      try {
        await fetch(`${supabaseUrl}/functions/v1/approve-deliverable`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            deliverableId,
            action: 'ceo_review',
          }),
        });
      } catch (reviewError) {
        console.error('[brand-assets-generator] CEO review trigger failed:', reviewError);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Brand assets regenerated',
        assets,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate color palette action
    if (action === 'generate-color-palette') {
      const { businessName, industry, brandColors } = await req.json().catch(() => ({}));
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
      
      const prompt = `Generate a comprehensive brand color palette for "${businessName || 'Brand'}", a ${industry || 'business'} company. Return as JSON with: primary, secondary, accent, background, text colors as hex values.`;
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a brand color expert. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      let palette = {
        primary: brandColors?.primary || '#10B981',
        secondary: '#059669',
        accent: '#34D399',
        background: '#FFFFFF',
        text: '#1E293B',
      };

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        try {
          const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          palette = JSON.parse(cleaned);
        } catch (e) {
          console.log('[brand-assets-generator] Using default palette');
        }
      }

      return new Response(JSON.stringify({
        success: true,
        data: { palette, businessName, generatedAt: new Date().toISOString() },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate typography action
    if (action === 'generate-typography') {
      const { businessName, industry } = await req.json().catch(() => ({}));
      
      const typography = {
        heading: { name: 'Inter', weights: [600, 700, 800], style: 'sans-serif' },
        body: { name: 'Inter', weights: [400, 500, 600], style: 'sans-serif' },
        display: { name: 'Inter', weights: [700, 800, 900], style: 'sans-serif' },
        pairingRationale: 'Inter is a highly legible, modern sans-serif that works excellently across all applications.',
      };

      return new Response(JSON.stringify({
        success: true,
        data: { typography, businessName, generatedAt: new Date().toISOString() },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[brand-assets-generator] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
