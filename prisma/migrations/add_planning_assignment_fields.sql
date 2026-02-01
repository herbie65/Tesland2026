-- Add missing columns to planning_items table
ALTER TABLE planning_items 
  ADD COLUMN IF NOT EXISTS assignment_text TEXT,
  ADD COLUMN IF NOT EXISTS agreement_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS agreement_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN planning_items.assignment_text IS 'JSON array of checklist items for werkzaamheden';
COMMENT ON COLUMN planning_items.agreement_amount IS 'Agreed amount with customer';
COMMENT ON COLUMN planning_items.agreement_notes IS 'Notes about the agreement';
