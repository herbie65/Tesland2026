-- Add completed checkbox field to labor_lines table
-- This allows monteurs to check off completed tasks

ALTER TABLE labor_lines 
ADD COLUMN completed BOOLEAN NOT NULL DEFAULT false;
