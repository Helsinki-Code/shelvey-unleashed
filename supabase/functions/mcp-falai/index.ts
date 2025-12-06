import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FAL_API_URL = 'https://fal.run';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, arguments: args, credentials } = await req.json();

    const apiKey = credentials?.FAL_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FAL_KEY not provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (tool) {
      case 'generate_image':
        result = await generateImage(apiKey, args);
        break;
      case 'generate_logo':
        result = await generateLogo(apiKey, args);
        break;
      case 'generate_brand_assets':
        result = await generateBrandAssets(apiKey, args);
        break;
      case 'generate_social_banner':
        result = await generateSocialBanner(apiKey, args);
        break;
      case 'image_to_image':
        result = await imageToImage(apiKey, args);
        break;
      case 'upscale':
        result = await upscaleImage(apiKey, args);
        break;
      case 'remove_background':
        result = await removeBackground(apiKey, args);
        break;
      case 'text_to_speech':
        result = await textToSpeech(apiKey, args);
        break;
      case 'transcribe':
        result = await transcribeAudio(apiKey, args);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown tool: ${tool}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-falai] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function callFal(apiKey: string, model: string, input: any) {
  console.log(`[mcp-falai] Calling model: ${model}`);
  const response = await fetch(`${FAL_API_URL}/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fal.ai API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Use Seedream 4.5 for high-quality image generation
async function generateImage(apiKey: string, args: any) {
  const { prompt, negativePrompt, width, height, numImages } = args;

  const result = await callFal(apiKey, 'fal-ai/bytedance/seedream/v4.5/text-to-image', {
    prompt,
    image_size: width && height ? { width, height } : 'auto_2K',
    num_images: numImages || 1,
    max_images: 1,
    enable_safety_checker: true,
  });

  return {
    images: result.images?.map((img: any) => ({
      url: img.url,
      width: img.width,
      height: img.height,
      contentType: img.content_type,
    })) || [],
    seed: result.seed,
    prompt: result.prompt,
  };
}

// Generate professional logos using Seedream 4.5
async function generateLogo(apiKey: string, args: any) {
  const { brandName, industry, style, colors, description } = args;

  const colorGuide = colors?.length ? `Use these brand colors: ${colors.join(', ')}.` : '';
  const styleGuide = style || 'modern minimalist';
  
  const prompt = `Professional logo design for "${brandName}", a ${industry} company. 
Style: ${styleGuide}. ${colorGuide} ${description || ''}
Requirements: Clean vector-style logo, scalable, professional business logo, centered composition, 
simple iconic design, memorable brand mark, suitable for business cards and signage.
On a clean white background with no text unless the brand name is part of the design.`;

  console.log(`[mcp-falai] Generating logo for: ${brandName}`);

  const result = await callFal(apiKey, 'fal-ai/bytedance/seedream/v4.5/text-to-image', {
    prompt,
    image_size: { width: 1024, height: 1024 },
    num_images: 4,
    max_images: 4,
    enable_safety_checker: true,
  });

  return {
    logos: result.images?.map((img: any) => ({
      url: img.url,
      width: img.width,
      height: img.height,
    })) || [],
    brandName,
    style: styleGuide,
    seed: result.seed,
  };
}

// Generate brand assets (color palettes, mood boards, visual elements)
async function generateBrandAssets(apiKey: string, args: any) {
  const { type, brandName, industry, style, colors, description } = args;

  let prompt = '';
  let imageSize = { width: 1024, height: 1024 };

  switch (type) {
    case 'color_palette':
      prompt = `Professional brand color palette visualization for "${brandName}" in the ${industry} industry. 
Show 5-6 harmonious color swatches arranged elegantly with hex codes visible.
Style: ${style || 'modern and sophisticated'}. ${colors?.length ? `Base colors: ${colors.join(', ')}.` : ''}
Clean, organized presentation suitable for a brand style guide.`;
      imageSize = { width: 1920, height: 1080 };
      break;

    case 'mood_board':
      prompt = `Professional mood board for "${brandName}" brand in the ${industry} industry.
Elegant collage of textures, colors, typography samples, and visual inspiration.
Style: ${style || 'contemporary and premium'}. ${description || ''}
Cohesive visual direction, professional presentation.`;
      imageSize = { width: 1920, height: 1080 };
      break;

    case 'marketing_visuals':
      prompt = `Marketing visual assets for "${brandName}" in the ${industry} industry.
Professional imagery suitable for website hero sections, social media, and advertising.
Style: ${style || 'modern and engaging'}. ${colors?.length ? `Brand colors: ${colors.join(', ')}.` : ''}
High-quality, commercial-grade photography or illustration style.`;
      imageSize = { width: 1920, height: 1080 };
      break;

    case 'icons':
      prompt = `Set of professional brand icons for "${brandName}" in the ${industry} industry.
6 cohesive icons arranged in a grid, consistent style, suitable for website and app.
Style: ${style || 'minimal line icons'}. ${colors?.length ? `Using colors: ${colors.join(', ')}.` : ''}
Clean, scalable vector-style icons on white background.`;
      break;

    case 'patterns':
      prompt = `Seamless brand pattern design for "${brandName}" in the ${industry} industry.
Elegant repeating pattern suitable for backgrounds, packaging, or marketing materials.
Style: ${style || 'subtle and sophisticated'}. ${colors?.length ? `Brand colors: ${colors.join(', ')}.` : ''}
Professional, tileable design.`;
      break;

    case 'guidelines':
      prompt = `Brand guidelines visual spread for "${brandName}" in the ${industry} industry.
Professional layout showing logo usage, color palette, typography samples, and spacing rules.
Style: ${style || 'clean corporate'}. ${colors?.length ? `Primary colors: ${colors.join(', ')}.` : ''}
Organized presentation suitable for a brand manual.`;
      imageSize = { width: 1920, height: 1080 };
      break;

    default:
      prompt = `Professional brand visual for "${brandName}" in the ${industry} industry.
Style: ${style || 'modern and premium'}. ${description || ''}
High-quality, commercial-grade design.`;
  }

  console.log(`[mcp-falai] Generating brand assets type: ${type} for: ${brandName}`);

  const result = await callFal(apiKey, 'fal-ai/bytedance/seedream/v4.5/text-to-image', {
    prompt,
    image_size: imageSize,
    num_images: 2,
    max_images: 2,
    enable_safety_checker: true,
  });

  return {
    assets: result.images?.map((img: any) => ({
      url: img.url,
      width: img.width,
      height: img.height,
      type,
    })) || [],
    brandName,
    assetType: type,
    seed: result.seed,
  };
}

// Generate social media banners and marketing materials
async function generateSocialBanner(apiKey: string, args: any) {
  const { brandName, platform, message, style, colors } = args;

  const platformSizes: Record<string, { width: number; height: number }> = {
    'instagram_post': { width: 1080, height: 1080 },
    'instagram_story': { width: 1080, height: 1920 },
    'facebook_cover': { width: 1640, height: 624 },
    'twitter_header': { width: 1500, height: 500 },
    'linkedin_banner': { width: 1584, height: 396 },
    'youtube_thumbnail': { width: 1280, height: 720 },
    'default': { width: 1200, height: 630 },
  };

  const size = platformSizes[platform] || platformSizes['default'];
  
  const prompt = `Professional ${platform || 'social media'} banner for "${brandName}".
${message ? `Featured text or message: "${message}".` : ''}
Style: ${style || 'modern, eye-catching, professional marketing'}. 
${colors?.length ? `Brand colors: ${colors.join(', ')}.` : ''}
Commercial-quality social media graphic, engaging and shareable.`;

  console.log(`[mcp-falai] Generating social banner for: ${brandName}, platform: ${platform}`);

  // Use Ideogram for better text rendering on social graphics
  const result = await callFal(apiKey, 'fal-ai/ideogram/v2/turbo', {
    prompt,
    aspect_ratio: size.width > size.height ? '16:9' : size.width === size.height ? '1:1' : '9:16',
    expand_prompt: true,
    style: 'design',
  });

  return {
    banners: result.images?.map((img: any) => ({
      url: img.url,
      platform,
    })) || [],
    brandName,
    platform,
    seed: result.seed,
  };
}

async function imageToImage(apiKey: string, args: any) {
  const { imageUrl, prompt, strength } = args;

  // Use Ideogram remix for image-to-image
  const result = await callFal(apiKey, 'fal-ai/ideogram/v2/turbo/remix', {
    image_url: imageUrl,
    prompt,
    strength: strength || 0.75,
  });

  return {
    images: result.images?.map((img: any) => ({
      url: img.url,
    })) || [],
  };
}

async function upscaleImage(apiKey: string, args: any) {
  const { imageUrl, scale } = args;

  const result = await callFal(apiKey, 'fal-ai/esrgan', {
    image_url: imageUrl,
    scale: scale || 4,
  });

  return {
    image: {
      url: result.image?.url,
      width: result.image?.width,
      height: result.image?.height,
    },
  };
}

async function removeBackground(apiKey: string, args: any) {
  const { imageUrl } = args;

  const result = await callFal(apiKey, 'fal-ai/birefnet', {
    image_url: imageUrl,
  });

  return {
    image: {
      url: result.image?.url,
      width: result.image?.width,
      height: result.image?.height,
    },
  };
}

async function textToSpeech(apiKey: string, args: any) {
  const { text, voice } = args;

  const result = await callFal(apiKey, 'fal-ai/f5-tts', {
    gen_text: text,
    ref_audio_url: voice,
    model_type: 'F5-TTS',
  });

  return {
    audio: {
      url: result.audio_url?.url || result.audio_url,
    },
  };
}

async function transcribeAudio(apiKey: string, args: any) {
  const { audioUrl, language } = args;

  const result = await callFal(apiKey, 'fal-ai/whisper', {
    audio_url: audioUrl,
    task: 'transcribe',
    language: language || 'en',
  });

  return {
    text: result.text,
    chunks: result.chunks,
    language: result.language,
  };
}
