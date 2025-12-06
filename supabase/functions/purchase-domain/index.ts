import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pricing strategy
const STANDARD_MARKUP = 8.00;
const PREMIUM_MARKUP_PERCENT = 0.40;

function calculateOurPrice(registrarPrice: number, isPremium: boolean): number {
  if (isPremium) {
    return registrarPrice * (1 + PREMIUM_MARKUP_PERCENT);
  }
  return registrarPrice + STANDARD_MARKUP;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    const user = userData.user;
    const { domain, contactInfo, autoRenew = true, privacyEnabled = true } = await req.json();

    if (!domain || !contactInfo) {
      return new Response(
        JSON.stringify({ error: "Domain and contact information required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate contact info
    const requiredFields = ["firstName", "lastName", "email", "phone", "address1", "city", "state", "zip", "country"];
    for (const field of requiredFields) {
      if (!contactInfo[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!vercelToken || !stripeKey) {
      throw new Error("Service not configured");
    }

    // Check domain availability and get price
    const priceResponse = await fetch(
      `https://api.vercel.com/v4/domains/price?name=${domain}`,
      {
        headers: { Authorization: `Bearer ${vercelToken}` },
      }
    );

    if (!priceResponse.ok) {
      throw new Error("Failed to get domain pricing");
    }

    const priceData = await priceResponse.json();
    const registrarPrice = priceData.price || 12.00;
    const isPremium = priceData.premium || registrarPrice > 50;
    const ourPrice = calculateOurPrice(registrarPrice, isPremium);
    const ourPriceCents = Math.ceil(ourPrice * 100);

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // Create Stripe Checkout session for domain purchase
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Domain: ${domain}`,
              description: `1 year registration${privacyEnabled ? " with WHOIS privacy" : ""}`,
              metadata: {
                type: "domain_purchase",
                domain: domain,
                isPremium: isPremium ? "true" : "false",
              },
            },
            unit_amount: ourPriceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/domains?purchased=${domain}`,
      cancel_url: `${req.headers.get("origin")}/domains?canceled=true`,
      metadata: {
        userId: user.id,
        domain: domain,
        registrarPrice: registrarPrice.toString(),
        ourPrice: ourPrice.toString(),
        isPremium: isPremium ? "true" : "false",
        autoRenew: autoRenew ? "true" : "false",
        privacyEnabled: privacyEnabled ? "true" : "false",
        contactInfo: JSON.stringify(contactInfo),
        purchaseType: "domain",
      },
    });

    // Store pending domain purchase
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await serviceClient.from("user_domains").insert({
      user_id: user.id,
      domain_name: domain,
      registrar: "vercel",
      purchase_price: registrarPrice,
      our_price: ourPrice,
      is_premium: isPremium,
      auto_renew: autoRenew,
      privacy_enabled: privacyEnabled,
      status: "pending_payment",
      contact_info: contactInfo,
    });

    return new Response(
      JSON.stringify({ 
        url: session.url,
        domain,
        registrarPrice,
        ourPrice,
        isPremium,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Domain purchase error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
