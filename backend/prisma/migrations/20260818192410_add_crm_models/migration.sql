-- CreateEnum
CREATE TYPE "CrmStatus" AS ENUM ('prospect', 'active', 'dormant', 'churned');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost');

-- CreateEnum
CREATE TYPE "CrmActivityType" AS ENUM ('call', 'email', 'meeting', 'note');

-- CreateEnum
CREATE TYPE "CrmTaskStatus" AS ENUM ('pending', 'done');

-- CreateEnum
CREATE TYPE "CrmTaskPriority" AS ENUM ('low', 'medium', 'high');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "account_manager_id" TEXT,
ADD COLUMN     "crm_status" "CrmStatus" NOT NULL DEFAULT 'prospect',
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "owner_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stage" "DealStage" NOT NULL DEFAULT 'lead',
    "value" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "expected_close_date" TIMESTAMP(3),
    "actual_close_date" TIMESTAMP(3),
    "lost_reason" TEXT,
    "source" TEXT,
    "branch" "Branch" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_activities" (
    "id" TEXT NOT NULL,
    "type" "CrmActivityType" NOT NULL,
    "customer_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "deal_id" TEXT,
    "user_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "activity_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "status" "CrmTaskStatus" NOT NULL DEFAULT 'pending',
    "priority" "CrmTaskPriority" NOT NULL DEFAULT 'medium',
    "assigned_to_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "deal_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "crm_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_customer_id_idx" ON "contacts"("customer_id");

-- CreateIndex
CREATE INDEX "deals_customer_id_idx" ON "deals"("customer_id");

-- CreateIndex
CREATE INDEX "deals_owner_id_idx" ON "deals"("owner_id");

-- CreateIndex
CREATE INDEX "deals_branch_idx" ON "deals"("branch");

-- CreateIndex
CREATE INDEX "crm_activities_customer_id_idx" ON "crm_activities"("customer_id");

-- CreateIndex
CREATE INDEX "crm_activities_deal_id_idx" ON "crm_activities"("deal_id");

-- CreateIndex
CREATE INDEX "crm_tasks_assigned_to_id_idx" ON "crm_tasks"("assigned_to_id");

-- CreateIndex
CREATE INDEX "crm_tasks_customer_id_idx" ON "crm_tasks"("customer_id");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_account_manager_id_fkey" FOREIGN KEY ("account_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
