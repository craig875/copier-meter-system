-- =============================================================================
-- Install tasks (sub-tasks on installations, assigned to Users)
-- =============================================================================

CREATE TYPE "InstallTaskStatus" AS ENUM ('assigned', 'acknowledged', 'complete');

CREATE TABLE "install_tasks" (
    "id" TEXT NOT NULL,
    "install_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigned_to_id" TEXT NOT NULL,
    "status" "InstallTaskStatus" NOT NULL DEFAULT 'assigned',
    "created_by_id" TEXT NOT NULL,
    "acknowledged_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "install_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "install_tasks_install_id_idx" ON "install_tasks"("install_id");
CREATE INDEX "install_tasks_assigned_to_id_idx" ON "install_tasks"("assigned_to_id");
CREATE INDEX "install_tasks_status_idx" ON "install_tasks"("status");

ALTER TABLE "install_tasks"
  ADD CONSTRAINT "install_tasks_install_id_fkey"
  FOREIGN KEY ("install_id") REFERENCES "installs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "install_tasks"
  ADD CONSTRAINT "install_tasks_assigned_to_id_fkey"
  FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "install_tasks"
  ADD CONSTRAINT "install_tasks_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
