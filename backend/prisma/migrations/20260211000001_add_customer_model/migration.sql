-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "branch" "Branch",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customers_name_idx" ON "customers"("name");
CREATE INDEX "customers_branch_idx" ON "customers"("branch");

-- Add customer_id to machines
ALTER TABLE "machines" ADD COLUMN "customer_id" TEXT;

-- Migrate: create customers from distinct (customer, branch) in machines
INSERT INTO "customers" ("id", "name", "branch", "created_at", "updated_at")
SELECT gen_random_uuid()::text, trim(m.customer), m.branch, NOW(), NOW()
FROM (
  SELECT DISTINCT trim(customer) AS customer, branch
  FROM machines
  WHERE customer IS NOT NULL AND trim(customer) != ''
) m;

-- Update machines with customer_id
UPDATE machines mach
SET customer_id = c.id
FROM customers c
WHERE trim(mach.customer) = c.name
  AND mach.branch = c.branch
  AND mach.customer IS NOT NULL
  AND trim(mach.customer) != '';

-- For machines where branch didn't match, try name-only match
UPDATE machines mach
SET customer_id = (
  SELECT c.id FROM customers c
  WHERE trim(mach.customer) = c.name
  AND mach.customer_id IS NULL
  LIMIT 1
)
WHERE mach.customer IS NOT NULL
  AND trim(mach.customer) != ''
  AND mach.customer_id IS NULL;

-- Drop old customer column
ALTER TABLE "machines" DROP COLUMN "customer";

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "machines_customer_id_idx" ON "machines"("customer_id");
