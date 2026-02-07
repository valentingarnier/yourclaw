-- User integrations (Google Calendar, Gmail, Drive, etc.)
-- Stores OAuth tokens for connected services

CREATE TABLE user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service VARCHAR(50) NOT NULL,  -- 'GOOGLE_CALENDAR', 'GOOGLE_GMAIL', 'GOOGLE_DRIVE'
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL,  -- e.g. ['https://www.googleapis.com/auth/calendar']
  email VARCHAR(255),  -- Google account email (for display)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, service)
);

-- Index for quick lookups
CREATE INDEX idx_user_integrations_user_id ON user_integrations(user_id);

-- RLS policies
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own integrations
CREATE POLICY "Users can view own integrations"
  ON user_integrations FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for backend)
CREATE POLICY "Service role full access"
  ON user_integrations FOR ALL
  USING (auth.role() = 'service_role');
