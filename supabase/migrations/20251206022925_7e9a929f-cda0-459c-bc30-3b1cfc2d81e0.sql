-- Create user_ceos table for storing custom CEO configurations
CREATE TABLE public.user_ceos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ceo_name TEXT NOT NULL,
  ceo_image_url TEXT,
  persona TEXT NOT NULL DEFAULT 'friendly', -- 'friendly', 'professional', 'direct', 'nurturing', 'visionary'
  voice_id TEXT NOT NULL DEFAULT '9BWtsMINqrJLrRacOk9x', -- Default: Aria
  language TEXT NOT NULL DEFAULT 'en',
  communication_style TEXT NOT NULL DEFAULT 'casual', -- 'formal', 'casual', 'inspirational', 'data-driven'
  gender TEXT NOT NULL DEFAULT 'female', -- 'male', 'female', 'neutral'
  personality_traits JSONB DEFAULT '{"humor_level": "medium", "emoji_usage": true, "enthusiasm": "high"}'::jsonb,
  welcome_audio_url TEXT, -- Stores the generated welcome voice greeting
  welcome_email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_ceos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own CEO"
  ON public.user_ceos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own CEO"
  ON public.user_ceos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CEO"
  ON public.user_ceos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CEO"
  ON public.user_ceos FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_ceos_updated_at
  BEFORE UPDATE ON public.user_ceos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for CEO avatars and voice files
INSERT INTO storage.buckets (id, name, public)
VALUES ('ceo-assets', 'ceo-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for CEO assets
CREATE POLICY "Users can upload their own CEO assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ceo-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own CEO assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ceo-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view CEO assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ceo-assets');

CREATE POLICY "Users can update their own CEO assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'ceo-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own CEO assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ceo-assets' AND auth.uid()::text = (storage.foldername(name))[1]);