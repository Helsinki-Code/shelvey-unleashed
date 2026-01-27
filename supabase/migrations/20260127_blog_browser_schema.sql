-- Blog Empire Browser Automation Schema
-- Domain-specific database schema for blog and content automation

CREATE TABLE IF NOT EXISTS blog_browser_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES browser_automation_sessions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'publish_to_wordpress', 'publish_to_medium', 'publish_multiple',
    'update_post', 'delete_post', 'schedule_post', 'refresh_content',
    'post_to_twitter', 'post_to_linkedin', 'post_to_instagram',
    'post_to_facebook', 'distribute_to_platforms', 'monitor_engagement',
    'moderate_comments', 'reply_to_comment', 'create_lead_magnet'
  )),
  platform TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'error')),
  result JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  cost_usd NUMERIC(10, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT,
  content TEXT,
  excerpt TEXT,
  featured_image_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  wordpress_id INTEGER,
  wordpress_url TEXT,
  medium_id TEXT,
  medium_url TEXT,
  meta JSONB DEFAULT '{}',
  seo_score NUMERIC(3, 0),
  word_count INTEGER,
  reading_time_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  platform TEXT,
  author_name TEXT,
  author_email TEXT,
  content TEXT,
  moderation_result JSONB DEFAULT '{}',
  spam_score NUMERIC(3, 2),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  topics TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
  ai_response TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_seo_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  monitored_date DATE DEFAULT CURRENT_DATE,
  target_keyword TEXT,
  search_rank INTEGER,
  previous_rank INTEGER,
  rank_change INTEGER,
  search_volume INTEGER,
  ctr NUMERIC(5, 2),
  impressions INTEGER,
  clicks INTEGER,
  seo_score NUMERIC(3, 0),
  recommendations JSONB DEFAULT '[]',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_competitor_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_domain TEXT NOT NULL,
  content_length INTEGER,
  keywords TEXT[] DEFAULT '{}',
  backlinks INTEGER,
  domain_authority NUMERIC(3, 0),
  page_authority NUMERIC(3, 0),
  social_shares INTEGER,
  estimated_traffic INTEGER,
  advantage_area TEXT,
  analysis_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_backlinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_domain TEXT NOT NULL,
  source_url TEXT,
  anchor_text TEXT,
  domain_authority NUMERIC(3, 0),
  page_authority NUMERIC(3, 0),
  link_type TEXT CHECK (link_type IN ('editorial', 'guest_post', 'directory', 'resource', 'lost')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'lost', 'broken')),
  detected_date DATE,
  lost_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_social_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  likes INTEGER,
  shares INTEGER,
  comments INTEGER,
  reposts INTEGER,
  views INTEGER,
  clicks INTEGER,
  reach INTEGER,
  impressions INTEGER,
  engagement_rate NUMERIC(5, 2),
  metrics_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE DEFAULT CURRENT_DATE,
  total_pageviews INTEGER,
  total_sessions INTEGER,
  total_users INTEGER,
  new_users INTEGER,
  returning_users INTEGER,
  bounce_rate NUMERIC(5, 2),
  avg_session_duration INTEGER,
  pages_per_session NUMERIC(5, 2),
  goal_completions INTEGER,
  revenue_usd NUMERIC(15, 2),
  transactions INTEGER,
  traffic_sources JSONB DEFAULT '{}',
  top_pages JSONB DEFAULT '{}',
  user_demographics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_email_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  list_name TEXT,
  subscriber_count INTEGER,
  open_rate NUMERIC(5, 2),
  click_rate NUMERIC(5, 2),
  unsubscribe_rate NUMERIC(5, 2),
  platform_list_id TEXT,
  automation_status TEXT DEFAULT 'active' CHECK (automation_status IN ('active', 'paused', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_lead_magnets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('pdf', 'checklist', 'template', 'course', 'tool')),
  description TEXT,
  file_url TEXT,
  conversion_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_blog_actions_user_id ON blog_browser_actions(user_id);
CREATE INDEX idx_blog_actions_session_id ON blog_browser_actions(session_id);
CREATE INDEX idx_blog_actions_created_at ON blog_browser_actions(created_at);

CREATE INDEX idx_blog_posts_user_id ON blog_posts(user_id);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX idx_blog_posts_slug ON blog_posts(user_id, slug);

CREATE INDEX idx_blog_comments_user_id ON blog_comments(user_id);
CREATE INDEX idx_blog_comments_post_id ON blog_comments(post_id);
CREATE INDEX idx_blog_comments_status ON blog_comments(status);
CREATE INDEX idx_blog_comments_created_at ON blog_comments(created_at);

CREATE INDEX idx_blog_seo_user_id ON blog_seo_monitoring(user_id);
CREATE INDEX idx_blog_seo_post_id ON blog_seo_monitoring(post_id);
CREATE INDEX idx_blog_seo_monitored_date ON blog_seo_monitoring(monitored_date);

CREATE INDEX idx_blog_competitor_user_id ON blog_competitor_analysis(user_id);
CREATE INDEX idx_blog_competitor_domain ON blog_competitor_analysis(competitor_domain);
CREATE INDEX idx_blog_competitor_analysis_date ON blog_competitor_analysis(analysis_date);

CREATE INDEX idx_blog_backlinks_user_id ON blog_backlinks(user_id);
CREATE INDEX idx_blog_backlinks_status ON blog_backlinks(status);
CREATE INDEX idx_blog_backlinks_source_domain ON blog_backlinks(source_domain);

CREATE INDEX idx_blog_social_user_id ON blog_social_metrics(user_id);
CREATE INDEX idx_blog_social_post_id ON blog_social_metrics(post_id);
CREATE INDEX idx_blog_social_platform ON blog_social_metrics(platform);
CREATE INDEX idx_blog_social_metrics_date ON blog_social_metrics(metrics_date);

CREATE INDEX idx_blog_analytics_user_id ON blog_analytics_snapshots(user_id);
CREATE INDEX idx_blog_analytics_snapshot_date ON blog_analytics_snapshots(snapshot_date);

CREATE INDEX idx_blog_email_user_id ON blog_email_lists(user_id);
CREATE INDEX idx_blog_email_platform ON blog_email_lists(platform);

CREATE INDEX idx_blog_lead_magnet_user_id ON blog_lead_magnets(user_id);

-- RLS Policies
ALTER TABLE blog_browser_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_seo_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_competitor_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_backlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_social_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_lead_magnets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_blog_actions"
ON blog_browser_actions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_posts"
ON blog_posts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_comments"
ON blog_comments FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_seo"
ON blog_seo_monitoring FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_competitor_analysis"
ON blog_competitor_analysis FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_backlinks"
ON blog_backlinks FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_social_metrics"
ON blog_social_metrics FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_analytics"
ON blog_analytics_snapshots FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_email_lists"
ON blog_email_lists FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_view_own_lead_magnets"
ON blog_lead_magnets FOR SELECT
USING (user_id = auth.uid());

-- Functions for blog operations
CREATE OR REPLACE FUNCTION update_blog_post_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_timestamp
BEFORE UPDATE ON blog_posts
FOR EACH ROW
EXECUTE FUNCTION update_blog_post_timestamp();

CREATE OR REPLACE FUNCTION update_blog_email_list_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_list_timestamp
BEFORE UPDATE ON blog_email_lists
FOR EACH ROW
EXECUTE FUNCTION update_blog_email_list_timestamp();

CREATE OR REPLACE FUNCTION update_blog_lead_magnet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_magnet_timestamp
BEFORE UPDATE ON blog_lead_magnets
FOR EACH ROW
EXECUTE FUNCTION update_blog_lead_magnet_timestamp();

-- Function to get blog performance summary
CREATE OR REPLACE FUNCTION get_blog_performance_summary(user_id_param UUID, days_back INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
  total_views INTEGER;
  total_engagement INTEGER;
  avg_bounce_rate NUMERIC;
  top_post_views INTEGER;
BEGIN
  SELECT COALESCE(SUM(total_pageviews), 0) INTO total_views
  FROM blog_analytics_snapshots
  WHERE user_id = user_id_param
  AND snapshot_date >= CURRENT_DATE - INTERVAL '1 day' * days_back;

  SELECT COALESCE(SUM(likes + shares + comments), 0) INTO total_engagement
  FROM blog_social_metrics
  WHERE user_id = user_id_param
  AND metrics_date >= CURRENT_DATE - INTERVAL '1 day' * days_back;

  SELECT COALESCE(AVG(bounce_rate), 0) INTO avg_bounce_rate
  FROM blog_analytics_snapshots
  WHERE user_id = user_id_param
  AND snapshot_date >= CURRENT_DATE - INTERVAL '1 day' * days_back;

  RETURN jsonb_build_object(
    'total_views', total_views,
    'total_engagement', total_engagement,
    'avg_bounce_rate', ROUND(avg_bounce_rate, 2),
    'period_days', days_back
  );
END;
$$ LANGUAGE plpgsql;
