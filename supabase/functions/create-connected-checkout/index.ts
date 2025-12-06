import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ShelVey takes 3% application fee
const APPLICATION_FEE_PERCENT = 0.03;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      connectedAccountId,
      priceInCents,
      productName,
      productDescription,
      successUrl,
      cancelUrl,
      customerEmail,
      mode = 'payment' // 'payment' or 'subscription'
    } = await req.json();

    if (!connectedAccountId || !priceInCents || !productName) {
      throw new Error("Missing required fields: connectedAccountId, priceInCents, productName");
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    // Calculate application fee (3% of the payment)
    const applicationFeeAmount = Math.round(priceInCents * APPLICATION_FEE_PERCENT);

    console.log('Creating checkout session:', {
      connectedAccountId,
      priceInCents,
      productName,
      applicationFeeAmount,
      mode
    });

    // Create a checkout session on behalf of the connected account
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: mode as 'payment' | 'subscription',
      success_url: successUrl || 'https://shelvey.pro/payment-success',
      cancel_url: cancelUrl || 'https://shelvey.pro/payment-canceled',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: productDescription,
            },
            unit_amount: priceInCents,
            ...(mode === 'subscription' && { recurring: { interval: 'month' } }),
          },
          quantity: 1,
        },
      ],
      payment_intent_data: mode === 'payment' ? {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: connectedAccountId,
        },
      } : undefined,
      subscription_data: mode === 'subscription' ? {
        application_fee_percent: APPLICATION_FEE_PERCENT * 100,
        transfer_data: {
          destination: connectedAccountId,
        },
      } : undefined,
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        url: session.url,
        sessionId: session.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Connected checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
