import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CodeGenRequest {
  action: 'generate' | 'apply_patch' | 'search_replace' | 'review' | 'get_patches';
  prompt?: string;
  file_path?: string;
  original_content?: string;
  search?: string;
  replace?: string;
  patch_id?: string;
  project_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: CodeGenRequest = await req.json();
    const { action } = body;

    let result;

    switch (action) {
      case 'generate':
        result = await generateCode(body, user.id, supabase);
        break;
      case 'apply_patch':
        result = await applyPatch(body, user.id, supabase);
        break;
      case 'search_replace':
        result = await searchReplace(body, user.id, supabase);
        break;
      case 'review':
        result = await reviewCode(body, user.id);
        break;
      case 'get_patches':
        result = await getPatches(user.id, supabase, body.project_id);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Code generator error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateCode(body: CodeGenRequest, userId: string, supabase: any) {
  const { prompt, file_path, project_id } = body;
  
  if (!prompt) {
    throw new Error('Prompt is required for code generation');
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const systemPrompt = `You are an expert code generator. Generate clean, well-documented, production-ready code based on the user's request.

Guidelines:
- Use TypeScript for type safety
- Follow React best practices with functional components and hooks
- Use Tailwind CSS for styling with semantic tokens
- Include proper error handling
- Add JSDoc comments for complex functions
- Keep code modular and reusable

Output format:
- Return ONLY the code, no explanations
- Use proper indentation and formatting`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI generation failed: ${errorText}`);
  }

  const data = await response.json();
  const generatedCode = data.choices[0].message.content;

  // Save as pending patch
  const { data: patch, error } = await supabase
    .from('code_patches')
    .insert({
      user_id: userId,
      project_id: project_id || null,
      file_path: file_path || 'generated_code.tsx',
      patch_content: generatedCode,
      patch_type: 'full_replace',
      status: 'pending',
      metadata: { prompt }
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to save patch:', error);
  }

  return {
    success: true,
    code: generatedCode,
    patch_id: patch?.id,
    file_path: file_path || 'generated_code.tsx'
  };
}

async function applyPatch(body: CodeGenRequest, userId: string, supabase: any) {
  const { patch_id, original_content } = body;
  
  if (!patch_id) {
    throw new Error('patch_id is required');
  }

  // Get the patch
  const { data: patch, error: fetchError } = await supabase
    .from('code_patches')
    .select('*')
    .eq('id', patch_id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !patch) {
    throw new Error('Patch not found');
  }

  // Apply the patch based on type
  let newContent: string;
  
  switch (patch.patch_type) {
    case 'full_replace':
      newContent = patch.patch_content;
      break;
    case 'search_replace':
      if (!original_content || !patch.metadata?.search) {
        throw new Error('Original content and search pattern required for search_replace');
      }
      newContent = original_content.replace(patch.metadata.search, patch.patch_content);
      break;
    case 'diff':
      // For diff patches, we'd need a proper diff library
      // For now, treat as full replace
      newContent = patch.patch_content;
      break;
    case 'insert':
      if (!original_content) {
        throw new Error('Original content required for insert');
      }
      const insertPosition = patch.metadata?.position || original_content.length;
      newContent = original_content.slice(0, insertPosition) + 
                   patch.patch_content + 
                   original_content.slice(insertPosition);
      break;
    default:
      newContent = patch.patch_content;
  }

  // Update patch status
  const { error: updateError } = await supabase
    .from('code_patches')
    .update({
      status: 'applied',
      original_content: original_content || null,
      new_content: newContent,
      applied_at: new Date().toISOString()
    })
    .eq('id', patch_id);

  if (updateError) {
    console.error('Failed to update patch status:', updateError);
  }

  return {
    success: true,
    new_content: newContent,
    patch_id
  };
}

async function searchReplace(body: CodeGenRequest, userId: string, supabase: any) {
  const { file_path, original_content, search, replace, project_id } = body;
  
  if (!original_content || !search || replace === undefined) {
    throw new Error('original_content, search, and replace are required');
  }

  // Perform the replacement
  const newContent = original_content.split(search).join(replace);
  const changeCount = (original_content.match(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

  // Save as applied patch
  const { data: patch, error } = await supabase
    .from('code_patches')
    .insert({
      user_id: userId,
      project_id: project_id || null,
      file_path: file_path || 'unknown',
      original_content,
      patch_content: replace,
      new_content: newContent,
      patch_type: 'search_replace',
      status: 'applied',
      applied_at: new Date().toISOString(),
      metadata: { search, replace, changes_count: changeCount }
    })
    .select()
    .single();

  return {
    success: true,
    new_content: newContent,
    changes_count: changeCount,
    patch_id: patch?.id
  };
}

async function reviewCode(body: CodeGenRequest, userId: string) {
  const { original_content, prompt } = body;
  
  if (!original_content) {
    throw new Error('original_content is required for review');
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const systemPrompt = `You are an expert code reviewer. Analyze the provided code and give constructive feedback.

Review aspects:
- Code quality and readability
- Performance considerations
- Security vulnerabilities
- Best practices adherence
- Potential bugs or edge cases
- Suggestions for improvement

Format your response as:
## Summary
Brief overview of code quality

## Issues Found
- Issue 1: description
- Issue 2: description

## Suggestions
- Suggestion 1: description
- Suggestion 2: description

## Security Concerns
Any security issues found

## Overall Score
Rating out of 10 with brief justification`;

  const userPrompt = prompt 
    ? `${prompt}\n\nCode to review:\n\`\`\`\n${original_content}\n\`\`\``
    : `Review this code:\n\`\`\`\n${original_content}\n\`\`\``;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI review failed: ${errorText}`);
  }

  const data = await response.json();
  const review = data.choices[0].message.content;

  return {
    success: true,
    review
  };
}

async function getPatches(userId: string, supabase: any, projectId?: string) {
  let query = supabase
    .from('code_patches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch patches: ${error.message}`);
  }

  return {
    success: true,
    patches: data
  };
}
