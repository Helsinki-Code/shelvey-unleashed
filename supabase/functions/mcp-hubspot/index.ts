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
    const { tool, arguments: args, credentials } = await req.json();
    
    const accessToken = credentials?.HUBSPOT_ACCESS_TOKEN;
    
    if (!accessToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'HubSpot access token required. Please configure your HubSpot API credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://api.hubapi.com';
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    let result;

    switch (tool) {
      case 'get_contacts': {
        const limit = args?.limit || 100;
        const response = await fetch(
          `${baseUrl}/crm/v3/objects/contacts?limit=${limit}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'create_contact': {
        const response = await fetch(`${baseUrl}/crm/v3/objects/contacts`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            properties: {
              email: args.email,
              firstname: args.first_name,
              lastname: args.last_name,
              phone: args.phone,
              company: args.company,
            }
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_deals': {
        const limit = args?.limit || 100;
        const response = await fetch(
          `${baseUrl}/crm/v3/objects/deals?limit=${limit}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'create_deal': {
        const response = await fetch(`${baseUrl}/crm/v3/objects/deals`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            properties: {
              dealname: args.name,
              amount: args.amount,
              dealstage: args.stage || 'appointmentscheduled',
              pipeline: args.pipeline || 'default',
            }
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_companies': {
        const limit = args?.limit || 100;
        const response = await fetch(
          `${baseUrl}/crm/v3/objects/companies?limit=${limit}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'create_company': {
        const response = await fetch(`${baseUrl}/crm/v3/objects/companies`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            properties: {
              name: args.name,
              domain: args.domain,
              industry: args.industry,
              city: args.city,
              state: args.state,
            }
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_tickets': {
        const limit = args?.limit || 100;
        const response = await fetch(
          `${baseUrl}/crm/v3/objects/tickets?limit=${limit}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'create_ticket': {
        const response = await fetch(`${baseUrl}/crm/v3/objects/tickets`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            properties: {
              subject: args.subject,
              content: args.content,
              hs_pipeline: args.pipeline || '0',
              hs_pipeline_stage: args.stage || '1',
            }
          }),
        });
        result = await response.json();
        break;
      }

      case 'update_deal_stage': {
        const response = await fetch(`${baseUrl}/crm/v3/objects/deals/${args.deal_id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            properties: {
              dealstage: args.stage,
            }
          }),
        });
        result = await response.json();
        break;
      }

      case 'send_email': {
        const response = await fetch(`${baseUrl}/marketing/v3/transactional/single-email/send`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            emailId: args.template_id,
            message: {
              to: args.to,
            },
            contactProperties: args.properties || {},
          }),
        });
        result = await response.json();
        break;
      }

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Unknown tool: ${tool}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('HubSpot MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
