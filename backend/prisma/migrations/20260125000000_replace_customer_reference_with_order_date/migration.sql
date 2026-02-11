-- Add branch column to machines
ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "branch" "Branch" NOT NULL DEFAULT 'JHB';
CREATE INDEX IF NOT EXISTS "machines_branch_idx" ON "machines"("branch");

-- Add branch column to readings
ALTER TABLE "readings" ADD COLUMN IF NOT EXISTS "branch" "Branch" NOT NULL DEFAULT 'JHB';
CREATE INDEX IF NOT EXISTS "readings_branch_idx" ON "readings"("branch");

-- Add branch column to submissions (requires unique constraint change)
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "branch" "Branch" NOT NULL DEFAULT 'JHB';

-- Update submissions: drop old unique, add new one with branch, add branch index
DROP INDEX IF EXISTS "submissions_year_month_key";
CREATE UNIQUE INDEX "submissions_year_month_branch_key" ON "submissions"("year", "month", "branch");
CREATE INDEX IF NOT EXISTS "submissions_branch_idx" ON "submissions"("branch");
