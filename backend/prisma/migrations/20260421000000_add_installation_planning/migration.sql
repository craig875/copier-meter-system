-- CreateEnum
CREATE TYPE "InstallationDuty" AS ENUM ('PROJECT_LEAD', 'TECHNICIAN', 'SALES', 'CONNECTIVITY_SPECIALIST');

-- CreateEnum
CREATE TYPE "InstallationProjectStatus" AS ENUM ('draft', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "InstallationProjectStepStatus" AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

-- CreateTable
CREATE TABLE "installation_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installation_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installation_type_steps" (
    "id" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duty" "InstallationDuty" NOT NULL,
    "is_blocking" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installation_type_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installation_projects" (
    "id" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "customer_name" TEXT,
    "site_label" TEXT,
    "notes" TEXT,
    "status" "InstallationProjectStatus" NOT NULL DEFAULT 'draft',
    "planned_start" TIMESTAMP(3),
    "planned_end" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installation_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installation_project_steps" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "template_step_id" TEXT,
    "sort_order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duty" "InstallationDuty" NOT NULL,
    "is_blocking" BOOLEAN NOT NULL DEFAULT true,
    "status" "InstallationProjectStepStatus" NOT NULL DEFAULT 'pending',
    "completed_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installation_project_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installation_project_assignments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "duty" "InstallationDuty" NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installation_project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "installation_types_code_key" ON "installation_types"("code");

-- CreateIndex
CREATE INDEX "installation_type_steps_type_id_idx" ON "installation_type_steps"("type_id");

-- CreateIndex
CREATE INDEX "installation_projects_type_id_idx" ON "installation_projects"("type_id");

-- CreateIndex
CREATE INDEX "installation_projects_status_idx" ON "installation_projects"("status");

-- CreateIndex
CREATE INDEX "installation_projects_created_by_idx" ON "installation_projects"("created_by");

-- CreateIndex
CREATE INDEX "installation_project_steps_project_id_idx" ON "installation_project_steps"("project_id");

-- CreateIndex
CREATE INDEX "installation_project_assignments_user_id_idx" ON "installation_project_assignments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "installation_project_assignments_project_id_duty_key" ON "installation_project_assignments"("project_id", "duty");

-- AddForeignKey
ALTER TABLE "installation_type_steps" ADD CONSTRAINT "installation_type_steps_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "installation_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation_projects" ADD CONSTRAINT "installation_projects_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "installation_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation_projects" ADD CONSTRAINT "installation_projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation_project_steps" ADD CONSTRAINT "installation_project_steps_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "installation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation_project_steps" ADD CONSTRAINT "installation_project_steps_template_step_id_fkey" FOREIGN KEY ("template_step_id") REFERENCES "installation_type_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation_project_steps" ADD CONSTRAINT "installation_project_steps_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation_project_assignments" ADD CONSTRAINT "installation_project_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "installation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation_project_assignments" ADD CONSTRAINT "installation_project_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
