-- Create notifications table for real-time alerts
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (via edge functions with service role)
CREATE POLICY "Service can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create admin_api_keys table for Super Admin keys (used by DFY plan users)
CREATE TABLE public.admin_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL UNIQUE,
  encrypted_value TEXT,
  display_name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on admin_api_keys
ALTER TABLE public.admin_api_keys ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage admin API keys
CREATE POLICY "Super admin can view admin API keys"
ON public.admin_api_keys FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can insert admin API keys"
ON public.admin_api_keys FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can update admin API keys"
ON public.admin_api_keys FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can delete admin API keys"
ON public.admin_api_keys FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

-- Add subscription_tier to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'standard';

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Create function to get admin API key for DFY users
CREATE OR REPLACE FUNCTION public.get_admin_api_key_for_dfy(_user_id uuid, _key_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier text;
  _key_value text;
BEGIN
  -- Check if user has DFY subscription
  SELECT subscription_tier INTO _tier FROM profiles WHERE id = _user_id;
  
  IF _tier != 'dfy' THEN
    RETURN NULL;
  END IF;
  
  -- Get the admin API key
  SELECT encrypted_value INTO _key_value FROM admin_api_keys WHERE key_name = _key_name AND is_configured = true;
  
  RETURN _key_value;
END;
$$;