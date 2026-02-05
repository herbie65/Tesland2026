-- Make user.password nullable for passwordless customer accounts
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- Passwordless login codes (email OTP)
CREATE TABLE "customer_login_codes" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "customer_id" TEXT,
  "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_address" TEXT,
  "user_agent" TEXT,

  CONSTRAINT "customer_login_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_login_codes_email_idx" ON "customer_login_codes"("email");
CREATE INDEX "customer_login_codes_customer_id_idx" ON "customer_login_codes"("customer_id");
CREATE INDEX "customer_login_codes_expires_at_idx" ON "customer_login_codes"("expires_at");

ALTER TABLE "customer_login_codes"
ADD CONSTRAINT "customer_login_codes_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

