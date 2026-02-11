-- CreateEnum (Branch must exist before adding column)
DO $$ BEGIN
  CREATE TYPE "Branch" AS ENUM ('JHB', 'CT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "branch" "Branch";
