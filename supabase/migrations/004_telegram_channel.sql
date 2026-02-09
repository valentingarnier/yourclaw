-- Add Telegram as a messaging channel alongside WhatsApp.
-- Each user picks one channel. Default is WHATSAPP for backward compat.

-- Add channel columns to user_phones
ALTER TABLE user_phones ADD COLUMN channel VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE user_phones ADD COLUMN telegram_username VARCHAR(100);
ALTER TABLE user_phones ADD COLUMN telegram_chat_id BIGINT;

-- Telegram users don't have a phone number
ALTER TABLE user_phones ALTER COLUMN phone_e164 DROP NOT NULL;

-- Constraints
ALTER TABLE user_phones ADD CONSTRAINT chk_channel
  CHECK (channel IN ('WHATSAPP', 'TELEGRAM'));

-- Indexes for webhook lookups
CREATE INDEX idx_user_phones_telegram_chat_id ON user_phones(telegram_chat_id);
CREATE INDEX idx_user_phones_telegram_username ON user_phones(telegram_username);

-- Add channel tracking to messages
ALTER TABLE messages ADD COLUMN channel VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE messages ADD COLUMN telegram_message_id BIGINT;
