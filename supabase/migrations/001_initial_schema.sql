-- YourClaw Initial Schema
-- Run this in Supabase SQL Editor

-- User's WhatsApp number (one per user)
CREATE TABLE user_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Host servers running user containers
CREATE TABLE host_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip VARCHAR(45) NOT NULL,
  ssh_key_ref VARCHAR(255) NOT NULL,
  max_containers INTEGER NOT NULL DEFAULT 20,
  current_containers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User's Openclaw assistant (one per user)
CREATE TABLE assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'NONE' CHECK (status IN ('NONE', 'PROVISIONING', 'READY', 'ERROR')),
  container_id VARCHAR(100),
  host_server_id UUID REFERENCES host_servers(id),
  port INTEGER,
  gateway_token_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Chat messages for audit + display
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  body TEXT NOT NULL,
  twilio_sid VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily usage counters for rate limiting
CREATE TABLE usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  inbound_count INTEGER NOT NULL DEFAULT 0,
  outbound_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

-- User-provided API keys (BYOK)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL DEFAULT 'ANTHROPIC',
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Stripe subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(100) NOT NULL,
  stripe_subscription_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAST_DUE', 'CANCELED')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- API credit balance (shared key usage)
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_cents INTEGER NOT NULL DEFAULT 1000,
  used_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Provisioning job queue
CREATE TABLE provisioning_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_user_phones_user_id ON user_phones(user_id);
CREATE INDEX idx_user_phones_phone ON user_phones(phone_e164);
CREATE INDEX idx_assistants_user_id ON assistants(user_id);
CREATE INDEX idx_assistants_status ON assistants(status);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_usage_daily_user_date ON usage_daily(user_id, date);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_provisioning_jobs_status ON provisioning_jobs(status);
CREATE INDEX idx_provisioning_jobs_created_at ON provisioning_jobs(created_at);

-- Enable Row Level Security (but we use service role key, so policies are optional)
ALTER TABLE user_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE provisioning_jobs ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so no policies needed for backend
-- If frontend ever needs direct access, add policies here
