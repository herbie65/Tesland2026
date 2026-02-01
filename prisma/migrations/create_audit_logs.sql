-- Create audit_logs table for comprehensive system tracking
-- Hybrid approach: automatic + manual tracking

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- What was changed?
  entity_type TEXT NOT NULL,           -- 'WorkOrder', 'Invoice', 'Planning', 'Customer', etc.
  entity_id TEXT NOT NULL,             -- ID of the entity
  action TEXT NOT NULL,                 -- 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', etc.
  
  -- Who made the change?
  user_id TEXT,                        -- References users table
  user_name TEXT,                      -- Denormalized for history
  user_email TEXT,                     -- Denormalized for history
  user_role TEXT,                      -- Denormalized for history
  
  -- When?
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Details
  changes JSONB,                       -- Field-level changes: { "field": { "from": "old", "to": "new" } }
  metadata JSONB,                      -- Additional context (IP, browser, business context, etc.)
  description TEXT,                    -- Human-readable description
  
  -- System info
  ip_address TEXT,                     -- Client IP address
  user_agent TEXT,                     -- Browser/client info
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_composite ON audit_logs(entity_type, entity_id, timestamp DESC);

-- GIN index for JSONB searching
CREATE INDEX idx_audit_logs_changes ON audit_logs USING GIN (changes);
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING GIN (metadata);

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system changes. Hybrid approach: automatic tracking via Prisma middleware + manual tracking for business-critical events.';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity that was modified (WorkOrder, Invoice, Planning, etc.)';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (CREATE, UPDATE, DELETE, STATUS_CHANGE, PAYMENT_RECEIVED, etc.)';
COMMENT ON COLUMN audit_logs.changes IS 'Field-level changes in format: {"fieldName": {"from": "oldValue", "to": "newValue"}}';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context like business logic, notifications sent, related entities, etc.';
