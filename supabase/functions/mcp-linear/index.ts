import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, tool, params, credentials } = await req.json();
    
    const apiKey = credentials?.LINEAR_API_KEY;
    if (!apiKey) {
      throw new Error('Linear API key not configured');
    }

    console.log(`[MCP-LINEAR] Executing tool: ${tool} for user: ${userId}`);
    const startTime = Date.now();

    const graphqlEndpoint = 'https://api.linear.app/graphql';
    const headers = {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    };

    let query: string;
    let variables: Record<string, unknown> = {};
    let result;

    switch (tool) {
      case 'list_issues':
        query = `
          query Issues($first: Int) {
            issues(first: $first) {
              nodes {
                id
                title
                description
                state { name }
                priority
                assignee { name email }
                createdAt
                updatedAt
              }
            }
          }
        `;
        variables = { first: params?.limit || 20 };
        break;

      case 'create_issue':
        query = `
          mutation CreateIssue($input: IssueCreateInput!) {
            issueCreate(input: $input) {
              success
              issue {
                id
                title
                url
              }
            }
          }
        `;
        variables = {
          input: {
            title: params?.title,
            description: params?.description,
            teamId: params?.teamId,
            priority: params?.priority,
          }
        };
        break;

      case 'update_issue':
        query = `
          mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
            issueUpdate(id: $id, input: $input) {
              success
              issue {
                id
                title
                state { name }
              }
            }
          }
        `;
        variables = {
          id: params?.issueId,
          input: {
            title: params?.title,
            description: params?.description,
            stateId: params?.stateId,
          }
        };
        break;

      case 'list_teams':
        query = `
          query Teams {
            teams {
              nodes {
                id
                name
                key
                description
              }
            }
          }
        `;
        break;

      case 'list_projects':
        query = `
          query Projects($first: Int) {
            projects(first: $first) {
              nodes {
                id
                name
                description
                state
                progress
                startDate
                targetDate
              }
            }
          }
        `;
        variables = { first: params?.limit || 20 };
        break;

      case 'search_issues':
        query = `
          query SearchIssues($query: String!) {
            issueSearch(query: $query) {
              nodes {
                id
                title
                description
                state { name }
                url
              }
            }
          }
        `;
        variables = { query: params?.query || '' };
        break;

      default:
        throw new Error(`Unknown Linear tool: ${tool}`);
    }

    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    result = await response.json();
    const latencyMs = Date.now() - startTime;
    console.log(`[MCP-LINEAR] Tool ${tool} completed in ${latencyMs}ms`);

    return new Response(JSON.stringify({
      success: true,
      data: result.data,
      latencyMs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MCP-LINEAR] Error:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
