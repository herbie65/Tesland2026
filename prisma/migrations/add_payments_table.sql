-- Add payments table for Mollie integration
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'MOLLIE',
  provider_payment_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  description TEXT,
  checkout_url TEXT,
  webhook_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(255)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Comments
COMMENT ON TABLE payments IS 'Online betalingen via Mollie of andere providers';
COMMENT ON COLUMN payments.provider_payment_id IS 'External payment ID (e.g., Mollie transaction ID)';
COMMENT ON COLUMN payments.status IS 'Payment status: open, paid, canceled, expired, failed';
COMMENT ON COLUMN payments.metadata IS 'Extra payment metadata from provider';
