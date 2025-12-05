-- Create shell command approvals table for audit trail and approval workflow
CREATE TABLE public.shell_command_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  command TEXT NOT NULL,
  working_directory TEXT DEFAULT '/',
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')),
  output TEXT,
  error TEXT,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.shell_command_approvals ENABLE ROW LEVEL SECURITY;

-- Users can view their own commands
CREATE POLICY "Users can view own shell commands"
ON public.shell_command_approvals FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own commands
CREATE POLICY "Users can insert own shell commands"
ON public.shell_command_approvals FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own commands
CREATE POLICY "Users can update own shell commands"
ON public.shell_command_approvals FOR UPDATE
USING (auth.uid() = user_id);

-- Create code patches table for tracking code generation history
CREATE TABLE public.code_patches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.business_projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_content TEXT,
  patch_content TEXT NOT NULL,
  new_content TEXT,
  patch_type TEXT DEFAULT 'diff' CHECK (patch_type IN ('diff', 'search_replace', 'full_replace', 'insert')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected', 'reverted')),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.code_patches ENABLE ROW LEVEL SECURITY;

-- Users can view their own patches
CREATE POLICY "Users can view own code patches"
ON public.code_patches FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own patches
CREATE POLICY "Users can insert own code patches"
ON public.code_patches FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own patches
CREATE POLICY "Users can update own code patches"
ON public.code_patches FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.shell_command_approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.code_patches;