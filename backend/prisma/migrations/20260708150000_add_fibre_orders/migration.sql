-- Drop legacy fibre order tables if they exist from a previous build
DROP TABLE IF EXISTS "order_updates" CASCADE;
DROP TABLE IF EXISTS "fibre_orders" CASCADE;
DROP TABLE IF EXISTS "fibre_products" CASCADE;
DROP TYPE IF EXISTS "OrderStatus" CASCADE;

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM (
  'order_placed',
  'wayleave_pending',
  'wayleave_approved',
  'scheduled',
  'installed',
  'cancelled',
  'on_hold'
);

-- CreateTable
CREATE TABLE "fibre_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "product_type" TEXT NOT NULL,
    "default_eta_days" INTEGER NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fibre_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fibre_orders" (
    "id" TEXT NOT NULL,
    "branch" "Branch" NOT NULL DEFAULT 'JHB',
    "customer_name" TEXT NOT NULL,
    "customer_reference" TEXT,
    "installation_address" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sales_agent_id" TEXT NOT NULL,
    "order_placement_date" DATE NOT NULL,
    "expected_install_date" DATE NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'order_placed',
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fibre_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_updates" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "previous_status" "OrderStatus",
    "new_status" "OrderStatus",
    "note" TEXT,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fibre_orders_branch_idx" ON "fibre_orders"("branch");

-- CreateIndex
CREATE INDEX "fibre_orders_status_idx" ON "fibre_orders"("status");

-- CreateIndex
CREATE INDEX "fibre_orders_sales_agent_id_idx" ON "fibre_orders"("sales_agent_id");

-- CreateIndex
CREATE INDEX "fibre_orders_order_placement_date_idx" ON "fibre_orders"("order_placement_date");

-- CreateIndex
CREATE INDEX "order_updates_order_id_idx" ON "order_updates"("order_id");

-- AddForeignKey
ALTER TABLE "fibre_orders" ADD CONSTRAINT "fibre_orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "fibre_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fibre_orders" ADD CONSTRAINT "fibre_orders_sales_agent_id_fkey" FOREIGN KEY ("sales_agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fibre_orders" ADD CONSTRAINT "fibre_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_updates" ADD CONSTRAINT "order_updates_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "fibre_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_updates" ADD CONSTRAINT "order_updates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
