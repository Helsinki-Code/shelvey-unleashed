-- Create user_domains table for tracking purchased domains
CREATE TABLE public.user_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  domain_name TEXT NOT NULL UNIQUE,
  registrar TEXT NOT NULL DEFAULT 'vercel',
  registrar_domain_id TEXT,
  purchase_price DECIMAL(10,2) NOT NULL,
  our_price DECIMAL(10,2) NOT NULL,
  renewal_price DECIMAL(10,2),
  is_premium BOOLEAN DEFAULT false,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  privacy_enabled BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',
  connected_website_id UUID REFERENCES generated_websites(id),
  dns_configured BOOLEAN DEFAULT false,
  contact_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_domains ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own domains" ON public.user_domains
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own domains" ON public.user_domains
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own domains" ON public.user_domains
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own domains" ON public.user_domains
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_domains_updated_at
  BEFORE UPDATE ON public.user_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();