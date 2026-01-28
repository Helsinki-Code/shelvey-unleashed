-- Create blog_projects table for tracking multiple blogs per user
CREATE TABLE IF NOT EXISTS public.blog_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  niche TEXT,
  domain TEXT,
  platform TEXT DEFAULT 'wordpress',
  status TEXT DEFAULT 'active',
  current_phase INTEGER DEFAULT 1,
  total_posts INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  monthly_traffic INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own blog projects" 
ON public.blog_projects 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own blog projects" 
ON public.blog_projects 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blog projects" 
ON public.blog_projects 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blog projects" 
ON public.blog_projects 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add blog_project_id to blog_posts if not exists
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS blog_project_id UUID REFERENCES public.blog_projects(id);

-- Create trigger for updated_at
CREATE TRIGGER update_blog_projects_updated_at
BEFORE UPDATE ON public.blog_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for blog_projects
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_projects;