-- Content items table for blog posts, website copy, etc.
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- 'blog', 'landing_copy', 'social', 'email'
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft',
  seo_score DECIMAL(5,2),
  keywords JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SEO rankings tracking table
CREATE TABLE public.seo_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  position INTEGER,
  url TEXT,
  search_engine TEXT DEFAULT 'google',
  tracked_at TIMESTAMPTZ DEFAULT now()
);

-- Social content library for batch content
CREATE TABLE public.social_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL, -- 'instagram', 'twitter', 'linkedin', 'facebook', 'tiktok'
  content_type TEXT NOT NULL, -- 'post', 'story', 'reel', 'carousel'
  caption TEXT,
  hashtags TEXT[],
  image_urls TEXT[],
  status TEXT DEFAULT 'draft', -- 'draft', 'approved', 'scheduled', 'posted'
  scheduled_for TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  engagement_metrics JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_content_library ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_items
CREATE POLICY "Users can view own content items" ON public.content_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own content items" ON public.content_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own content items" ON public.content_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own content items" ON public.content_items FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for seo_rankings
CREATE POLICY "Users can view own seo rankings" ON public.seo_rankings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own seo rankings" ON public.seo_rankings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own seo rankings" ON public.seo_rankings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own seo rankings" ON public.seo_rankings FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for social_content_library
CREATE POLICY "Users can view own social content" ON public.social_content_library FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own social content" ON public.social_content_library FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own social content" ON public.social_content_library FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own social content" ON public.social_content_library FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_content_items_project ON public.content_items(project_id);
CREATE INDEX idx_content_items_user ON public.content_items(user_id);
CREATE INDEX idx_seo_rankings_project ON public.seo_rankings(project_id);
CREATE INDEX idx_social_content_project ON public.social_content_library(project_id);
CREATE INDEX idx_social_content_platform ON public.social_content_library(platform);