import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, campaignId, params } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: unknown;

    switch (action) {
      case 'generate_ad_images': {
        // Get campaign and project details for context
        const { data: campaign } = await supabase
          .from('marketing_campaigns')
          .select('*, business_projects(*)')
          .eq('id', campaignId)
          .single();

        // Generate ad images using Fal.ai MCP
        const variants = params.variants || 3;
        const generatedImages: string[] = [];

        for (let i = 0; i < variants; i++) {
          const { data: falResult } = await supabase.functions.invoke('mcp-falai', {
            body: {
              tool: 'generateImage',
              credentials: { FAL_KEY: Deno.env.get('FAL_KEY') },
              arguments: {
                prompt: `Professional advertisement for ${campaign?.business_projects?.name}. ${params.style || 'Modern, clean design'}. ${params.productDescription || campaign?.business_projects?.description}. High quality marketing visual, suitable for ${params.platform || 'social media'} ads.`,
                aspectRatio: params.aspectRatio || '1:1'
              }
            }
          });

          if (falResult?.images?.[0]?.url) {
            generatedImages.push(falResult.images[0].url);
          }
        }

        // Generate ad copy using OpenAI
        const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
        
        const copyResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { 
                role: "system", 
                content: "You are an expert ad copywriter. Generate compelling ad copy variations." 
              },
              { 
                role: "user", 
                content: `Generate ${variants} ad copy variations for:
                Brand: ${campaign?.business_projects?.name}
                Product/Service: ${params.productDescription || campaign?.business_projects?.description}
                Target audience: ${params.targetAudience || campaign?.business_projects?.target_market}
                Platform: ${params.platform || 'Facebook/Instagram'}
                Goal: ${params.goal || 'conversions'}
                
                For each variation provide: headline (max 40 chars), description (max 125 chars), CTA text.
                Return as JSON array.`
              }
            ]
          }),
        });

        const aiData = await copyResponse.json();
        let adCopies = [];
        try {
          const content = aiData.choices?.[0]?.message?.content || '[]';
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            adCopies = JSON.parse(jsonMatch[0]);
          }
        } catch {
          console.error('Failed to parse ad copy');
        }

        // Save ad creatives to database
        const createdAds = [];
        for (let i = 0; i < generatedImages.length; i++) {
          const copy = adCopies[i] || adCopies[0] || {};
          const { data: creative, error } = await supabase
            .from('ad_creatives')
            .insert({
              user_id: userId,
              campaign_id: campaignId,
              creative_type: 'image',
              image_urls: [generatedImages[i]],
              headline: copy.headline || `Discover ${campaign?.business_projects?.name}`,
              description: copy.description || campaign?.business_projects?.description?.slice(0, 125),
              cta: copy.cta || 'Learn More',
              ab_variant: String.fromCharCode(65 + i), // A, B, C...
              metadata: { platform: params.platform, goal: params.goal }
            })
            .select()
            .single();

          if (!error && creative) {
            createdAds.push(creative);
          }
        }

        result = { creatives: createdAds, images: generatedImages, copies: adCopies };

        await supabase.from('agent_activity_logs').insert({
          agent_id: 'paid-ads-agent',
          agent_name: 'Paid Ads Specialist',
          action: `Generated ${createdAds.length} ad creatives for campaign`,
          status: 'completed',
          metadata: { campaign_id: campaignId, variants: createdAds.length }
        });
        break;
      }

      case 'get_creatives': {
        const { data, error } = await supabase
          .from('ad_creatives')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        result = data;
        break;
      }

      case 'update_performance': {
        const { data, error } = await supabase
          .from('ad_creatives')
          .update({
            performance_score: params.score,
            metadata: params.metrics
          })
          .eq('id', params.creativeId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        result = data;
        break;
      }

      case 'generate_carousel': {
        // Generate multiple images for a carousel ad
        const { data: campaign } = await supabase
          .from('marketing_campaigns')
          .select('*, business_projects(*)')
          .eq('id', campaignId)
          .single();

        const slides = params.slides || 4;
        const carouselImages: string[] = [];

        for (let i = 0; i < slides; i++) {
          const slidePrompt = params.slidePrompts?.[i] || `Slide ${i + 1}: ${campaign?.business_projects?.description}`;
          
          const { data: falResult } = await supabase.functions.invoke('mcp-falai', {
            body: {
              tool: 'generateImage',
              credentials: { FAL_KEY: Deno.env.get('FAL_KEY') },
              arguments: {
                prompt: `Professional carousel ad slide for ${campaign?.business_projects?.name}. ${slidePrompt}. Cohesive design style, suitable for Instagram/Facebook carousel.`,
                aspectRatio: '1:1'
              }
            }
          });

          if (falResult?.images?.[0]?.url) {
            carouselImages.push(falResult.images[0].url);
          }
        }

        // Save carousel creative
        const { data: creative, error } = await supabase
          .from('ad_creatives')
          .insert({
            user_id: userId,
            campaign_id: campaignId,
            creative_type: 'carousel',
            image_urls: carouselImages,
            headline: params.headline || `Discover ${campaign?.business_projects?.name}`,
            description: params.description,
            cta: params.cta || 'Shop Now',
            metadata: { slides, slidePrompts: params.slidePrompts }
          })
          .select()
          .single();

        if (error) throw error;
        result = creative;
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ad creative generator error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
