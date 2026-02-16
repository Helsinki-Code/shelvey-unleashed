-- Create v0_chats table for storing chat history
CREATE TABLE IF NOT EXISTS v0_chats (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_v0_chats_project_id ON v0_chats(project_id);
CREATE INDEX IF NOT EXISTS idx_v0_chats_user_id ON v0_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_v0_chats_updated_at ON v0_chats(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE v0_chats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own chats" ON v0_chats
  FOR SELECT USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can insert their own chats" ON v0_chats
  FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can update their own chats" ON v0_chats
  FOR UPDATE USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can delete their own chats" ON v0_chats
  FOR DELETE USING (auth.uid()::TEXT = user_id);
