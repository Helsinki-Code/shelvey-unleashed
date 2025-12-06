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
    const { action, userId, params } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result;

    switch (action) {
      case 'create_product':
        result = await createPODProduct(supabase, userId, params);
        break;

      case 'generate_design':
        result = await generateDesign(supabase, userId, params);
        break;

      case 'sync_to_stores':
        result = await syncToStores(supabase, userId, params);
        break;

      case 'get_products':
        result = await getPODProducts(supabase, userId);
        break;

      case 'generate_mockups':
        result = await generateMockups(supabase, userId, params);
        break;

      case 'launch_product':
        result = await launchProduct(supabase, userId, params);
        break;

      case 'get_sales_analytics':
        result = await getSalesAnalytics(supabase, userId);
        break;

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Log activity
    await supabase.from('agent_activity_logs').insert({
      agent_id: 'pod-automation-agent',
      agent_name: 'POD Automation Agent',
      action,
      status: 'completed',
      metadata: { userId },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('POD automation error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createPODProduct(supabase: any, userId: string, params: any) {
  const { name, designUrl, podService, productType, description } = params;

  // Create product in POD service
  const { data: podProduct, error: podError } = await supabase.functions.invoke(`mcp-${podService}`, {
    body: { 
      action: 'create_product', 
      userId, 
      params: { 
        product: {
          title: name,
          description,
          // Product type configuration would be added here
        } 
      } 
    },
  });

  // Save to our database
  const { data, error } = await supabase
    .from('pod_products')
    .insert({
      user_id: userId,
      name,
      design_url: designUrl,
      [`${podService}_product_id`]: podProduct?.id,
      status: 'created',
    })
    .select()
    .single();

  if (error) throw error;

  return { 
    product: data, 
    podProduct,
    message: `Product "${name}" created in ${podService}` 
  };
}

async function generateDesign(supabase: any, userId: string, params: any) {
  const { prompt, style } = params;
  
  // Use Fal.ai to generate design
  const FAL_KEY = Deno.env.get('FAL_KEY');
  
  const response = await fetch('https://queue.fal.run/fal-ai/flux/dev', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `${style || 'Modern minimalist'} design for print-on-demand product: ${prompt}. High resolution, suitable for printing on apparel and merchandise.`,
      image_size: 'square_hd',
      num_images: 1,
    }),
  });

  const data = await response.json();
  const imageUrl = data.images?.[0]?.url;

  return {
    designUrl: imageUrl,
    prompt,
    message: 'Design generated successfully',
  };
}

async function syncToStores(supabase: any, userId: string, params: any) {
  const { productId, targetStores } = params;

  // Get POD product
  const { data: product } = await supabase
    .from('pod_products')
    .select('*')
    .eq('id', productId)
    .eq('user_id', userId)
    .single();

  if (!product) throw new Error('Product not found');

  const syncedStores: Record<string, boolean> = {};

  for (const store of targetStores) {
    try {
      // Get product from POD service
      const podService = product.printful_product_id ? 'printful' : 'printify';
      const podProductId = product.printful_product_id || product.printify_product_id;

      // Sync to target store
      await supabase.functions.invoke(`mcp-${store}`, {
        body: { 
          action: 'create_product', 
          userId, 
          params: { 
            product: {
              title: product.name,
              // Would include full product data from POD service
            } 
          } 
        },
      });

      syncedStores[store] = true;
    } catch (e) {
      syncedStores[store] = false;
      console.error(`Failed to sync to ${store}:`, e);
    }
  }

  // Update product record
  await supabase
    .from('pod_products')
    .update({ 
      synced_stores: { ...product.synced_stores, ...syncedStores },
      status: 'synced',
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId);

  return {
    syncedStores,
    message: `Product synced to ${Object.keys(syncedStores).filter(k => syncedStores[k]).length} stores`,
  };
}

async function getPODProducts(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('pod_products')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return { products: data };
}

async function generateMockups(supabase: any, userId: string, params: any) {
  const { productId, podService } = params;

  // Get product
  const { data: product } = await supabase
    .from('pod_products')
    .select('*')
    .eq('id', productId)
    .eq('user_id', userId)
    .single();

  if (!product) throw new Error('Product not found');

  const podProductId = product.printful_product_id || product.printify_product_id;

  // Generate mockups through POD service
  const { data: mockups } = await supabase.functions.invoke(`mcp-${podService}`, {
    body: { 
      action: 'generate_mockup', 
      userId, 
      params: { productId: podProductId } 
    },
  });

  return {
    mockups: mockups?.mockups || [],
    message: 'Mockups generated',
  };
}

async function launchProduct(supabase: any, userId: string, params: any) {
  const { productId, targetStores, generateMarketing } = params;

  // Sync to stores
  const syncResult = await syncToStores(supabase, userId, { productId, targetStores });

  // Generate marketing if requested
  let marketingContent = null;
  if (generateMarketing) {
    const { data: product } = await supabase
      .from('pod_products')
      .select('*')
      .eq('id', productId)
      .single();

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
          { role: 'system', content: 'You are a marketing expert for print-on-demand products. Create engaging social media posts.' },
          { role: 'user', content: `Create 3 social media posts for launching this product: "${product.name}". Make them engaging and include relevant hashtags.` },
        ],
      }),
    });

    const aiData = await aiResponse.json();
    marketingContent = aiData.choices?.[0]?.message?.content;
  }

  // Update product status
  await supabase
    .from('pod_products')
    .update({ status: 'launched', updated_at: new Date().toISOString() })
    .eq('id', productId);

  // Send notification
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Product Launched!',
    message: `Your POD product has been launched to ${targetStores.length} stores`,
    type: 'pod',
    metadata: { productId, stores: targetStores },
  });

  return {
    sync: syncResult,
    marketing: marketingContent,
    message: 'Product launched successfully!',
  };
}

async function getSalesAnalytics(supabase: any, userId: string) {
  const { data: products } = await supabase
    .from('pod_products')
    .select('*')
    .eq('user_id', userId);

  const totalProducts = products?.length || 0;
  const totalSales = products?.reduce((sum: number, p: any) => sum + (p.sales_count || 0), 0) || 0;
  const totalRevenue = products?.reduce((sum: number, p: any) => sum + (p.revenue || 0), 0) || 0;
  const totalCost = products?.reduce((sum: number, p: any) => sum + (p.cost || 0), 0) || 0;

  return {
    totalProducts,
    totalSales,
    totalRevenue,
    totalCost,
    profit: totalRevenue - totalCost,
    topProducts: products?.sort((a: any, b: any) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 5) || [],
  };
}
