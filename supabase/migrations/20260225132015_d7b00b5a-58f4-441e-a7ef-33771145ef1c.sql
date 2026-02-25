
-- Add autonomous_mode and last_sync_at to trading_projects
ALTER TABLE public.trading_projects 
  ADD COLUMN IF NOT EXISTS autonomous_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamp with time zone;

-- Enable pg_cron and pg_net extensions for scheduled autonomous execution
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
