-- Migration 005: Infra rework
-- Adds claw_id tracking for the new infra API provisioning model.
-- Adds per-user Telegram bot token storage.

-- Track which claw instance is running for each assistant
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS claw_id VARCHAR(100);

-- Per-user Telegram bot token (encrypted, from @BotFather)
ALTER TABLE user_phones ADD COLUMN IF NOT EXISTS telegram_bot_token_encrypted TEXT;
