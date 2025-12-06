import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const event = JSON.parse(body);

    console.log('Received Stripe Connect webhook:', event.type);

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const userId = account.metadata?.user_id;

        if (userId) {
          // Determine status based on account state
          let status = 'pending';
          if (account.charges_enabled && account.payouts_enabled) {
            status = 'active';
          } else if (account.details_submitted) {
            status = 'pending_verification';
          }

          await supabase
            .from('profiles')
            .update({ stripe_connect_status: status })
            .eq('id', userId);

          // Send notification if account became active
          if (status === 'active') {
            await supabase.from('notifications').insert({
              user_id: userId,
              type: 'stripe_connected',
              title: 'Stripe Account Connected!',
              message: 'Your Stripe account is now active. You can start receiving payments on your websites!',
              metadata: { account_id: account.id }
            });
          }

          console.log(`Updated user ${userId} Stripe status to: ${status}`);
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // This is a sale on a connected account's website
        if (session.payment_status === 'paid') {
          const connectedAccountId = (session as any).transfer_data?.destination;
          
          if (connectedAccountId) {
            // Find the user by their connected account
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, email')
              .eq('stripe_connect_account_id', connectedAccountId)
              .single();

            if (profile) {
              // Send sale notification
              await supabase.from('notifications').insert({
                user_id: profile.id,
                type: 'sale_completed',
                title: 'New Sale! 🎉',
                message: `You received a payment of $${((session.amount_total || 0) / 100).toFixed(2)}`,
                metadata: { 
                  session_id: session.id,
                  amount: session.amount_total,
                  customer_email: session.customer_details?.email
                }
              });

              console.log(`Sale notification sent to user ${profile.id}`);
            }
          }
        }
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        const accountId = event.account;

        if (accountId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_connect_account_id', accountId)
            .single();

          if (profile) {
            await supabase.from('notifications').insert({
              user_id: profile.id,
              type: 'payout_completed',
              title: 'Payout Sent! 💰',
              message: `$${(payout.amount / 100).toFixed(2)} has been sent to your bank account`,
              metadata: { payout_id: payout.id, amount: payout.amount }
            });

            console.log(`Payout notification sent to user ${profile.id}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Stripe Connect webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
