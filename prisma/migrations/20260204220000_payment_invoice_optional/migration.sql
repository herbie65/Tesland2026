-- AlterTable: make Payment.invoiceId optional (webshop: invoice created only after payment)
ALTER TABLE "payments" ALTER COLUMN "invoice_id" DROP NOT NULL;
