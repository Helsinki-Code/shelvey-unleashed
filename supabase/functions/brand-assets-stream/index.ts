import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssetConfig {
  id: string;
  type: 'logo' | 'icon' | 'banner' | 'color_palette';
  name: string;
  tool: string;
  model: string;
  usesPreviousImage?: boolean;
}

// Order matters: palette first, then logo (chained to palette colors), then others chain from logo
const ASSETS_TO_GENERATE: AssetConfig[] = [
  { id: 'palette-1', type: 'color_palette', name: 'Color Palette', tool: 'generate_color_palette', model: 'AI Generated' },
  { id: 'logo-1', type: 'logo', name: 'Primary Logo', tool: 'generate_logo', model: 'Seedream 4.5' },
  { id: 'logo-2', type: 'logo', name: 'Logo Variant', tool: 'image_to_image', model: 'Ideogram Remix', usesPreviousImage: true },
  { id: 'icon-1', type: 'icon', name: 'App Icon', tool: 'image_to_image', model: 'Ideogram Remix', usesPreviousImage: true },
  { id: 'banner-1', type: 'banner', name: 'Social Banner', tool: 'generate_social_banner', model: 'Ideogram 2.0' },
];

// Generate a unique color palette using cryptographic randomness
function generateUniqueColorPalette(brandName: string, industry: string): { primary: string; secondary: string; accent: string } {
  const industryPalettes: Record<string, Array<{ primary: string; secondary: string; accent: string }>> = {
    technology: [
      { primary: '#3B82F6', secondary: '#1E40AF', accent: '#60A5FA' },
      { primary: '#6366F1', secondary: '#4338CA', accent: '#A5B4FC' },
      { primary: '#0EA5E9', secondary: '#0369A1', accent: '#7DD3FC' },
      { primary: '#8B5CF6', secondary: '#6D28D9', accent: '#C4B5FD' },
      { primary: '#14B8A6', secondary: '#0D9488', accent: '#5EEAD4' },
      { primary: '#F59E0B', secondary: '#D97706', accent: '#FCD34D' },
    ],
    finance: [
      { primary: '#059669', secondary: '#047857', accent: '#34D399' },
      { primary: '#0F766E', secondary: '#115E59', accent: '#5EEAD4' },
      { primary: '#1D4ED8', secondary: '#1E3A8A', accent: '#93C5FD' },
      { primary: '#0891B2', secondary: '#155E75', accent: '#67E8F9' },
      { primary: '#7C3AED', secondary: '#5B21B6', accent: '#C4B5FD' },
    ],
    health: [
      { primary: '#10B981', secondary: '#059669', accent: '#6EE7B7' },
      { primary: '#14B8A6', secondary: '#0D9488', accent: '#5EEAD4' },
      { primary: '#22C55E', secondary: '#16A34A', accent: '#86EFAC' },
      { primary: '#06B6D4', secondary: '#0891B2', accent: '#67E8F9' },
      { primary: '#3B82F6', secondary: '#2563EB', accent: '#93C5FD' },
    ],
    creative: [
      { primary: '#EC4899', secondary: '#BE185D', accent: '#F9A8D4' },
      { primary: '#F43F5E', secondary: '#E11D48', accent: '#FDA4AF' },
      { primary: '#A855F7', secondary: '#7C3AED', accent: '#D8B4FE' },
      { primary: '#F97316', secondary: '#EA580C', accent: '#FDBA74' },
      { primary: '#8B5CF6', secondary: '#6D28D9', accent: '#C4B5FD' },
    ],
    retail: [
      { primary: '#EF4444', secondary: '#DC2626', accent: '#FCA5A5' },
      { primary: '#F59E0B', secondary: '#D97706', accent: '#FCD34D' },
      { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#C4B5FD' },
      { primary: '#06B6D4', secondary: '#0891B2', accent: '#67E8F9' },
      { primary: '#EC4899', secondary: '#DB2777', accent: '#F9A8D4' },
    ],
    education: [
      { primary: '#3B82F6', secondary: '#2563EB', accent: '#93C5FD' },
      { primary: '#6366F1', secondary: '#4F46E5', accent: '#A5B4FC' },
      { primary: '#14B8A6', secondary: '#0D9488', accent: '#5EEAD4' },
      { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#C4B5FD' },
      { primary: '#10B981', secondary: '#059669', accent: '#6EE7B7' },
    ],
    food: [
      { primary: '#F97316', secondary: '#EA580C', accent: '#FDBA74' },
      { primary: '#EF4444', secondary: '#DC2626', accent: '#FCA5A5' },
      { primary: '#84CC16', secondary: '#65A30D', accent: '#BEF264' },
      { primary: '#F59E0B', secondary: '#D97706', accent: '#FCD34D' },
      { primary: '#22C55E', secondary: '#16A34A', accent: '#86EFAC' },
    ],
    business: [
      { primary: '#3B82F6', secondary: '#1E40AF', accent: '#93C5FD' },
      { primary: '#1E293B', secondary: '#0F172A', accent: '#64748B' },
      { primary: '#0EA5E9', secondary: '#0284C7', accent: '#7DD3FC' },
      { primary: '#6366F1', secondary: '#4338CA', accent: '#A5B4FC' },
      { primary: '#059669', secondary: '#047857', accent: '#34D399' },
      { primary: '#7C3AED', secondary: '#5B21B6', accent: '#C4B5FD' },
    ],
  };

  // Get palette options for industry or default to business
  const lowerIndustry = industry.toLowerCase();
  let palettes = industryPalettes.business;
  for (const [key, val] of Object.entries(industryPalettes)) {
    if (lowerIndustry.includes(key)) {
      palettes = val;
      break;
    }
  }

  // Use crypto.getRandomValues for true randomness
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);
  const index = randomBytes[0] % palettes.length;

  return palettes[index];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  const phaseId = url.searchParams.get('phaseId');

  if (!projectId) {
    return new Response(JSON.stringify({ error: 'projectId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const falKey = Deno.env.get('FAL_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Create a TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (data: Record<string, unknown>) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };

  // Start the generation process in the background
  (async () => {
    try {
      if (!falKey) {
        await sendEvent({
          type: 'error',
          message: 'Missing FAL_KEY configuration in backend',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Send start event
      await sendEvent({
        type: 'start',
        message: 'Initializing brand asset generation...',
        totalAssets: ASSETS_TO_GENERATE.length,
        timestamp: new Date().toISOString(),
      });

      // Get project info including uploaded assets
      const { data: project } = await supabase
        .from('business_projects')
        .select('name, industry, business_model')
        .eq('id', projectId)
        .single();

      const brandName = project?.name || 'Brand';
      const industry = project?.industry || 'business';
      
      // Check for user-uploaded logo
      let userUploadedLogoUrl: string | null = null;
      if (project?.business_model && typeof project.business_model === 'object') {
        const bm = project.business_model as Record<string, unknown>;
        const uploadedAssets = bm.uploaded_assets as Array<{ type: string; url: string; filename?: string; name?: string }> | undefined;
        if (uploadedAssets && Array.isArray(uploadedAssets)) {
          const logoAsset = uploadedAssets.find(a => {
            if (a.type !== 'image') return false;
            const filename = a.filename || a.name || '';
            return (typeof filename === 'string' && filename.toLowerCase().includes('logo')) || uploadedAssets.length === 1;
          });
          if (logoAsset) {
            userUploadedLogoUrl = logoAsset.url;
          }
        }
      }

      await sendEvent({
        type: 'context_loaded',
        message: userUploadedLogoUrl 
          ? `Loaded brand context for "${brandName}" with user-uploaded logo` 
          : `Loaded brand context for "${brandName}"`,
        brandName,
        industry,
        hasUploadedLogo: !!userUploadedLogoUrl,
        timestamp: new Date().toISOString(),
      });

      // Generate unique color palette using crypto randomness
      const generatedPalette = generateUniqueColorPalette(brandName, industry);
      const primaryColor = generatedPalette.primary;
      const secondaryColor = generatedPalette.secondary;
      const accentColor = generatedPalette.accent;

      await sendEvent({
        type: 'palette_generated',
        message: `Generated unique color palette: ${primaryColor}, ${secondaryColor}, ${accentColor}`,
        colors: { primary: primaryColor, secondary: secondaryColor, accent: accentColor },
        timestamp: new Date().toISOString(),
      });

      // Track generated images for chaining - use uploaded logo if available
      let primaryLogoUrl: string | null = userUploadedLogoUrl;

      const generatedAssets: Array<{
        id: string;
        type: string;
        name: string;
        imageUrl: string;
        model: string;
        ceoApproved: boolean;
        userApproved: boolean;
        colorData?: { primary: string; secondary: string; accent: string };
      }> = [];

      // Generate each asset
      for (let i = 0; i < ASSETS_TO_GENERATE.length; i++) {
        const asset = ASSETS_TO_GENERATE[i];
        const progress = Math.round(((i) / ASSETS_TO_GENERATE.length) * 100);

        // Send generating event
        await sendEvent({
          type: 'generating',
          assetId: asset.id,
          assetType: asset.type,
          name: asset.name,
          model: asset.model,
          currentIndex: i,
          totalAssets: ASSETS_TO_GENERATE.length,
          progress,
          message: `Generating ${asset.name} using ${asset.model}...`,
          timestamp: new Date().toISOString(),
        });

        // Color palette is computed, not an image
        if (asset.type === 'color_palette') {
          generatedAssets.push({
            id: asset.id,
            type: asset.type,
            name: asset.name,
            imageUrl: '',
            model: asset.model,
            ceoApproved: false,
            userApproved: false,
            colorData: { primary: primaryColor, secondary: secondaryColor, accent: accentColor },
          });

          await sendEvent({
            type: 'asset_complete',
            assetId: asset.id,
            assetType: asset.type,
            name: asset.name,
            model: asset.model,
            imageUrl: null,
            colorData: { primary: primaryColor, secondary: secondaryColor, accent: accentColor },
            currentIndex: i,
            totalAssets: ASSETS_TO_GENERATE.length,
            progress: Math.round(((i + 1) / ASSETS_TO_GENERATE.length) * 100),
            message: `${asset.name} configured`,
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        // Skip primary logo generation if user uploaded one
        if (asset.id === 'logo-1' && userUploadedLogoUrl) {
          generatedAssets.push({
            id: asset.id,
            type: asset.type,
            name: asset.name + ' (Uploaded)',
            imageUrl: userUploadedLogoUrl,
            model: 'User Upload',
            ceoApproved: false,
            userApproved: false,
          });

          await sendEvent({
            type: 'asset_complete',
            assetId: asset.id,
            assetType: asset.type,
            name: asset.name,
            model: 'User Upload',
            imageUrl: userUploadedLogoUrl,
            currentIndex: i,
            totalAssets: ASSETS_TO_GENERATE.length,
            progress: Math.round(((i + 1) / ASSETS_TO_GENERATE.length) * 100),
            message: `Using your uploaded logo!`,
            success: true,
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        // Call Fal.ai for image generation
        await sendEvent({
          type: 'api_call',
          assetId: asset.id,
          name: asset.name,
          message: `Calling Fal.ai ${asset.model} API...`,
          timestamp: new Date().toISOString(),
        });

        try {
          let toolArgs: Record<string, unknown> = {};
          let toolToUse = asset.tool;

          // Build prompt with explicit color constraints for brand consistency
          const colorConstraint = `Use ONLY these brand colors: Primary ${primaryColor}, Secondary ${secondaryColor}, Accent ${accentColor}. Do not use any other colors.`;

          // Handle image-to-image chaining for brand consistency
          if (asset.usesPreviousImage && primaryLogoUrl) {
            toolToUse = 'image_to_image';
            
            if (asset.type === 'logo') {
              toolArgs = {
                imageUrl: primaryLogoUrl,
                prompt: `Create a variant of this logo for "${brandName}". ${colorConstraint} Same style but with a fresh twist. Maintain brand identity. Clean vector style.`,
                strength: 0.7,
              };
            } else if (asset.type === 'icon') {
              toolArgs = {
                imageUrl: primaryLogoUrl,
                prompt: `Create a square app icon based on this logo for "${brandName}". ${colorConstraint} Simplified, centered, suitable for mobile app icon. 1024x1024 square format.`,
                strength: 0.6,
              };
            }
          } else if (asset.tool === 'generate_logo') {
            // Primary logo generation with explicit color constraints
            toolArgs = {
              brandName,
              industry,
              style: `modern and professional, ${colorConstraint}`,
              colors: [primaryColor, secondaryColor, accentColor],
              width: 2048,
              height: 2048,
            };
          } else if (asset.tool === 'generate_social_banner') {
            // Banner with color constraints and logo reference if available
            toolArgs = {
              brandName,
              platform: 'linkedin_banner',
              style: `professional gradient from ${primaryColor} to ${secondaryColor}, ${colorConstraint}`,
              colors: [primaryColor, secondaryColor, accentColor],
            };
          }

          const response = await fetch(`${supabaseUrl}/functions/v1/mcp-falai`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              tool: toolToUse,
              arguments: toolArgs,
              credentials: {
                FAL_KEY: falKey,
              },
            }),
          });

          if (response.ok) {
            const result = await response.json();
            
            await sendEvent({
              type: 'api_response',
              assetId: asset.id,
              name: asset.name,
              success: result.success,
              message: `Received response from ${asset.model}`,
              timestamp: new Date().toISOString(),
            });

            let imageUrl: string | null = null;
            if (result.success) {
              if (toolToUse === 'generate_logo') {
                imageUrl = result.data?.logos?.[0]?.url || null;
              } else if (toolToUse === 'generate_social_banner') {
                imageUrl = result.data?.banners?.[0]?.url || null;
              } else if (toolToUse === 'generate_image') {
                imageUrl = result.data?.images?.[0]?.url || null;
              } else if (toolToUse === 'image_to_image') {
                imageUrl = result.data?.images?.[0]?.url || null;
              }

              // Upload to storage for a permanent public URL
              if (imageUrl) {
                await sendEvent({
                  type: 'uploading',
                  assetId: asset.id,
                  name: asset.name,
                  message: `Uploading ${asset.name} to storage...`,
                  timestamp: new Date().toISOString(),
                });

                try {
                  const imageResponse = await fetch(imageUrl);
                  if (imageResponse.ok) {
                    const imageBlob = await imageResponse.blob();
                    const fileName = `${projectId}/${asset.id}-${Date.now()}.png`;

                    const { data: uploadData, error: uploadError } = await supabase.storage
                      .from('agent-work-media')
                      .upload(fileName, imageBlob, {
                        contentType: 'image/png',
                        upsert: true,
                      });

                    if (!uploadError && uploadData) {
                      const { data: publicUrl } = supabase.storage
                        .from('agent-work-media')
                        .getPublicUrl(fileName);

                      if (publicUrl?.publicUrl) {
                        imageUrl = publicUrl.publicUrl;
                      }
                    }
                  }
                } catch (uploadErr) {
                  console.error('Upload error:', uploadErr);
                  // keep original URL if upload fails
                }
              }
            }

            if (imageUrl) {
              // Track primary logo for chaining to subsequent assets
              if (asset.id === 'logo-1' && asset.type === 'logo') {
                primaryLogoUrl = imageUrl;
              }

              generatedAssets.push({
                id: asset.id,
                type: asset.type,
                name: asset.name,
                imageUrl,
                model: asset.model,
                ceoApproved: false,
                userApproved: false,
              });

              // Log work step
              try {
                await supabase.from('agent_activity_logs').insert({
                  agent_id: 'brand-agent',
                  agent_name: 'Brand Agent',
                  action: `Generated ${asset.name}`,
                  status: 'completed',
                  metadata: {
                    projectId,
                    phaseId,
                    assetId: asset.id,
                    assetType: asset.type,
                    screenshotUrl: imageUrl,
                  },
                });
              } catch (logErr) {
                console.error('Failed to log agent activity:', logErr);
              }
            }

            // Send completion event for this asset
            await sendEvent({
              type: 'asset_complete',
              assetId: asset.id,
              assetType: asset.type,
              name: asset.name,
              model: asset.model,
              imageUrl,
              currentIndex: i,
              totalAssets: ASSETS_TO_GENERATE.length,
              progress: Math.round(((i + 1) / ASSETS_TO_GENERATE.length) * 100),
              message: imageUrl ? `${asset.name} generated successfully!` : `${asset.name} generation failed`,
              success: !!imageUrl,
              timestamp: new Date().toISOString(),
            });
          } else {
            const errorText = await response.text();
            console.error(`Fal.ai error for ${asset.name}:`, errorText);

            await sendEvent({
              type: 'asset_error',
              assetId: asset.id,
              name: asset.name,
              error: 'API call failed',
              currentIndex: i,
              totalAssets: ASSETS_TO_GENERATE.length,
              progress: Math.round(((i + 1) / ASSETS_TO_GENERATE.length) * 100),
              message: `Failed to generate ${asset.name}`,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error(`Error generating ${asset.name}:`, error);

          await sendEvent({
            type: 'asset_error',
            assetId: asset.id,
            name: asset.name,
            error: error instanceof Error ? error.message : 'Unknown error',
            currentIndex: i,
            totalAssets: ASSETS_TO_GENERATE.length,
            progress: Math.round(((i + 1) / ASSETS_TO_GENERATE.length) * 100),
            message: `Error generating ${asset.name}`,
            timestamp: new Date().toISOString(),
          });
        }

        // Small delay between assets to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Save to deliverables if phaseId provided
      if (phaseId && generatedAssets.length > 0) {
        await sendEvent({
          type: 'saving',
          message: 'Saving generated assets to deliverables...',
          assetCount: generatedAssets.length,
          timestamp: new Date().toISOString(),
        });

        const generatedContent = {
          assets: generatedAssets,
          primaryLogo: generatedAssets.find((a) => a.type === 'logo') || null,
          appIcon: generatedAssets.find((a) => a.type === 'icon') || null,
          socialBanner: generatedAssets.find((a) => a.type === 'banner') || null,
          generatedAt: new Date().toISOString(),
          assetCount: generatedAssets.length,
        };

        // Ensure a dedicated 'brand_assets' deliverable exists
        const { data: existingRows } = await supabase
          .from('phase_deliverables')
          .select('id')
          .eq('phase_id', phaseId)
          .eq('deliverable_type', 'brand_assets')
          .limit(1);

        const existing = existingRows?.[0];

        if (existing?.id) {
          await supabase
            .from('phase_deliverables')
            .update({
              generated_content: generatedContent,
              status: 'review', // Use valid status value
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          const { data: phaseRow } = await supabase
            .from('business_phases')
            .select('user_id')
            .eq('id', phaseId)
            .single();

          if (phaseRow?.user_id) {
            await supabase.from('phase_deliverables').insert({
              phase_id: phaseId,
              user_id: phaseRow.user_id,
              name: 'Brand Assets',
              deliverable_type: 'brand_assets',
              description: 'Generated logos, icons, and social banners',
              generated_content: generatedContent,
              status: 'review', // Use valid status value
            });
          }
        }

        // Log summary activity
        await supabase.from('agent_activity_logs').insert({
          agent_id: 'brand-agent',
          agent_name: 'Brand Agent',
          action: `Generated ${generatedAssets.length} brand assets with real-time streaming`,
          status: 'completed',
          metadata: {
            projectId,
            phaseId,
            assetCount: generatedAssets.length,
            screenshotUrl:
              generatedAssets.find((a) => a.type === 'logo')?.imageUrl ||
              generatedAssets[0]?.imageUrl ||
              null,
          },
        });
      }

      // Send completion event
      await sendEvent({
        type: 'complete',
        message: 'All brand assets generated successfully!',
        totalGenerated: generatedAssets.length,
        assets: generatedAssets,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Stream error:', error);
      await sendEvent({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});
