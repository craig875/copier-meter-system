-- Additive: optional justification when a counter matches the previous month
ALTER TABLE "readings" ADD COLUMN "mono_unchanged_reason" TEXT;
ALTER TABLE "readings" ADD COLUMN "colour_unchanged_reason" TEXT;
ALTER TABLE "readings" ADD COLUMN "scan_unchanged_reason" TEXT;
