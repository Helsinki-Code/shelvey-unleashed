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

// Generate brand assets using Lovable AI image generation
async function generateBrandAssets(
  lovableApiKey: string,
  brandContext: {
    projectName: string;
    industry: string;
    brandStrategy: any;
    colorPalette: any;
    brandGuidelines: any;
  }
): Promise<GeneratedAsset[]> {
  const assets: GeneratedAsset[] = [];
  
  // Extract brand info from approved reports - with better color extraction
  const brandName = brandContext.projectName || 'Brand';
  const industry = brandContext.industry || 'business';
  const style = brandContext.brandStrategy?.brand_personality || brandContext.brandStrategy?.visual_style || 'modern and professional';
  
  // Better color extraction - look for HEX codes in color palette
  let primaryColor = '#10B981'; // emerald default
  let secondaryColor = '#059669';
  let accentColor = '#34D399';
  
  const colorPalette = brandContext.colorPalette;
  if (colorPalette) {
    // Try to extract HEX colors from various possible locations
    if (colorPalette.primary && colorPalette.primary.startsWith('#')) {
      primaryColor = colorPalette.primary;
    } else if (colorPalette.primary_color && colorPalette.primary_color.startsWith('#')) {
      primaryColor = colorPalette.primary_color;
    } else if (colorPalette.colors?.primary) {
      primaryColor = colorPalette.colors.primary;
    } else if (colorPalette.palette?.primary) {
      primaryColor = colorPalette.palette.primary;
    } else if (Array.isArray(colorPalette.primary_colors) && colorPalette.primary_colors[0]) {
      const firstColor = colorPalette.primary_colors[0];
      if (typeof firstColor === 'string' && firstColor.startsWith('#')) {
        primaryColor = firstColor;
      } else if (firstColor?.hex) {
        primaryColor = firstColor.hex;
      }
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
  
  console.log('[brand-assets-generator] Generating assets for:', { 
    brandName, industry, style, 
    colors: { primaryColor, secondaryColor, accentColor } 
  });

  // Generate Logo with EXPLICIT color hex codes
  const logoPrompt = `Create a professional, bold logo icon for "${brandName}" - a ${industry} company.

CRITICAL COLOR REQUIREMENTS - USE THESE EXACT COLORS:
- Primary color: ${primaryColor} (this MUST be the dominant color)
- Secondary color: ${secondaryColor} (use for accents/contrast)
- Accent color: ${accentColor} (use sparingly for highlights)

Style: ${style}

Design Requirements:
- Bold, vibrant design using the PRIMARY COLOR ${primaryColor} prominently
- Clean, minimalist but COLORFUL - NOT white or gray
- Suitable for both light and dark backgrounds
- Scalable vector-style illustration
- No text in the logo (icon/symbol only)
- Premium, trustworthy appearance
- The logo should be PRIMARILY ${primaryColor} colored

DO NOT generate a white, gray, or monochrome logo. The logo MUST feature ${primaryColor} as the main color.

Format: Square 1024x1024 logo design with rich color.`;

  console.log('[brand-assets-generator] Logo prompt:', logoPrompt);

  try {
    const logoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content: logoPrompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (logoResponse.ok) {
      const logoResult = await logoResponse.json();
      const images = logoResult.choices?.[0]?.message?.images || [];
      console.log('[brand-assets-generator] Logo response images:', images.length);
      
      if (images.length > 0) {
        assets.push({
          id: `logo-${Date.now()}`,
          type: 'logo',
          imageUrl: images[0].image_url?.url || images[0].url || '',
          prompt: logoPrompt,
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

  // Generate App Icon with explicit colors
  const iconPrompt = `Create a mobile app icon for "${brandName}" - a ${industry} app.

CRITICAL COLOR REQUIREMENTS:
- Primary color: ${primaryColor} (MUST be the main background or dominant color)
- Secondary color: ${secondaryColor}

Style: ${style}
Requirements:
- Rounded corners ready for iOS/Android
- Simple, recognizable at small sizes
- Bold, vibrant, and eye-catching - USE ${primaryColor} as the main color
- Premium quality
- NOT white or gray - must be COLORFUL with ${primaryColor}

Format: Square 512x512 app icon with ${primaryColor} as the dominant color.`;

  try {
    const iconResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content: iconPrompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (iconResponse.ok) {
      const iconResult = await iconResponse.json();
      const images = iconResult.choices?.[0]?.message?.images || [];
      
      if (images.length > 0) {
        assets.push({
          id: `icon-${Date.now()}`,
          type: 'icon',
          imageUrl: images[0].image_url?.url || images[0].url || '',
          prompt: iconPrompt,
          generatedAt: new Date().toISOString(),
          colors: { primaryColor, secondaryColor },
        });
      }
    }
  } catch (error) {
    console.error('[brand-assets-generator] Icon generation error:', error);
  }

  // Generate Social Media Banner with explicit colors
  const bannerPrompt = `Create a social media banner/cover image for "${brandName}" - a ${industry} company.

CRITICAL COLOR REQUIREMENTS:
- Primary color: ${primaryColor} (use as main gradient or background color)
- Secondary color: ${secondaryColor} (use for gradient or accents)
- Accent color: ${accentColor} (use sparingly for highlights)

Style: ${style}
Requirements:
- Wide format (1200x600 aspect ratio)
- Professional and engaging with VIBRANT colors
- Suitable for LinkedIn/Twitter/Facebook cover
- Beautiful gradient using ${primaryColor} and ${secondaryColor}
- Abstract or minimalist design matching the brand
- NOT white or plain - must feature brand colors prominently

Format: Wide banner 1200x600 with a beautiful ${primaryColor} to ${secondaryColor} gradient.`;

  try {
    const bannerResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content: bannerPrompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (bannerResponse.ok) {
      const bannerResult = await bannerResponse.json();
      const images = bannerResult.choices?.[0]?.message?.images || [];
      
      if (images.length > 0) {
        assets.push({
          id: `banner-${Date.now()}`,
          type: 'banner',
          imageUrl: images[0].image_url?.url || images[0].url || '',
          prompt: bannerPrompt,
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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
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
        const assets = await generateBrandAssets(lovableApiKey, brandContext);

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
      const assets = await generateBrandAssets(lovableApiKey, brandContext);

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
      const assets = await generateBrandAssets(lovableApiKey, brandContext);

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
      
      const prompt = `Generate a comprehensive brand color palette for "${businessName || 'Brand'}", a ${industry || 'business'} company. Return as JSON with: primary, secondary, accent, background, text colors as hex values.`;
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
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
