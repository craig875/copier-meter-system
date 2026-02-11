-- Add order_date column (nullable first)
ALTER TABLE "fibre_orders" ADD COLUMN IF NOT EXISTS "order_date" TIMESTAMP(3);

-- Set order_date to order_placement_date for existing rows
UPDATE "fibre_orders" SET "order_date" = "order_placement_date" WHERE "order_date" IS NULL;

-- Make order_date required
ALTER TABLE "fibre_orders" ALTER COLUMN "order_date" SET NOT NULL;

-- Drop customer_reference column
ALTER TABLE "fibre_orders" DROP COLUMN IF EXISTS "customer_reference";
