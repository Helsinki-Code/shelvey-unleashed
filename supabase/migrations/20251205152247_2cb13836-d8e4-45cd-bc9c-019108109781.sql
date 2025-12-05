-- Phase 1: MCP Server Registry for Native MCP Support
CREATE TABLE public.mcp_server_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id TEXT NOT NULL UNIQUE,
  server_name TEXT NOT NULL,
  server_url TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_public BOOLEAN DEFAULT true,
  requires_auth BOOLEAN DEFAULT false,
  auth_type TEXT, -- 'api_key', 'oauth', 'none'
  tools JSONB DEFAULT '[]'::jsonb,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mcp_server_registry ENABLE ROW LEVEL SECURITY;

-- Public can view registry
CREATE POLICY "Anyone can view MCP registry"
ON public.mcp_server_registry
FOR SELECT
USING (true);

-- Only super admin can manage registry
CREATE POLICY "Super admin can manage MCP registry"
ON public.mcp_server_registry
FOR ALL
USING (is_super_admin(auth.uid()));

-- Phase 2: User OAuth Tokens for Built-in Connectors
CREATE TABLE public.user_oauth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL, -- 'google', 'microsoft'
  connector_type TEXT NOT NULL, -- 'gmail', 'drive', 'calendar', 'teams', 'outlook', 'sharepoint'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  scopes TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, connector_type)
);

-- Enable RLS
ALTER TABLE public.user_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can view own OAuth tokens"
ON public.user_oauth_tokens
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OAuth tokens"
ON public.user_oauth_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OAuth tokens"
ON public.user_oauth_tokens
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own OAuth tokens"
ON public.user_oauth_tokens
FOR DELETE
USING (auth.uid() = user_id);

-- Seed popular public MCP servers
INSERT INTO public.mcp_server_registry (server_id, server_name, server_url, description, category, requires_auth, auth_type, tools) VALUES
('stripe-mcp', 'Stripe', 'https://mcp.stripe.com', 'Payment processing and billing', 'finance', true, 'api_key', '["create_payment", "list_customers", "create_subscription"]'),
('github-mcp', 'GitHub', 'https://mcp.github.com', 'Code repositories and collaboration', 'development', true, 'oauth', '["create_repo", "list_issues", "create_pr"]'),
('slack-mcp', 'Slack', 'https://mcp.slack.com', 'Team messaging and collaboration', 'communication', true, 'oauth', '["send_message", "list_channels", "create_channel"]'),
('notion-mcp', 'Notion', 'https://mcp.notion.com', 'Notes and documentation', 'productivity', true, 'oauth', '["create_page", "query_database", "update_block"]'),
('linear-mcp', 'Linear', 'https://mcp.linear.app', 'Issue tracking and project management', 'development', true, 'api_key', '["create_issue", "list_projects", "update_status"]'),
('airtable-mcp', 'Airtable', 'https://mcp.airtable.com', 'Spreadsheet database hybrid', 'productivity', true, 'api_key', '["list_records", "create_record", "update_record"]'),
('figma-mcp', 'Figma', 'https://mcp.figma.com', 'Design collaboration', 'design', true, 'oauth', '["get_file", "list_projects", "export_assets"]'),
('salesforce-mcp', 'Salesforce', 'https://mcp.salesforce.com', 'CRM and sales automation', 'crm', true, 'oauth', '["query_leads", "create_opportunity", "update_contact"]'),
('zendesk-mcp', 'Zendesk', 'https://mcp.zendesk.com', 'Customer support ticketing', 'support', true, 'api_key', '["create_ticket", "list_tickets", "update_status"]'),
('intercom-mcp', 'Intercom', 'https://mcp.intercom.com', 'Customer messaging platform', 'support', true, 'api_key', '["send_message", "list_conversations", "create_contact"]'),
('mailchimp-mcp', 'Mailchimp', 'https://mcp.mailchimp.com', 'Email marketing automation', 'marketing', true, 'api_key', '["create_campaign", "list_audiences", "send_email"]'),
('sendgrid-mcp', 'SendGrid', 'https://mcp.sendgrid.com', 'Transactional email service', 'communication', true, 'api_key', '["send_email", "create_template", "list_contacts"]'),
('twilio-mcp', 'Twilio', 'https://mcp.twilio.com', 'Voice and SMS communications', 'communication', true, 'api_key', '["send_sms", "make_call", "list_messages"]'),
('dropbox-mcp', 'Dropbox', 'https://mcp.dropbox.com', 'Cloud file storage', 'storage', true, 'oauth', '["upload_file", "list_files", "share_folder"]'),
('box-mcp', 'Box', 'https://mcp.box.com', 'Enterprise content management', 'storage', true, 'oauth', '["upload_file", "list_folders", "create_collaboration"]'),
('asana-mcp', 'Asana', 'https://mcp.asana.com', 'Project and task management', 'productivity', true, 'oauth', '["create_task", "list_projects", "update_status"]'),
('monday-mcp', 'Monday.com', 'https://mcp.monday.com', 'Work operating system', 'productivity', true, 'api_key', '["create_item", "list_boards", "update_column"]'),
('jira-mcp', 'Jira', 'https://mcp.atlassian.com/jira', 'Issue and project tracking', 'development', true, 'oauth', '["create_issue", "list_sprints", "update_ticket"]'),
('confluence-mcp', 'Confluence', 'https://mcp.atlassian.com/confluence', 'Team documentation wiki', 'productivity', true, 'oauth', '["create_page", "search_content", "update_page"]'),
('quickbooks-mcp', 'QuickBooks', 'https://mcp.quickbooks.com', 'Accounting and finance', 'finance', true, 'oauth', '["create_invoice", "list_transactions", "generate_report"]');

-- Enable realtime for registry updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.mcp_server_registry;