-- Add work_sessions table for multi-mechanic time tracking

CREATE TABLE work_sessions (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_work_sessions_work_order ON work_sessions(work_order_id);
CREATE INDEX idx_work_sessions_user ON work_sessions(user_id);
CREATE INDEX idx_work_sessions_active ON work_sessions(ended_at) WHERE ended_at IS NULL;

-- Comments
COMMENT ON TABLE work_sessions IS 'Time tracking sessies voor monteurs per werkorder';
COMMENT ON COLUMN work_sessions.work_order_id IS 'Werkorder waar aan gewerkt wordt';
COMMENT ON COLUMN work_sessions.user_id IS 'Monteur die werkt';
COMMENT ON COLUMN work_sessions.started_at IS 'Start tijd van deze sessie';
COMMENT ON COLUMN work_sessions.ended_at IS 'Eind tijd (NULL = nog bezig)';
COMMENT ON COLUMN work_sessions.duration_minutes IS 'Totale duur in minuten';
