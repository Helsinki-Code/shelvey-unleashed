-- Create website_pages table to store individual page code with approval workflow
CREATE TABLE public.website_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  website_id UUID REFERENCES public.generated_websites(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  page_name TEXT NOT NULL,
  page_route TEXT NOT NULL DEFAULT '/',
  page_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  user_approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMP WITH TIME ZONE,
  feedback TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own website pages" 
ON public.website_pages 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own website pages" 
ON public.website_pages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own website pages" 
ON public.website_pages 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own website pages" 
ON public.website_pages 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_website_pages_website_id ON public.website_pages(website_id);
CREATE INDEX idx_website_pages_project_id ON public.website_pages(project_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_pages;