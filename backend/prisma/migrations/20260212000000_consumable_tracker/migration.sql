-- CreateEnum
CREATE TYPE "PartType" AS ENUM ('general', 'toner');

-- CreateEnum
CREATE TYPE "MeterType" AS ENUM ('mono', 'colour', 'scan');

-- AlterTable
ALTER TABLE "machines" ADD COLUMN "make" TEXT;

-- CreateTable
CREATE TABLE "model_parts" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "part_name" TEXT NOT NULL,
    "part_type" "PartType" NOT NULL DEFAULT 'general',
    "expected_yield" INTEGER NOT NULL,
    "cost_rand" DECIMAL(12,2) NOT NULL,
    "meter_type" "MeterType" NOT NULL DEFAULT 'mono',
    "branch" "Branch" NOT NULL DEFAULT 'JHB',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_replacements" (
    "id" TEXT NOT NULL,
    "machine_id" TEXT NOT NULL,
    "model_part_id" TEXT NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "prior_reading" INTEGER NOT NULL,
    "current_reading" INTEGER NOT NULL,
    "usage" INTEGER NOT NULL,
    "remaining_toner_percent" DOUBLE PRECISION,
    "yield_met" BOOLEAN NOT NULL,
    "shortfall_clicks" INTEGER NOT NULL DEFAULT 0,
    "adjusted_shortfall_clicks" INTEGER NOT NULL DEFAULT 0,
    "cost_per_click" DECIMAL(10,4) NOT NULL,
    "display_charge_rand" DECIMAL(12,2) NOT NULL,
    "expected_yield_snapshot" INTEGER NOT NULL,
    "cost_rand_snapshot" DECIMAL(12,2) NOT NULL,
    "branch" "Branch" NOT NULL DEFAULT 'JHB',
    "captured_by" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_replacements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "machines_model_idx" ON "machines"("model");

-- CreateIndex
CREATE UNIQUE INDEX "model_parts_model_part_name_branch_key" ON "model_parts"("model", "part_name", "branch");

-- CreateIndex
CREATE INDEX "model_parts_model_idx" ON "model_parts"("model");

-- CreateIndex
CREATE INDEX "model_parts_branch_idx" ON "model_parts"("branch");

-- CreateIndex
CREATE INDEX "part_replacements_machine_id_idx" ON "part_replacements"("machine_id");

-- CreateIndex
CREATE INDEX "part_replacements_model_part_id_idx" ON "part_replacements"("model_part_id");

-- CreateIndex
CREATE INDEX "part_replacements_order_date_idx" ON "part_replacements"("order_date");

-- CreateIndex
CREATE INDEX "part_replacements_branch_idx" ON "part_replacements"("branch");

-- AddForeignKey
ALTER TABLE "part_replacements" ADD CONSTRAINT "part_replacements_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_replacements" ADD CONSTRAINT "part_replacements_model_part_id_fkey" FOREIGN KEY ("model_part_id") REFERENCES "model_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_replacements" ADD CONSTRAINT "part_replacements_captured_by_fkey" FOREIGN KEY ("captured_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
