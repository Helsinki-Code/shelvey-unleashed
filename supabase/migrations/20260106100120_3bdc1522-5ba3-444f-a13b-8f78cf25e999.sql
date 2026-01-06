-- Create storage bucket for project assets (logos, docs uploaded in CEO chat)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for project-assets bucket
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own uploads"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'project-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'project-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own uploads"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'project-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);