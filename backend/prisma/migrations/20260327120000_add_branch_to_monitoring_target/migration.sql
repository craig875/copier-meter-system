-- AlterTable
ALTER TABLE "monitoring_targets" ADD COLUMN "branch" "Branch" NOT NULL DEFAULT 'JHB';

-- CreateIndex
CREATE INDEX "monitoring_targets_branch_idx" ON "monitoring_targets"("branch");
