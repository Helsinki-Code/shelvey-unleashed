-- Add visual documentation columns to phase_deliverables
ALTER TABLE phase_deliverables 
ADD COLUMN IF NOT EXISTS screenshots JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS screen_recording_url TEXT,
ADD COLUMN IF NOT EXISTS agent_work_steps JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS citations JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS export_formats JSONB DEFAULT '["pdf", "json", "html"]';

-- Add project approval fields to business_projects
ALTER TABLE business_projects
ADD COLUMN IF NOT EXISTS ceo_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS user_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ceo_review_feedback TEXT,
ADD COLUMN IF NOT EXISTS ceo_reviewed_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for agent work media
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-work-media', 'agent-work-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for agent-work-media bucket
CREATE POLICY "Public can view agent work media"
ON storage.objects FOR SELECT
USING (bucket_id = 'agent-work-media');

CREATE POLICY "Authenticated users can upload agent work media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'agent-work-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own agent work media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'agent-work-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own agent work media"
ON storage.objects FOR DELETE
USING (bucket_id = 'agent-work-media' AND auth.uid()::text = (storage.foldername(name))[1]);