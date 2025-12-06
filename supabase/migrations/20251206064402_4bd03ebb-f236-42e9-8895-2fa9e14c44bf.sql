-- Add Stripe Connect columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_connected';

-- Add renewal tracking to user_domains
ALTER TABLE public.user_domains ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.user_domains ADD COLUMN IF NOT EXISTS renewal_payment_intent_id TEXT;