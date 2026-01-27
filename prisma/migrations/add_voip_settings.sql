-- Add VoIP extension field to users table
ALTER TABLE users ADD COLUMN voip_extension VARCHAR(50);

-- Create index for faster lookups
CREATE INDEX idx_users_voip_extension ON users(voip_extension);

-- Insert VoIP settings group with default values
INSERT INTO settings (id, "group", data, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'voip',
  '{"apiToken": "", "apiEmail": "", "enabled": false}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT ("group") DO NOTHING;
