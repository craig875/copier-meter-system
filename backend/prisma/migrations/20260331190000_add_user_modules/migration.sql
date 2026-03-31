-- AlterTable
ALTER TABLE "users" ADD COLUMN "modules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill by role (existing behaviour preserved)
UPDATE "users" SET "modules" = ARRAY['copiers', 'connectivity']::TEXT[] WHERE role = 'admin';
UPDATE "users" SET "modules" = ARRAY['copiers']::TEXT[] WHERE role IN ('meter_user', 'capturer', 'management', 'sales_agent', 'user');
UPDATE "users" SET "modules" = ARRAY['connectivity']::TEXT[] WHERE role = 'viewer';
UPDATE "users" SET "modules" = ARRAY['copiers']::TEXT[] WHERE cardinality("modules") = 0;
