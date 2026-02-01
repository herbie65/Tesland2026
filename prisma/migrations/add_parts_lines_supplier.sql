-- Add supplier column to parts_lines table for tracking order suppliers

ALTER TABLE parts_lines 
ADD COLUMN IF NOT EXISTS supplier TEXT;
