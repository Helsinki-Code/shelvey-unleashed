-- Add new fields to blog_projects table for auto-build functionality
ALTER TABLE public.blog_projects ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;
ALTER TABLE public.blog_projects ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Create table for autopilot scheduling
CREATE TABLE IF NOT EXISTS public.blog_autopilot_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blog_project_id UUID NOT NULL REFERENCES public.blog_projects(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  frequency_hours INTEGER DEFAULT 6,
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  phases_config JSONB DEFAULT '{"content_creation": true, "seo_optimization": true, "social_distribution": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blog_project_id)
);

-- Enable RLS on the new table
ALTER TABLE public.blog_autopilot_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for autopilot schedules
CREATE POLICY "Users can view their own autopilot schedules" 
ON public.blog_autopilot_schedules 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own autopilot schedules" 
ON public.blog_autopilot_schedules 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own autopilot schedules" 
ON public.blog_autopilot_schedules 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own autopilot schedules" 
ON public.blog_autopilot_schedules 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_blog_autopilot_schedules_updated_at
BEFORE UPDATE ON public.blog_autopilot_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();