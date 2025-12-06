import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
    
    if (!stripeKey || !vercelToken) {
      throw new Error("Service not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Session ID required");
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ error: "Payment not completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const metadata = session.metadata;
    if (!metadata || metadata.purchaseType !== "domain") {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const domain = metadata.domain;
    const contactInfo = JSON.parse(metadata.contactInfo);
    const userId = metadata.userId;

    // Purchase domain via Vercel
    const purchaseResponse = await fetch(
      `https://api.vercel.com/v5/domains/registrar/buy`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: domain,
          expectedPrice: parseFloat(metadata.registrarPrice),
          renew: metadata.autoRenew === "true",
          country: contactInfo.country,
          contactDetails: {
            firstName: contactInfo.firstName,
            lastName: contactInfo.lastName,
            email: contactInfo.email,
            phone: contactInfo.phone,
            addressLine1: contactInfo.address1,
            addressLine2: contactInfo.address2 || "",
            city: contactInfo.city,
            state: contactInfo.state,
            postalCode: contactInfo.zip,
            country: contactInfo.country,
          },
        }),
      }
    );

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (!purchaseResponse.ok) {
      const errorData = await purchaseResponse.json();
      console.error("Vercel purchase error:", errorData);
      
      // Update domain status to failed
      await serviceClient.from("user_domains")
        .update({ status: "purchase_failed" })
        .eq("domain_name", domain)
        .eq("user_id", userId);

      throw new Error(`Domain purchase failed: ${errorData.error?.message || "Unknown error"}`);
    }

    const purchaseData = await purchaseResponse.json();
    
    // Calculate expiration date (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Update domain record with success
    await serviceClient.from("user_domains")
      .update({
        status: "active",
        registrar_domain_id: purchaseData.domain?.id || domain,
        expires_at: expiresAt.toISOString(),
        purchased_at: new Date().toISOString(),
      })
      .eq("domain_name", domain)
      .eq("user_id", userId);

    // Create notification
    await serviceClient.from("notifications").insert({
      user_id: userId,
      type: "domain_purchased",
      title: "Domain Purchased Successfully!",
      message: `Your domain ${domain} has been registered and is now active.`,
      metadata: { domain, expiresAt: expiresAt.toISOString() },
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        domain,
        expiresAt: expiresAt.toISOString(),
        message: "Domain purchased successfully!",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Complete domain purchase error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
