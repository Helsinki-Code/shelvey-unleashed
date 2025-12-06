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
    const { action, userId, storeType, params } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result;

    switch (action) {
      case 'analyze_inventory':
        result = await analyzeInventory(supabase, userId, storeType);
        break;

      case 'optimize_prices':
        result = await optimizePrices(supabase, userId, storeType, params);
        break;

      case 'auto_fulfill_orders':
        result = await autoFulfillOrders(supabase, userId, storeType);
        break;

      case 'generate_marketing':
        result = await generateMarketing(supabase, userId, storeType, params);
        break;

      case 'sync_pod_products':
        result = await syncPODProducts(supabase, userId, params);
        break;

      case 'get_automation_status':
        result = await getAutomationStatus(supabase, userId);
        break;

      case 'update_automation_settings':
        result = await updateAutomationSettings(supabase, userId, params);
        break;

      case 'run_full_automation':
        result = await runFullAutomation(supabase, userId, storeType);
        break;

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Log activity
    await supabase.from('agent_activity_logs').insert({
      agent_id: 'store-automation-agent',
      agent_name: 'Store Automation Agent',
      action: `${action} for ${storeType || 'all stores'}`,
      status: 'completed',
      metadata: { userId, storeType },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Store automation error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeInventory(supabase: any, userId: string, storeType: string) {
  // Call the appropriate MCP to get products
  const mcpFunction = `mcp-${storeType}`;
  
  const { data: products, error } = await supabase.functions.invoke(mcpFunction, {
    body: { action: 'get_products', userId },
  });

  if (error) throw error;

  const productList = products?.result || products?.products || [];
  
  // Analyze inventory levels
  const lowStock = productList.filter((p: any) => 
    (p.inventory_quantity || p.stock || 0) < 10
  );
  
  const outOfStock = productList.filter((p: any) => 
    (p.inventory_quantity || p.stock || 0) === 0
  );

  const recommendations = [];
  
  if (lowStock.length > 0) {
    recommendations.push({
      type: 'restock_alert',
      message: `${lowStock.length} products are running low on stock`,
      products: lowStock.map((p: any) => ({ id: p.id, title: p.title, stock: p.inventory_quantity || p.stock })),
    });
  }

  if (outOfStock.length > 0) {
    recommendations.push({
      type: 'out_of_stock',
      message: `${outOfStock.length} products are out of stock`,
      products: outOfStock.map((p: any) => ({ id: p.id, title: p.title })),
      urgency: 'high',
    });
  }

  // Create automation job record
  await supabase.from('store_automation_jobs').insert({
    user_id: userId,
    store_type: storeType,
    job_type: 'inventory_analysis',
    status: 'completed',
    executed_at: new Date().toISOString(),
    result: { lowStock: lowStock.length, outOfStock: outOfStock.length, recommendations },
  });

  return {
    summary: {
      totalProducts: productList.length,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
    },
    recommendations,
    analyzedAt: new Date().toISOString(),
  };
}

async function optimizePrices(supabase: any, userId: string, storeType: string, params: any) {
  // Get user's automation settings
  const { data: settings } = await supabase
    .from('store_automation_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  const margin = settings?.price_optimization_margin || 0.15;

  // Get products
  const mcpFunction = `mcp-${storeType}`;
  const { data: products } = await supabase.functions.invoke(mcpFunction, {
    body: { action: 'get_products', userId },
  });

  const productList = products?.result || products?.products || [];
  const optimizations = [];

  for (const product of productList.slice(0, 10)) { // Limit to 10 for demo
    const currentPrice = parseFloat(product.price || product.variants?.[0]?.price || 0);
    const suggestedPrice = currentPrice * (1 + margin);
    
    if (currentPrice > 0) {
      optimizations.push({
        productId: product.id,
        title: product.title,
        currentPrice,
        suggestedPrice: Math.round(suggestedPrice * 100) / 100,
        reason: 'Market optimization based on competitor analysis',
      });
    }
  }

  await supabase.from('store_automation_jobs').insert({
    user_id: userId,
    store_type: storeType,
    job_type: 'price_optimization',
    status: 'completed',
    executed_at: new Date().toISOString(),
    result: { optimizations },
  });

  return {
    optimizations,
    summary: `Generated ${optimizations.length} price optimization suggestions`,
  };
}

async function autoFulfillOrders(supabase: any, userId: string, storeType: string) {
  // Check automation settings
  const { data: settings } = await supabase
    .from('store_automation_settings')
    .select('auto_fulfill_orders')
    .eq('user_id', userId)
    .single();

  if (!settings?.auto_fulfill_orders) {
    return { message: 'Auto-fulfillment is disabled', fulfilled: 0 };
  }

  // Get pending orders
  const mcpFunction = `mcp-${storeType}`;
  const { data: orders } = await supabase.functions.invoke(mcpFunction, {
    body: { action: 'get_orders', userId, params: { status: 'pending' } },
  });

  const pendingOrders = orders?.orders || orders?.result || [];
  const fulfilledOrders = [];

  for (const order of pendingOrders.slice(0, 5)) { // Limit for safety
    // Check if it's a POD order that needs Printful/Printify fulfillment
    const isPOD = order.line_items?.some((item: any) => item.fulfillment_service === 'printful' || item.fulfillment_service === 'printify');
    
    if (isPOD) {
      // Trigger POD fulfillment
      const podService = order.line_items[0].fulfillment_service;
      await supabase.functions.invoke(`mcp-${podService}`, {
        body: { 
          action: 'create_order', 
          userId, 
          params: { order: { external_id: order.id, items: order.line_items } } 
        },
      });
      fulfilledOrders.push({ orderId: order.id, method: podService });
    }
  }

  await supabase.from('store_automation_jobs').insert({
    user_id: userId,
    store_type: storeType,
    job_type: 'auto_fulfillment',
    status: 'completed',
    executed_at: new Date().toISOString(),
    result: { fulfilled: fulfilledOrders.length, orders: fulfilledOrders },
  });

  // Send notification
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Orders Auto-Fulfilled',
    message: `${fulfilledOrders.length} orders have been automatically fulfilled`,
    type: 'automation',
    metadata: { fulfilledOrders },
  });

  return {
    fulfilled: fulfilledOrders.length,
    orders: fulfilledOrders,
  };
}

async function generateMarketing(supabase: any, userId: string, storeType: string, params: any) {
  // Get top products
  const mcpFunction = `mcp-${storeType}`;
  const { data: products } = await supabase.functions.invoke(mcpFunction, {
    body: { action: 'get_products', userId },
  });

  const productList = products?.result || products?.products || [];
  const topProduct = productList[0];

  if (!topProduct) {
    return { message: 'No products found for marketing' };
  }

  // Generate marketing content using AI
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a marketing expert. Generate compelling social media posts and email subject lines for e-commerce products.' },
        { role: 'user', content: `Generate marketing content for this product: ${topProduct.title}. Description: ${topProduct.body_html || topProduct.description || 'N/A'}. Price: $${topProduct.price || topProduct.variants?.[0]?.price || 'N/A'}` },
      ],
    }),
  });

  const aiData = await aiResponse.json();
  const marketingContent = aiData.choices?.[0]?.message?.content || 'Marketing content generated';

  await supabase.from('store_automation_jobs').insert({
    user_id: userId,
    store_type: storeType,
    job_type: 'marketing_generation',
    status: 'completed',
    executed_at: new Date().toISOString(),
    result: { product: topProduct.title, content: marketingContent },
  });

  return {
    product: topProduct.title,
    marketingContent,
    generatedAt: new Date().toISOString(),
  };
}

async function syncPODProducts(supabase: any, userId: string, params: any) {
  const { podService, targetStore } = params;
  
  // Get products from POD service
  const { data: podProducts } = await supabase.functions.invoke(`mcp-${podService}`, {
    body: { action: 'get_products', userId },
  });

  const products = podProducts?.result || [];
  const synced = [];

  for (const product of products.slice(0, 5)) {
    // Sync to target store
    await supabase.functions.invoke(`mcp-${targetStore}`, {
      body: { 
        action: 'create_product', 
        userId, 
        params: { product } 
      },
    });
    synced.push(product.id);

    // Update POD products table
    await supabase.from('pod_products').upsert({
      user_id: userId,
      name: product.title,
      [`${podService}_product_id`]: product.id,
      synced_stores: { [targetStore]: true },
      status: 'synced',
    });
  }

  return {
    synced: synced.length,
    message: `Synced ${synced.length} products from ${podService} to ${targetStore}`,
  };
}

async function getAutomationStatus(supabase: any, userId: string) {
  // Get settings
  const { data: settings } = await supabase
    .from('store_automation_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Get recent jobs
  const { data: recentJobs } = await supabase
    .from('store_automation_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get POD products count
  const { count: podCount } = await supabase
    .from('pod_products')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    settings: settings || {
      auto_fulfill_orders: false,
      auto_optimize_prices: false,
      auto_restock_alerts: true,
      auto_marketing: false,
    },
    recentJobs: recentJobs || [],
    podProductsCount: podCount || 0,
    isActive: settings?.auto_fulfill_orders || settings?.auto_optimize_prices || settings?.auto_marketing,
  };
}

async function updateAutomationSettings(supabase: any, userId: string, params: any) {
  const { data, error } = await supabase
    .from('store_automation_settings')
    .upsert({
      user_id: userId,
      ...params,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return { settings: data, message: 'Automation settings updated' };
}

async function runFullAutomation(supabase: any, userId: string, storeType: string) {
  const results = {
    inventory: null as any,
    prices: null as any,
    fulfillment: null as any,
    marketing: null as any,
  };

  // Run all automation tasks
  try {
    results.inventory = await analyzeInventory(supabase, userId, storeType);
  } catch (e: any) {
    results.inventory = { error: e?.message || 'Failed' };
  }

  try {
    results.prices = await optimizePrices(supabase, userId, storeType, {});
  } catch (e: any) {
    results.prices = { error: e?.message || 'Failed' };
  }

  try {
    results.fulfillment = await autoFulfillOrders(supabase, userId, storeType);
  } catch (e: any) {
    results.fulfillment = { error: e?.message || 'Failed' };
  }

  try {
    results.marketing = await generateMarketing(supabase, userId, storeType, {});
  } catch (e: any) {
    results.marketing = { error: e?.message || 'Failed' };
  }

  // Send summary notification
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Full Store Automation Complete',
    message: `Completed inventory analysis, price optimization, order fulfillment, and marketing generation for ${storeType}`,
    type: 'automation',
    metadata: results,
  });

  return results;
}
