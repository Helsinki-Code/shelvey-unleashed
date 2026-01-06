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
}

const ASSETS_TO_GENERATE: AssetConfig[] = [
  { id: 'logo-1', type: 'logo', name: 'Primary Logo', tool: 'generate_logo', model: 'Seedream 4.5' },
  { id: 'logo-2', type: 'logo', name: 'Logo Variant', tool: 'generate_logo', model: 'Seedream 4.5' },
  { id: 'icon-1', type: 'icon', name: 'App Icon', tool: 'generate_image', model: 'Seedream 4.5' },
  { id: 'banner-1', type: 'banner', name: 'Social Banner', tool: 'generate_social_banner', model: 'Ideogram 2.0' },
  { id: 'palette-1', type: 'color_palette', name: 'Color Palette', tool: 'generate_color_palette', model: 'AI Analysis' },
];

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

      // Get project info
      const { data: project } = await supabase
        .from('business_projects')
        .select('name, industry')
        .eq('id', projectId)
        .single();

      const brandName = project?.name || 'Brand';
      const industry = project?.industry || 'business';

      await sendEvent({
        type: 'context_loaded',
        message: `Loaded brand context for "${brandName}"`,
        brandName,
        industry,
        timestamp: new Date().toISOString(),
      });

      // Get brand deliverables for context
      let brandContext: Record<string, unknown> = {};
      if (phaseId) {
        const { data: deliverables } = await supabase
          .from('phase_deliverables')
          .select('deliverable_type, generated_content')
          .eq('phase_id', phaseId);

        const brandStrategy = deliverables?.find(d => d.deliverable_type === 'brand_strategy');
        const colorPalette = deliverables?.find(d => d.deliverable_type === 'color_palette');
        
        brandContext = {
          brandStrategy: brandStrategy?.generated_content,
          colorPalette: colorPalette?.generated_content,
        };

        await sendEvent({
          type: 'brand_context_loaded',
          message: 'Loaded approved brand strategy and color palette',
          hasStrategy: !!brandStrategy,
          hasColorPalette: !!colorPalette,
          timestamp: new Date().toISOString(),
        });
      }

      // Extract colors
      let primaryColor = '#10B981';
      let secondaryColor = '#059669';
      let accentColor = '#34D399';

      const palette = brandContext.colorPalette as Record<string, unknown> | undefined;
      if (palette) {
        if (typeof palette.primary === 'string' && palette.primary.startsWith('#')) {
          primaryColor = palette.primary;
        }
        if (typeof palette.secondary === 'string' && palette.secondary.startsWith('#')) {
          secondaryColor = palette.secondary;
        }
        if (typeof palette.accent === 'string' && palette.accent.startsWith('#')) {
          accentColor = palette.accent;
        }
      }

      const generatedAssets: Array<{
        id: string;
        type: string;
        name: string;
        imageUrl: string;
        model: string;
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

        // Color palette is text-based, not an image
        if (asset.type === 'color_palette') {
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

        // Call Fal.ai for image generation
        await sendEvent({
          type: 'api_call',
          assetId: asset.id,
          name: asset.name,
          message: `Calling Fal.ai ${asset.model} API...`,
          timestamp: new Date().toISOString(),
        });

        try {
          const style = (brandContext.brandStrategy as Record<string, unknown>)?.brand_personality || 'modern and professional';
          
          let toolArgs: Record<string, unknown> = {};
          if (asset.tool === 'generate_logo') {
            toolArgs = {
              brandName,
              industry,
              style: `${style}, using primary color ${primaryColor}`,
              colors: [primaryColor, secondaryColor, accentColor],
            };
          } else if (asset.tool === 'generate_image') {
            toolArgs = {
              prompt: `A clean, modern app icon for "${brandName}" (${industry}). Minimal, professional, centered, flat vector look, no text. Use brand colors ${primaryColor}, ${secondaryColor}, ${accentColor}.`,
              width: 1024,
              height: 1024,
              numImages: 1,
            };
          } else if (asset.tool === 'generate_social_banner') {
            toolArgs = {
              brandName,
              platform: 'linkedin_banner',
              style: `${style}, gradient from ${primaryColor} to ${secondaryColor}`,
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
              tool: asset.tool,
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
              if (asset.tool === 'generate_logo') {
                imageUrl = result.data?.logos?.[0]?.url || null;
              } else if (asset.tool === 'generate_social_banner') {
                imageUrl = result.data?.banners?.[0]?.url || null;
              } else if (asset.tool === 'generate_image') {
                imageUrl = result.data?.images?.[0]?.url || null;
              } else if (asset.tool === 'generate_brand_assets') {
                imageUrl = result.data?.assets?.[0]?.url || null;
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
              generatedAssets.push({
                id: asset.id,
                type: asset.type,
                name: asset.name,
                imageUrl,
                model: asset.model,
              });

              // Log work step so the Agent Work preview can display it
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
              status: 'review',
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
              status: 'review',
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
