-- CreateTable
CREATE TABLE "billing_runs" (
    "id" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "processed_by" TEXT NOT NULL,
    "notes" TEXT,
    "total_mobile" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_intl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_national" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_local" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_special" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_virtual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_vce" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grand_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "client_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_run_lines" (
    "id" TEXT NOT NULL,
    "billing_run_id" TEXT NOT NULL,
    "client_code" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "mobile" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "international" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "national" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "local" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "special" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "virtual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vce" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "line_total" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "billing_run_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engine3_lookup" (
    "id" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "smart_edge_code" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engine3_lookup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_exclusions" (
    "id" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_runs_branch_idx" ON "billing_runs"("branch");

-- CreateIndex
CREATE INDEX "billing_runs_period_idx" ON "billing_runs"("period");

-- CreateIndex
CREATE INDEX "billing_runs_created_at_idx" ON "billing_runs"("created_at");

-- CreateIndex
CREATE INDEX "billing_run_lines_billing_run_id_idx" ON "billing_run_lines"("billing_run_id");

-- CreateIndex
CREATE INDEX "billing_run_lines_client_code_idx" ON "billing_run_lines"("client_code");

-- CreateIndex
CREATE INDEX "engine3_lookup_branch_idx" ON "engine3_lookup"("branch");

-- CreateIndex
CREATE UNIQUE INDEX "engine3_lookup_branch_customer_name_key" ON "engine3_lookup"("branch", "customer_name");

-- CreateIndex
CREATE INDEX "finance_exclusions_branch_idx" ON "finance_exclusions"("branch");

-- CreateIndex
CREATE UNIQUE INDEX "finance_exclusions_branch_type_value_key" ON "finance_exclusions"("branch", "type", "value");

-- AddForeignKey
ALTER TABLE "billing_run_lines" ADD CONSTRAINT "billing_run_lines_billing_run_id_fkey" FOREIGN KEY ("billing_run_id") REFERENCES "billing_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
