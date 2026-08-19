-- AlterTable
ALTER TABLE "billing_run_lines" ADD COLUMN "line_type" TEXT NOT NULL DEFAULT 'billed';

-- CreateIndex
CREATE INDEX "billing_run_lines_billing_run_id_line_type_idx" ON "billing_run_lines"("billing_run_id", "line_type");
