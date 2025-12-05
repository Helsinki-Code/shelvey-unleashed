import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GITHUB_API_URL = 'https://api.github.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, arguments: args, credentials } = await req.json();

    const token = credentials?.GITHUB_TOKEN;
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'GITHUB_TOKEN not provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (tool) {
      case 'get_user':
        result = await getUser(token, args);
        break;
      case 'search_repos':
        result = await searchRepos(token, args);
        break;
      case 'get_repo':
        result = await getRepo(token, args);
        break;
      case 'create_repo':
        result = await createRepo(token, args);
        break;
      case 'get_file':
        result = await getFile(token, args);
        break;
      case 'create_file':
        result = await createFile(token, args);
        break;
      case 'create_issue':
        result = await createIssue(token, args);
        break;
      case 'get_issues':
        result = await getIssues(token, args);
        break;
      case 'search_code':
        result = await searchCode(token, args);
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
    console.error('[mcp-github] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function callGitHub(token: string, endpoint: string, method = 'GET', body?: any) {
  const response = await fetch(`${GITHUB_API_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function getUser(token: string, args: any) {
  const { username } = args;
  const endpoint = username ? `/users/${username}` : '/user';
  const result = await callGitHub(token, endpoint);
  return { user: result };
}

async function searchRepos(token: string, args: any) {
  const { query, sort, order, perPage } = args;
  const params = new URLSearchParams({
    q: query,
    sort: sort || 'stars',
    order: order || 'desc',
    per_page: String(perPage || 10),
  });

  const result = await callGitHub(token, `/search/repositories?${params.toString()}`);
  return {
    repos: result.items,
    totalCount: result.total_count,
  };
}

async function getRepo(token: string, args: any) {
  const { owner, repo } = args;
  const result = await callGitHub(token, `/repos/${owner}/${repo}`);
  return { repo: result };
}

async function createRepo(token: string, args: any) {
  const { name, description, isPrivate, autoInit } = args;
  
  const result = await callGitHub(token, '/user/repos', 'POST', {
    name,
    description,
    private: isPrivate || false,
    auto_init: autoInit || true,
  });

  return { repo: result };
}

async function getFile(token: string, args: any) {
  const { owner, repo, path, ref } = args;
  const endpoint = `/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`;
  
  const result = await callGitHub(token, endpoint);
  
  let content = '';
  if (result.content && result.encoding === 'base64') {
    content = atob(result.content);
  }

  return {
    file: {
      ...result,
      decodedContent: content,
    },
  };
}

async function createFile(token: string, args: any) {
  const { owner, repo, path, content, message, branch } = args;
  
  const result = await callGitHub(token, `/repos/${owner}/${repo}/contents/${path}`, 'PUT', {
    message: message || `Create ${path}`,
    content: btoa(content),
    branch: branch || 'main',
  });

  return { file: result };
}

async function createIssue(token: string, args: any) {
  const { owner, repo, title, body, labels, assignees } = args;
  
  const result = await callGitHub(token, `/repos/${owner}/${repo}/issues`, 'POST', {
    title,
    body,
    labels: labels || [],
    assignees: assignees || [],
  });

  return { issue: result };
}

async function getIssues(token: string, args: any) {
  const { owner, repo, state, perPage } = args;
  const params = new URLSearchParams({
    state: state || 'open',
    per_page: String(perPage || 30),
  });

  const result = await callGitHub(token, `/repos/${owner}/${repo}/issues?${params.toString()}`);
  return { issues: result };
}

async function searchCode(token: string, args: any) {
  const { query, perPage } = args;
  const params = new URLSearchParams({
    q: query,
    per_page: String(perPage || 10),
  });

  const result = await callGitHub(token, `/search/code?${params.toString()}`);
  return {
    results: result.items,
    totalCount: result.total_count,
  };
}
