-- Email blast copy field for generations (agent-to-buyer-list format)
ALTER TABLE generations ADD COLUMN IF NOT EXISTS email_copy TEXT;
