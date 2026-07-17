-- =============================================================================
-- Installations tracker (fresh build)
-- =============================================================================
-- Tables: install_types, installs, install_updates, install_documents, app_settings
-- Unrelated to dormant installation_types / installation_projects checklist schema.
-- =============================================================================

CREATE TYPE "InstallStatus" AS ENUM ('active', 'complete', 'on_hold', 'cancelled');
CREATE TYPE "InstallDocumentKind" AS ENUM ('LINK', 'FILE');

CREATE TABLE "install_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "install_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "install_types_code_key" ON "install_types"("code");

CREATE TABLE "installs" (
    "id" TEXT NOT NULL,
    "branch" "Branch" NOT NULL,
    "type_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "site_name" TEXT,
    "site_address" TEXT,
    "sales_order_number" TEXT,
    "status" "InstallStatus" NOT NULL DEFAULT 'active',
    "progress" TEXT,
    "scheduled_date" DATE,
    "completed_date" DATE,
    "assigned_technician_name" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "installs_branch_idx" ON "installs"("branch");
CREATE INDEX "installs_status_idx" ON "installs"("status");
CREATE INDEX "installs_type_id_idx" ON "installs"("type_id");
CREATE INDEX "installs_created_by_idx" ON "installs"("created_by");

CREATE TABLE "install_updates" (
    "id" TEXT NOT NULL,
    "install_id" TEXT NOT NULL,
    "previous_status" "InstallStatus",
    "new_status" "InstallStatus",
    "previous_progress" TEXT,
    "new_progress" TEXT,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "install_updates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "install_updates_install_id_idx" ON "install_updates"("install_id");
CREATE INDEX "install_updates_created_at_idx" ON "install_updates"("created_at");

CREATE TABLE "install_documents" (
    "id" TEXT NOT NULL,
    "install_id" TEXT NOT NULL,
    "kind" "InstallDocumentKind" NOT NULL DEFAULT 'LINK',
    "label" TEXT,
    "url" TEXT,
    "storage_key" TEXT,
    "file_name" TEXT,
    "content_type" TEXT,
    "byte_size" INTEGER,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "install_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "install_documents_install_id_idx" ON "install_documents"("install_id");

CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");

ALTER TABLE "installs"
  ADD CONSTRAINT "installs_type_id_fkey"
  FOREIGN KEY ("type_id") REFERENCES "install_types"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "installs"
  ADD CONSTRAINT "installs_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "install_updates"
  ADD CONSTRAINT "install_updates_install_id_fkey"
  FOREIGN KEY ("install_id") REFERENCES "installs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "install_updates"
  ADD CONSTRAINT "install_updates_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "install_documents"
  ADD CONSTRAINT "install_documents_install_id_fkey"
  FOREIGN KEY ("install_id") REFERENCES "installs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "install_documents"
  ADD CONSTRAINT "install_documents_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "app_settings"
  ADD CONSTRAINT "app_settings_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default hardware types so create works before type-admin UI exists.
INSERT INTO "install_types" ("id", "code", "name", "description", "is_active", "created_at", "updated_at")
VALUES
  ('b0000000-0000-4000-8000-000000000001', 'copier', 'Copier', 'Copier / MFP hardware installation', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('b0000000-0000-4000-8000-000000000002', 'fibre_equipment', 'Fibre equipment', 'Fibre CPE / related hardware installation', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('b0000000-0000-4000-8000-000000000003', 'other', 'Other', 'Other hardware installation', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Placeholder sales-order URL template (admin should replace with real accounting URL).
INSERT INTO "app_settings" ("id", "key", "value", "updated_at", "updated_by")
VALUES (
  'b0000000-0000-4000-8000-000000000010',
  'accounting.sales_order_url_template',
  'https://example.com/orders/{orderNumber}',
  CURRENT_TIMESTAMP,
  NULL
);
