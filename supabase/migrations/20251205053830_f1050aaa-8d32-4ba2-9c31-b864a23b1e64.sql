-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'canceled', 'expired');

-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'subscriber', 'user');

-- User profiles with subscription info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_status subscription_status DEFAULT 'trial',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles table (for admin access)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- User-specific API keys (each user stores their own)
CREATE TABLE public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  encrypted_value TEXT, -- User enters, we store encrypted
  is_configured BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, key_name)
);

-- User-specific MCP server configurations
CREATE TABLE public.user_mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  server_id TEXT NOT NULL,
  server_name TEXT NOT NULL,
  status TEXT DEFAULT 'requires-key',
  latency_ms INTEGER,
  requests_today INTEGER DEFAULT 0,
  last_ping TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, server_id)
);

-- User business projects (businesses the CEO agent is building)
CREATE TABLE public.business_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stage TEXT DEFAULT 'research',
  industry TEXT,
  target_market TEXT,
  business_model JSONB,
  revenue NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CEO Agent conversations
CREATE TABLE public.agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE,
  agent_type TEXT DEFAULT 'ceo',
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User-specific agent activity logs
CREATE TABLE public.user_agent_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.business_projects(id) ON DELETE SET NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  result JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_agent_activity ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id 
    AND (subscription_status = 'active' OR subscription_status = 'trial')
    AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for user_api_keys (only own keys)
CREATE POLICY "Users can view own API keys" ON public.user_api_keys
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own API keys" ON public.user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own API keys" ON public.user_api_keys
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own API keys" ON public.user_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_mcp_servers
CREATE POLICY "Users can view own MCP servers" ON public.user_mcp_servers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own MCP servers" ON public.user_mcp_servers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own MCP servers" ON public.user_mcp_servers
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own MCP servers" ON public.user_mcp_servers
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for business_projects
CREATE POLICY "Users can view own projects" ON public.business_projects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.business_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.business_projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.business_projects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for agent_conversations
CREATE POLICY "Users can view own conversations" ON public.agent_conversations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON public.agent_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.agent_conversations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.agent_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_agent_activity
CREATE POLICY "Users can view own activity" ON public.user_agent_activity
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON public.user_agent_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, subscription_status, subscription_expires_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'trial',
    NOW() + INTERVAL '14 days'
  );
  
  -- Give default subscriber role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'subscriber');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to initialize default MCP servers for a new user
CREATE OR REPLACE FUNCTION public.initialize_user_mcp_servers(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_mcp_servers (user_id, server_id, server_name, status, metadata) VALUES
    (_user_id, 'mcp-github', 'GitHub MCP', 'requires-key', '{"category": "development", "toolCount": 12, "envRequired": ["GITHUB_TOKEN"]}'::jsonb),
    (_user_id, 'mcp-stripe', 'Stripe MCP', 'requires-key', '{"category": "finance", "toolCount": 8, "envRequired": ["STRIPE_API_KEY"]}'::jsonb),
    (_user_id, 'mcp-google-maps', 'Google Maps MCP', 'requires-key', '{"category": "location", "toolCount": 6, "envRequired": ["GOOGLE_MAPS_API_KEY"]}'::jsonb),
    (_user_id, 'mcp-linear', 'Linear MCP', 'requires-key', '{"category": "productivity", "toolCount": 10, "envRequired": ["LINEAR_API_KEY"]}'::jsonb),
    (_user_id, 'mcp-perplexity', 'Perplexity MCP', 'requires-key', '{"category": "ai", "toolCount": 4, "envRequired": ["PERPLEXITY_API_KEY"]}'::jsonb),
    (_user_id, 'mcp-canva', 'Canva MCP', 'requires-key', '{"category": "design", "toolCount": 7, "envRequired": ["CANVA_API_KEY"]}'::jsonb),
    (_user_id, 'mcp-twitter', 'Twitter/X MCP', 'requires-key', '{"category": "social", "toolCount": 9, "envRequired": ["TWITTER_API_KEY", "TWITTER_API_SECRET"]}'::jsonb),
    (_user_id, 'mcp-youtube', 'YouTube MCP', 'requires-key', '{"category": "social", "toolCount": 8, "envRequired": ["YOUTUBE_API_KEY"]}'::jsonb),
    (_user_id, 'mcp-linkedin', 'LinkedIn MCP', 'requires-key', '{"category": "social", "toolCount": 6, "envRequired": ["LINKEDIN_ACCESS_TOKEN"]}'::jsonb),
    (_user_id, 'mcp-fal-ai', 'Fal AI MCP', 'requires-key', '{"category": "ai", "toolCount": 15, "envRequired": ["FAL_KEY"]}'::jsonb)
  ON CONFLICT (user_id, server_id) DO NOTHING;
END;
$$;

-- Enable realtime for conversations and activity
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_agent_activity;