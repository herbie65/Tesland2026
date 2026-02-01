-- Update audit_logs to new schema (add missing columns)

-- Add entity_type (rename from resource)
ALTER TABLE audit_logs RENAME COLUMN resource TO entity_type;

-- Add entity_id (rename from resource_id)
ALTER TABLE audit_logs RENAME COLUMN resource_id TO entity_id;

-- Add metadata (rename from context)
ALTER TABLE audit_logs RENAME COLUMN context TO metadata;

-- Add missing columns
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_composite ON audit_logs(entity_type, entity_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata ON audit_logs USING GIN (metadata);

-- Update comments
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system changes. Hybrid approach: automatic tracking via Prisma middleware + manual tracking for business-critical events.';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity that was modified (WorkOrder, Invoice, Planning, etc.)';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (CREATE, UPDATE, DELETE, STATUS_CHANGE, PAYMENT_RECEIVED, etc.)';
COMMENT ON COLUMN audit_logs.changes IS 'Field-level changes in format: {"fieldName": {"from": "oldValue", "to": "newValue"}}';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context like business logic, notifications sent, related entities, etc.';
