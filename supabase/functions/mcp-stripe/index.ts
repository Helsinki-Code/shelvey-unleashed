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
    const { userId, tool, params, credentials } = await req.json();
    
    const apiKey = credentials?.STRIPE_API_KEY || credentials?.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('Stripe API key not configured');
    }

    console.log(`[MCP-STRIPE] Executing tool: ${tool} for user: ${userId}`);
    const startTime = Date.now();

    let result;
    const baseUrl = 'https://api.stripe.com/v1';
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    switch (tool) {
      case 'list_customers':
        const customersRes = await fetch(`${baseUrl}/customers?limit=${params?.limit || 10}`, { headers });
        result = await customersRes.json();
        break;

      case 'create_customer':
        const customerBody = new URLSearchParams();
        if (params?.email) customerBody.append('email', params.email);
        if (params?.name) customerBody.append('name', params.name);
        const createCustomerRes = await fetch(`${baseUrl}/customers`, {
          method: 'POST',
          headers,
          body: customerBody.toString(),
        });
        result = await createCustomerRes.json();
        break;

      case 'list_products':
        const productsRes = await fetch(`${baseUrl}/products?limit=${params?.limit || 10}`, { headers });
        result = await productsRes.json();
        break;

      case 'list_prices':
        const pricesRes = await fetch(`${baseUrl}/prices?limit=${params?.limit || 10}`, { headers });
        result = await pricesRes.json();
        break;

      case 'create_payment_intent':
        const piBody = new URLSearchParams();
        piBody.append('amount', String(params?.amount || 1000));
        piBody.append('currency', params?.currency || 'usd');
        if (params?.customer) piBody.append('customer', params.customer);
        const piRes = await fetch(`${baseUrl}/payment_intents`, {
          method: 'POST',
          headers,
          body: piBody.toString(),
        });
        result = await piRes.json();
        break;

      case 'list_invoices':
        const invoicesRes = await fetch(`${baseUrl}/invoices?limit=${params?.limit || 10}`, { headers });
        result = await invoicesRes.json();
        break;

      case 'list_subscriptions':
        const subsRes = await fetch(`${baseUrl}/subscriptions?limit=${params?.limit || 10}`, { headers });
        result = await subsRes.json();
        break;

      case 'get_balance':
        const balanceRes = await fetch(`${baseUrl}/balance`, { headers });
        result = await balanceRes.json();
        break;

      default:
        throw new Error(`Unknown Stripe tool: ${tool}`);
    }

    const latencyMs = Date.now() - startTime;
    console.log(`[MCP-STRIPE] Tool ${tool} completed in ${latencyMs}ms`);

    return new Response(JSON.stringify({
      success: true,
      data: result,
      latencyMs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MCP-STRIPE] Error:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
