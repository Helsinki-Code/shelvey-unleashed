-- Add columns to phase_deliverables for AI-generated content and approval workflow
ALTER TABLE public.phase_deliverables 
ADD COLUMN IF NOT EXISTS generated_content jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS feedback_history jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ceo_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS user_approved boolean DEFAULT false;

-- Add columns to generated_websites for branding linkage and hosting
ALTER TABLE public.generated_websites 
ADD COLUMN IF NOT EXISTS branding_deliverable_id uuid REFERENCES public.phase_deliverables(id),
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS feedback_history jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ceo_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS user_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_domain text,
ADD COLUMN IF NOT EXISTS dns_records jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ssl_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS hosting_type text DEFAULT 'subdomain';

-- Create website_hosting table for domain management
CREATE TABLE IF NOT EXISTS public.website_hosting (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  website_id uuid NOT NULL REFERENCES public.generated_websites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  hosting_type text NOT NULL DEFAULT 'subdomain',
  domain text NOT NULL,
  subdomain text,
  dns_verified boolean DEFAULT false,
  ssl_provisioned boolean DEFAULT false,
  cname_record text,
  a_record text DEFAULT '185.158.133.1',
  txt_verification text,
  verification_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(website_id)
);

-- Enable RLS on website_hosting
ALTER TABLE public.website_hosting ENABLE ROW LEVEL SECURITY;

-- RLS policies for website_hosting
CREATE POLICY "Users can view own hosting" ON public.website_hosting
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hosting" ON public.website_hosting
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hosting" ON public.website_hosting
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own hosting" ON public.website_hosting
  FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_website_hosting_updated_at
  BEFORE UPDATE ON public.website_hosting
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for website_hosting
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_hosting;