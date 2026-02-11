-- AlterTable
ALTER TABLE "readings" DROP COLUMN IF EXISTS "over_volume";

-- AlterTable
ALTER TABLE "machines" DROP COLUMN IF EXISTS "max_monthly_volume";

