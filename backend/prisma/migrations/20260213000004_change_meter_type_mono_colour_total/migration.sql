-- Migrate existing 'scan' parts to 'mono' before changing enum
UPDATE "model_parts" SET "meter_type" = 'mono' WHERE "meter_type" = 'scan';

-- Drop default so we can alter the column type
ALTER TABLE "model_parts" ALTER COLUMN "meter_type" DROP DEFAULT;

-- Create new enum (PostgreSQL cannot remove enum values directly)
CREATE TYPE "MeterType_new" AS ENUM ('mono', 'colour', 'total');

-- Update column to use new enum
ALTER TABLE "model_parts" 
  ALTER COLUMN "meter_type" TYPE "MeterType_new" 
  USING ("meter_type"::text::"MeterType_new");

-- Drop old enum and rename new one
DROP TYPE "MeterType";
ALTER TYPE "MeterType_new" RENAME TO "MeterType";

-- Restore default
ALTER TABLE "model_parts" ALTER COLUMN "meter_type" SET DEFAULT 'mono'::"MeterType";
