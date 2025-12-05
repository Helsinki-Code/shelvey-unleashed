import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, arguments: args, credentials } = await req.json();

    const accessToken = credentials?.LINKEDIN_ACCESS_TOKEN;
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'LINKEDIN_ACCESS_TOKEN not provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (tool) {
      case 'get_profile':
        result = await getProfile(accessToken, args);
        break;
      case 'search_people':
        result = await searchPeople(accessToken, args);
        break;
      case 'search_companies':
        result = await searchCompanies(accessToken, args);
        break;
      case 'post_update':
        result = await postUpdate(accessToken, args);
        break;
      case 'get_company':
        result = await getCompany(accessToken, args);
        break;
      case 'get_connections':
        result = await getConnections(accessToken, args);
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
    console.error('[mcp-linkedin] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function callLinkedIn(accessToken: string, endpoint: string, method = 'GET', body?: any) {
  const response = await fetch(`${LINKEDIN_API_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LinkedIn API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function getProfile(accessToken: string, args: any) {
  const { fields } = args;
  
  const defaultFields = 'id,firstName,lastName,profilePicture,headline,vanityName,industryId';
  const result = await callLinkedIn(accessToken, `/me?projection=(${fields || defaultFields})`);

  return {
    profile: result,
  };
}

async function searchPeople(accessToken: string, args: any) {
  const { keywords, industry, location, title, count } = args;

  // LinkedIn's People Search API requires specific access
  // Using a simplified approach with available endpoints
  const queryParams = new URLSearchParams();
  if (keywords) queryParams.append('q', 'search');
  if (keywords) queryParams.append('keywords', keywords);
  if (count) queryParams.append('count', String(count));

  try {
    const result = await callLinkedIn(accessToken, `/search/blended?${queryParams.toString()}`);
    return {
      people: result.elements || [],
      total: result.paging?.total || 0,
    };
  } catch (error) {
    // Fallback response when search is not available
    return {
      people: [],
      message: 'LinkedIn People Search requires specific API access. Consider using LinkedIn Sales Navigator API.',
      searchParams: { keywords, industry, location, title },
    };
  }
}

async function searchCompanies(accessToken: string, args: any) {
  const { keywords, industry, size, count } = args;

  const queryParams = new URLSearchParams();
  if (keywords) queryParams.append('keywords', keywords);
  if (count) queryParams.append('count', String(count || 10));

  try {
    const result = await callLinkedIn(accessToken, `/organizationSearch?${queryParams.toString()}`);
    return {
      companies: result.elements || [],
      total: result.paging?.total || 0,
    };
  } catch (error) {
    return {
      companies: [],
      message: 'LinkedIn Company Search requires Marketing Developer Platform access.',
      searchParams: { keywords, industry, size },
    };
  }
}

async function postUpdate(accessToken: string, args: any) {
  const { text, visibility } = args;

  // First, get the user's URN
  const profileResult = await callLinkedIn(accessToken, '/me');
  const personUrn = `urn:li:person:${profileResult.id}`;

  const postBody = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text,
        },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': visibility || 'PUBLIC',
    },
  };

  const result = await callLinkedIn(accessToken, '/ugcPosts', 'POST', postBody);

  return {
    postId: result.id,
    posted: true,
    text,
  };
}

async function getCompany(accessToken: string, args: any) {
  const { companyId, vanityName } = args;

  let endpoint = '/organizations';
  if (companyId) {
    endpoint = `/organizations/${companyId}`;
  } else if (vanityName) {
    endpoint = `/organizations?q=vanityName&vanityName=${vanityName}`;
  }

  const result = await callLinkedIn(accessToken, endpoint);

  return {
    company: result.elements ? result.elements[0] : result,
  };
}

async function getConnections(accessToken: string, args: any) {
  const { start, count } = args;

  const queryParams = new URLSearchParams();
  queryParams.append('q', 'viewer');
  if (start) queryParams.append('start', String(start));
  if (count) queryParams.append('count', String(count || 50));

  try {
    const result = await callLinkedIn(accessToken, `/connections?${queryParams.toString()}`);
    return {
      connections: result.elements || [],
      total: result.paging?.total || 0,
    };
  } catch (error) {
    return {
      connections: [],
      message: 'Connections API requires specific permissions.',
    };
  }
}
