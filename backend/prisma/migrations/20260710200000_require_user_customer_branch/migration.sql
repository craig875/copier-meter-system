-- Require branch on users and customers (hard tenancy Stage 2).
-- Safe only when no NULL rows exist (verified on production 2026-07-10).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" WHERE "branch" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require users.branch: null branch users still exist';
  END IF;
  IF EXISTS (SELECT 1 FROM "customers" WHERE "branch" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require customers.branch: null branch customers still exist';
  END IF;
END $$;

ALTER TABLE "users" ALTER COLUMN "branch" SET NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "branch" SET NOT NULL;
