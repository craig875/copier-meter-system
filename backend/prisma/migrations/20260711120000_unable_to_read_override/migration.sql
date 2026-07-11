-- Additive: consecutive Unable-to-obtain override metadata on readings
ALTER TABLE "readings" ADD COLUMN "unable_to_read_override" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "readings" ADD COLUMN "unable_to_read_override_reason" TEXT;
ALTER TABLE "readings" ADD COLUMN "unable_to_read_override_by" TEXT;
ALTER TABLE "readings" ADD COLUMN "unable_to_read_override_at" TIMESTAMP(3);

ALTER TABLE "readings"
  ADD CONSTRAINT "readings_unable_to_read_override_by_fkey"
  FOREIGN KEY ("unable_to_read_override_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "readings_unable_to_read_override_by_idx"
  ON "readings"("unable_to_read_override_by");