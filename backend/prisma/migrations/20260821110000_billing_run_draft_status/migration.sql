-- AlterTable
ALTER TABLE "billing_runs" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "billing_runs" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing runs were final saves before draft workflow
UPDATE "billing_runs" SET "status" = 'submitted';

-- CreateIndex
CREATE INDEX "billing_runs_status_idx" ON "billing_runs"("status");

-- CreateTable
CREATE TABLE "billing_run_files" (
    "id" TEXT NOT NULL,
    "billing_run_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "encoding" TEXT NOT NULL DEFAULT 'text',
    "content_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_run_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_run_files_billing_run_id_idx" ON "billing_run_files"("billing_run_id");

-- AddForeignKey
ALTER TABLE "billing_run_files" ADD CONSTRAINT "billing_run_files_billing_run_id_fkey" FOREIGN KEY ("billing_run_id") REFERENCES "billing_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
