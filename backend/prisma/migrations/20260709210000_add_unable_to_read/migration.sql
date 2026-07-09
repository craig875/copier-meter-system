-- Additive: explicit "unable to obtain" escape hatch for meter capture
ALTER TABLE "readings" ADD COLUMN "unable_to_read" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "readings" ADD COLUMN "unable_to_read_reason" TEXT;
