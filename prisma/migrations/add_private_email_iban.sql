-- Add private email and IBAN to users table
-- Migration: Add HR financial information fields

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS private_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS iban VARCHAR(34);

-- Create index for private_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_private_email ON users(private_email);

-- Add comment
COMMENT ON COLUMN users.private_email IS 'Private/personal email address of the employee';
COMMENT ON COLUMN users.iban IS 'International Bank Account Number for salary payments';
