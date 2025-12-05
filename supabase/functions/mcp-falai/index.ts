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

async function generateImage(apiKey: string, args: any) {
  const { prompt, negativePrompt, width, height, style, numImages } = args;

  const result = await callFal(apiKey, 'fal-ai/flux/dev', {
    prompt,
    negative_prompt: negativePrompt,
    image_size: { width: width || 1024, height: height || 1024 },
    num_images: numImages || 1,
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

async function generateLogo(apiKey: string, args: any) {
  const { brandName, industry, style, colors, description } = args;

  const prompt = `Professional logo design for "${brandName}", a ${industry} company. Style: ${style || 'modern minimalist'}. ${colors ? `Colors: ${colors.join(', ')}.` : ''} ${description || ''}. Clean, scalable, professional business logo on white background.`;

  const result = await callFal(apiKey, 'fal-ai/flux/dev', {
    prompt,
    negative_prompt: 'text, words, letters, watermark, low quality, blurry, amateur',
    image_size: { width: 1024, height: 1024 },
    num_images: 4,
    enable_safety_checker: true,
  });

  return {
    logos: result.images?.map((img: any) => ({
      url: img.url,
      width: img.width,
      height: img.height,
    })) || [],
    brandName,
    style,
  };
}

async function imageToImage(apiKey: string, args: any) {
  const { imageUrl, prompt, strength } = args;

  const result = await callFal(apiKey, 'fal-ai/flux/dev/image-to-image', {
    image_url: imageUrl,
    prompt,
    strength: strength || 0.75,
    num_images: 1,
  });

  return {
    images: result.images?.map((img: any) => ({
      url: img.url,
      width: img.width,
      height: img.height,
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
  const { text, voice, speed } = args;

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
