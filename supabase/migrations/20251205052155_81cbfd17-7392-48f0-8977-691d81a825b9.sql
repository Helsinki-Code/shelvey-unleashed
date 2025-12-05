-- Create api_keys table for admin-managed secrets
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_configured BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT false,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Public read access (to show what keys exist)
CREATE POLICY "Allow public read on api_keys" 
ON public.api_keys 
FOR SELECT 
USING (true);

-- Seed MCP server status data for all 26 servers
INSERT INTO public.mcp_server_status (server_id, server_name, status, latency_ms, requests_today, metadata) VALUES
('mcp-chrome', 'Chrome DevTools', 'connected', 15, 1847, '{"category": "development", "toolCount": 26}'::jsonb),
('mcp-github', 'GitHub', 'connected', 28, 3421, '{"category": "development", "toolCount": 26}'::jsonb),
('mcp-fs', 'Filesystem', 'connected', 5, 5672, '{"category": "storage", "toolCount": 14}'::jsonb),
('mcp-playwright', 'Playwright', 'connected', 45, 892, '{"category": "automation", "toolCount": 40}'::jsonb),
('mcp-linear', 'Linear', 'connected', 34, 1234, '{"category": "development"}'::jsonb),
('mcp-shadcn', 'Shadcn UI', 'connected', 22, 2341, '{"category": "design"}'::jsonb),
('mcp-21stdev', '21st.dev Magic', 'requires-key', 156, 567, '{"category": "design", "envRequired": ["21ST_DEV_API_KEY"]}'::jsonb),
('mcp-perplexity', 'Perplexity AI', 'requires-key', 89, 2341, '{"category": "ai", "envRequired": ["PERPLEXITY_API_KEY"]}'::jsonb),
('mcp-browseruse', 'Browser Use', 'requires-key', 234, 456, '{"category": "ai", "envRequired": ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"]}'::jsonb),
('mcp-agentmcp', 'Agent MCP', 'requires-key', 178, 789, '{"category": "ai", "envRequired": ["OPENAI_API_KEY"]}'::jsonb),
('mcp-falai', 'Fal.ai', 'requires-key', 345, 1234, '{"category": "ai", "envRequired": ["FAL_KEY"]}'::jsonb),
('mcp-contentcore', 'Content Core', 'connected', 67, 1892, '{"category": "ai"}'::jsonb),
('mcp-vapi', 'Vapi Voice AI', 'requires-key', 123, 678, '{"category": "voice", "envRequired": ["VAPI_TOKEN"]}'::jsonb),
('mcp-callcenter', 'Call Center', 'requires-key', 89, 345, '{"category": "voice", "envRequired": ["SIP_USERNAME", "SIP_PASSWORD", "SIP_SERVER_IP", "OPENAI_API_KEY"]}'::jsonb),
('mcp-kokorotts', 'Kokoro TTS', 'syncing', 234, 567, '{"category": "voice"}'::jsonb),
('mcp-whatsapp', 'WhatsApp', 'syncing', 45, 4521, '{"category": "communication"}'::jsonb),
('mcp-twitter', 'Twitter/X', 'connected', 56, 2891, '{"category": "social"}'::jsonb),
('mcp-linkedin', 'LinkedIn', 'requires-key', 78, 1456, '{"category": "social", "envRequired": ["LINKED_API_TOKEN", "IDENTIFICATION_TOKEN"]}'::jsonb),
('mcp-facebook', 'Facebook Pages', 'requires-key', 67, 892, '{"category": "social", "envRequired": ["FACEBOOK_ACCESS_TOKEN", "FACEBOOK_PAGE_ID"]}'::jsonb),
('mcp-youtube', 'YouTube Upload', 'requires-key', 456, 234, '{"category": "social", "envRequired": ["YOUTUBE_CLIENT_SECRET_FILE"]}'::jsonb),
('mcp-facebookads', 'Facebook Ads', 'requires-key', 89, 567, '{"category": "marketing", "envRequired": ["FACEBOOK_ADS_TOKEN"]}'::jsonb),
('mcp-googleads', 'Google Ads', 'requires-key', 112, 345, '{"category": "marketing", "envRequired": ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_OAUTH_CONFIG_PATH"]}'::jsonb),
('mcp-stripe', 'Stripe', 'requires-key', 47, 1892, '{"category": "analytics", "envRequired": ["STRIPE_SECRET_KEY"]}'::jsonb),
('mcp-canva', 'Canva Dev', 'connected', 78, 456, '{"category": "design"}'::jsonb),
('mcp-maps', 'Google Maps', 'requires-key', 34, 2341, '{"category": "automation", "envRequired": ["GOOGLE_MAPS_API_KEY"]}'::jsonb),
('mcp-googlecalendar', 'Google Calendar', 'requires-key', 45, 1234, '{"category": "automation", "envRequired": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]}'::jsonb)
ON CONFLICT (server_id) DO UPDATE SET
  server_name = EXCLUDED.server_name,
  status = EXCLUDED.status,
  latency_ms = EXCLUDED.latency_ms,
  requests_today = EXCLUDED.requests_today,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Seed API keys configuration
INSERT INTO public.api_keys (key_name, display_name, description, is_required, category) VALUES
('OPENAI_API_KEY', 'OpenAI API Key', 'Required for Browser Use, Agent MCP, and Call Center', true, 'ai'),
('ANTHROPIC_API_KEY', 'Anthropic API Key', 'Alternative for Browser Use agent', false, 'ai'),
('PERPLEXITY_API_KEY', 'Perplexity API Key', 'Required for Perplexity AI search', true, 'ai'),
('FAL_KEY', 'Fal.ai API Key', 'Required for media generation (images, videos, music)', true, 'ai'),
('21ST_DEV_API_KEY', '21st.dev API Key', 'Required for AI-powered UI generation', true, 'design'),
('GOOGLE_MAPS_API_KEY', 'Google Maps API Key', 'Required for location and directions', true, 'automation'),
('GOOGLE_CLIENT_ID', 'Google Client ID', 'Required for Google Calendar OAuth', true, 'automation'),
('GOOGLE_CLIENT_SECRET', 'Google Client Secret', 'Required for Google Calendar OAuth', true, 'automation'),
('VAPI_TOKEN', 'Vapi Token', 'Required for voice AI telephony', true, 'voice'),
('SIP_USERNAME', 'SIP Username', 'Required for Call Center VoIP', false, 'voice'),
('SIP_PASSWORD', 'SIP Password', 'Required for Call Center VoIP', false, 'voice'),
('SIP_SERVER_IP', 'SIP Server IP', 'Required for Call Center VoIP', false, 'voice'),
('STRIPE_SECRET_KEY', 'Stripe Secret Key', 'Required for payment processing', true, 'payments'),
('FACEBOOK_ACCESS_TOKEN', 'Facebook Access Token', 'Required for Facebook Pages', true, 'social'),
('FACEBOOK_PAGE_ID', 'Facebook Page ID', 'Required for Facebook Pages', true, 'social'),
('FACEBOOK_ADS_TOKEN', 'Facebook Ads Token', 'Required for Meta Ads management', true, 'marketing'),
('GOOGLE_ADS_DEVELOPER_TOKEN', 'Google Ads Developer Token', 'Required for Google Ads API', true, 'marketing'),
('GOOGLE_ADS_OAUTH_CONFIG_PATH', 'Google Ads OAuth Config', 'Path to Google Ads OAuth config', false, 'marketing'),
('LINKED_API_TOKEN', 'LinkedIn API Token', 'Required for LinkedIn automation', true, 'social'),
('IDENTIFICATION_TOKEN', 'LinkedIn Identification Token', 'Required for LinkedIn automation', true, 'social'),
('YOUTUBE_CLIENT_SECRET_FILE', 'YouTube Client Secret', 'Path to YouTube OAuth client secret', true, 'social')
ON CONFLICT (key_name) DO NOTHING;

-- Create function to update MCP server metrics
CREATE OR REPLACE FUNCTION public.update_mcp_metrics(
  p_server_id TEXT,
  p_latency_ms INTEGER,
  p_requests_increment INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mcp_server_status
  SET 
    latency_ms = p_latency_ms,
    requests_today = COALESCE(requests_today, 0) + p_requests_increment,
    last_ping = now(),
    updated_at = now()
  WHERE server_id = p_server_id;
END;
$$;