-- Add columns for onboarding and experience mode
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS experience_mode TEXT DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS onboarding_goal TEXT;