-- Add model column to assistants table
-- Allows users to choose their preferred AI model

ALTER TABLE assistants
ADD COLUMN model VARCHAR(100) NOT NULL DEFAULT 'anthropic/claude-sonnet-4-5-20250929';

-- Add comment for documentation
COMMENT ON COLUMN assistants.model IS 'OpenClaw model identifier (e.g., anthropic/claude-sonnet-4-5-20250929)';
