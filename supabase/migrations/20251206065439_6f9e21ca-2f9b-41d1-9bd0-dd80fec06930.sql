-- Marketing Campaigns table
CREATE TABLE public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL, -- 'social', 'paid_ads', 'influencer', 'email'
  status TEXT DEFAULT 'draft',
  budget DECIMAL(10,2),
  spent DECIMAL(10,2) DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  target_platforms JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Social Posts table
CREATE TABLE public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content JSONB DEFAULT '{}'::jsonb,
  media_urls TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  platforms TEXT[] DEFAULT '{}',
  post_results JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Influencer Contacts table
CREATE TABLE public.influencer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  influencer_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  handle TEXT,
  follower_count INTEGER,
  engagement_rate DECIMAL(5,2),
  niche TEXT,
  contact_email TEXT,
  status TEXT DEFAULT 'discovered',
  contract_value DECIMAL(10,2),
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ad Creatives table
CREATE TABLE public.ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  creative_type TEXT NOT NULL, -- 'image', 'video', 'carousel'
  image_urls TEXT[] DEFAULT '{}',
  headline TEXT,
  description TEXT,
  cta TEXT,
  performance_score DECIMAL(5,2),
  ab_variant TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketing_campaigns
CREATE POLICY "Users can view own campaigns" ON public.marketing_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaigns" ON public.marketing_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON public.marketing_campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaigns" ON public.marketing_campaigns FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for social_posts
CREATE POLICY "Users can view own posts" ON public.social_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own posts" ON public.social_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.social_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.social_posts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for influencer_contacts
CREATE POLICY "Users can view own influencers" ON public.influencer_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own influencers" ON public.influencer_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own influencers" ON public.influencer_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own influencers" ON public.influencer_contacts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ad_creatives
CREATE POLICY "Users can view own creatives" ON public.ad_creatives FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own creatives" ON public.ad_creatives FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own creatives" ON public.ad_creatives FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own creatives" ON public.ad_creatives FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for social_posts (for live posting status)
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;