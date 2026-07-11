-- CreateEnum
CREATE TYPE "UnableToObtainOverrideRequestStatus" AS ENUM ('pending', 'resolved');

-- CreateTable
CREATE TABLE "unable_to_obtain_override_requests" (
    "id" TEXT NOT NULL,
    "machine_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "branch" "Branch" NOT NULL DEFAULT 'JHB',
    "requested_by_id" TEXT NOT NULL,
    "note" TEXT,
    "status" "UnableToObtainOverrideRequestStatus" NOT NULL DEFAULT 'pending',
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unable_to_obtain_override_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "unable_to_obtain_override_requests"
  ADD CONSTRAINT "unable_to_obtain_override_requests_machine_id_fkey"
  FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "unable_to_obtain_override_requests"
  ADD CONSTRAINT "unable_to_obtain_override_requests_requested_by_id_fkey"
  FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "unable_to_obtain_override_requests"
  ADD CONSTRAINT "unable_to_obtain_override_requests_resolved_by_id_fkey"
  FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "unable_to_obtain_override_requests_machine_id_year_month_idx"
  ON "unable_to_obtain_override_requests"("machine_id", "year", "month");

CREATE INDEX "unable_to_obtain_override_requests_status_created_at_idx"
  ON "unable_to_obtain_override_requests"("status", "created_at");

CREATE INDEX "unable_to_obtain_override_requests_branch_status_idx"
  ON "unable_to_obtain_override_requests"("branch", "status");

CREATE UNIQUE INDEX "unable_to_obtain_override_requests_pending_unique"
  ON "unable_to_obtain_override_requests"("machine_id", "year", "month")
  WHERE "status" = 'pending';