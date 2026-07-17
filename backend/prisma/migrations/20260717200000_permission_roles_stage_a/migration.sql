-- =============================================================================
-- Stage A: permission roles (schema + seed + backfill). Zero enforcement change.
-- =============================================================================
-- Creates:
--   PermissionEffect enum, roles, role_permissions, user_permission_overrides
--   users.role_id (NOT NULL after backfill)
-- Seeds 6 system roles + RolePermission compatibility matrix
-- Backfills role_id from legacy enum role; craig@pancom.co.za → Owner
-- Aborts if any user still has legacy enum roles user/management/viewer
-- =============================================================================

CREATE TYPE "PermissionEffect" AS ENUM ('GRANT', 'DENY');

CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_immutable" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_key" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_key")
);

CREATE INDEX "role_permissions_permission_key_idx" ON "role_permissions"("permission_key");

CREATE TABLE "user_permission_overrides" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_key" TEXT NOT NULL,
    "effect" "PermissionEffect" NOT NULL,
    "granted_by" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_permission_overrides_user_id_permission_key_key" ON "user_permission_overrides"("user_id", "permission_key");
CREATE INDEX "user_permission_overrides_permission_key_idx" ON "user_permission_overrides"("permission_key");

ALTER TABLE "users" ADD COLUMN "role_id" TEXT;

-- Abort if legacy enum roles still in use
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "users" WHERE "role"::text IN ('user', 'management', 'viewer')
  ) THEN
    RAISE EXCEPTION 'Stage A blocked: users still have legacy roles user/management/viewer — reassign first';
  END IF;
END $$;

INSERT INTO "roles" ("id", "key", "name", "description", "is_system", "is_immutable", "sort_order", "created_at", "updated_at")
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'owner', 'Owner', 'Protected full-access role (immutable)', true, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a0000000-0000-4000-8000-000000000002', 'admin', 'Administrator', 'Full access except assigning Owner', true, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a0000000-0000-4000-8000-000000000003', 'manager', 'Manager', 'Elevated access without strict-admin UTO tools or Owner assign', true, false, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a0000000-0000-4000-8000-000000000004', 'meter_user', 'Meter User', 'Copiers operational access (readings, machines, customers, consumables)', true, false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a0000000-0000-4000-8000-000000000005', 'capturer', 'Capturer', 'Meter capture only', true, false, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a0000000-0000-4000-8000-000000000006', 'sales_agent', 'Sales Agent', 'Fibre orders access + update requests', true, false, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "role_permissions" ("role_id", "permission_key")
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'dashboard.view'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.access'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.readings.view'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.readings.submit'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.readings.export'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.readings.import'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.readings.delete'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.readings.unlock_month'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.readings.uto_mark'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.readings.uto_request_override'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.readings.uto_force_override'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.readings.uto_list_blocked'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.machines.view'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.machines.create'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.machines.update'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.machines.delete'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.machines.import'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.machines.decommission'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.machines.recommission'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.customers.view'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.customers.create'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.customers.update'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.customers.delete'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.customers.import'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.customers.archive'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.consumables.view'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.consumables.order'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.consumables.import_orders'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.consumables.delete_order'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.consumables.parts.manage'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.consumables.costs.increase'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.catalog.makes_manage'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.catalog.models_manage'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.catalog.import'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.config.machines'),
  ('a0000000-0000-4000-8000-000000000001', 'copiers.config.pricing'),
  ('a0000000-0000-4000-8000-000000000001', 'connectivity.access'),
  ('a0000000-0000-4000-8000-000000000001', 'connectivity.reports.view'),
  ('a0000000-0000-4000-8000-000000000001', 'connectivity.outages.view'),
  ('a0000000-0000-4000-8000-000000000001', 'connectivity.targets.manage'),
  ('a0000000-0000-4000-8000-000000000001', 'connectivity.targets.check'),
  ('a0000000-0000-4000-8000-000000000001', 'connectivity.time_windows.manage'),
  ('a0000000-0000-4000-8000-000000000001', 'fibre_orders.access'),
  ('a0000000-0000-4000-8000-000000000001', 'fibre_orders.view_all'),
  ('a0000000-0000-4000-8000-000000000001', 'fibre_orders.create'),
  ('a0000000-0000-4000-8000-000000000001', 'fibre_orders.update'),
  ('a0000000-0000-4000-8000-000000000001', 'fibre_orders.notes'),
  ('a0000000-0000-4000-8000-000000000001', 'fibre_orders.products.manage'),
  ('a0000000-0000-4000-8000-000000000001', 'fibre_orders.update_requests.list'),
  ('a0000000-0000-4000-8000-000000000001', 'fibre_orders.update_requests.create'),
  ('a0000000-0000-4000-8000-000000000001', 'users.view'),
  ('a0000000-0000-4000-8000-000000000001', 'users.create'),
  ('a0000000-0000-4000-8000-000000000001', 'users.update'),
  ('a0000000-0000-4000-8000-000000000001', 'users.delete'),
  ('a0000000-0000-4000-8000-000000000001', 'users.manage_roles'),
  ('a0000000-0000-4000-8000-000000000001', 'users.manage_overrides'),
  ('a0000000-0000-4000-8000-000000000001', 'users.assign_owner'),
  ('a0000000-0000-4000-8000-000000000001', 'audit.view'),
  ('a0000000-0000-4000-8000-000000000001', 'notifications.access'),
  ('a0000000-0000-4000-8000-000000000001', 'branches.switch'),
  ('a0000000-0000-4000-8000-000000000002', 'dashboard.view'),
  ('a0000000-0000-4000-8000-000000000002', 'branches.switch'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.access'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.readings.view'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.readings.submit'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.readings.export'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.readings.import'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.readings.delete'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.readings.unlock_month'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.readings.uto_mark'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.readings.uto_request_override'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.machines.view'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.machines.create'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.machines.update'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.machines.decommission'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.machines.recommission'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.machines.delete'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.machines.import'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.customers.view'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.customers.archive'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.customers.create'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.customers.update'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.customers.delete'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.customers.import'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.consumables.view'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.consumables.order'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.consumables.import_orders'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.consumables.delete_order'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.consumables.parts.manage'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.consumables.costs.increase'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.catalog.makes_manage'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.catalog.models_manage'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.catalog.import'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.config.machines'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.config.pricing'),
  ('a0000000-0000-4000-8000-000000000002', 'connectivity.access'),
  ('a0000000-0000-4000-8000-000000000002', 'connectivity.reports.view'),
  ('a0000000-0000-4000-8000-000000000002', 'connectivity.outages.view'),
  ('a0000000-0000-4000-8000-000000000002', 'connectivity.targets.manage'),
  ('a0000000-0000-4000-8000-000000000002', 'connectivity.targets.check'),
  ('a0000000-0000-4000-8000-000000000002', 'connectivity.time_windows.manage'),
  ('a0000000-0000-4000-8000-000000000002', 'fibre_orders.access'),
  ('a0000000-0000-4000-8000-000000000002', 'fibre_orders.update_requests.create'),
  ('a0000000-0000-4000-8000-000000000002', 'fibre_orders.view_all'),
  ('a0000000-0000-4000-8000-000000000002', 'fibre_orders.create'),
  ('a0000000-0000-4000-8000-000000000002', 'fibre_orders.update'),
  ('a0000000-0000-4000-8000-000000000002', 'fibre_orders.notes'),
  ('a0000000-0000-4000-8000-000000000002', 'fibre_orders.products.manage'),
  ('a0000000-0000-4000-8000-000000000002', 'fibre_orders.update_requests.list'),
  ('a0000000-0000-4000-8000-000000000002', 'users.view'),
  ('a0000000-0000-4000-8000-000000000002', 'users.create'),
  ('a0000000-0000-4000-8000-000000000002', 'users.update'),
  ('a0000000-0000-4000-8000-000000000002', 'users.delete'),
  ('a0000000-0000-4000-8000-000000000002', 'users.manage_roles'),
  ('a0000000-0000-4000-8000-000000000002', 'users.manage_overrides'),
  ('a0000000-0000-4000-8000-000000000002', 'audit.view'),
  ('a0000000-0000-4000-8000-000000000002', 'notifications.access'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.readings.uto_force_override'),
  ('a0000000-0000-4000-8000-000000000002', 'copiers.readings.uto_list_blocked'),
  ('a0000000-0000-4000-8000-000000000003', 'dashboard.view'),
  ('a0000000-0000-4000-8000-000000000003', 'branches.switch'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.access'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.readings.view'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.readings.submit'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.readings.export'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.readings.import'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.readings.delete'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.readings.unlock_month'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.readings.uto_mark'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.readings.uto_request_override'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.machines.view'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.machines.create'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.machines.update'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.machines.decommission'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.machines.recommission'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.machines.delete'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.machines.import'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.customers.view'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.customers.archive'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.customers.create'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.customers.update'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.customers.delete'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.customers.import'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.consumables.view'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.consumables.order'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.consumables.import_orders'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.consumables.delete_order'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.consumables.parts.manage'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.consumables.costs.increase'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.catalog.makes_manage'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.catalog.models_manage'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.catalog.import'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.config.machines'),
  ('a0000000-0000-4000-8000-000000000003', 'copiers.config.pricing'),
  ('a0000000-0000-4000-8000-000000000003', 'connectivity.access'),
  ('a0000000-0000-4000-8000-000000000003', 'connectivity.reports.view'),
  ('a0000000-0000-4000-8000-000000000003', 'connectivity.outages.view'),
  ('a0000000-0000-4000-8000-000000000003', 'connectivity.targets.manage'),
  ('a0000000-0000-4000-8000-000000000003', 'connectivity.targets.check'),
  ('a0000000-0000-4000-8000-000000000003', 'connectivity.time_windows.manage'),
  ('a0000000-0000-4000-8000-000000000003', 'fibre_orders.access'),
  ('a0000000-0000-4000-8000-000000000003', 'fibre_orders.update_requests.create'),
  ('a0000000-0000-4000-8000-000000000003', 'fibre_orders.view_all'),
  ('a0000000-0000-4000-8000-000000000003', 'fibre_orders.create'),
  ('a0000000-0000-4000-8000-000000000003', 'fibre_orders.update'),
  ('a0000000-0000-4000-8000-000000000003', 'fibre_orders.notes'),
  ('a0000000-0000-4000-8000-000000000003', 'fibre_orders.products.manage'),
  ('a0000000-0000-4000-8000-000000000003', 'fibre_orders.update_requests.list'),
  ('a0000000-0000-4000-8000-000000000003', 'users.view'),
  ('a0000000-0000-4000-8000-000000000003', 'users.create'),
  ('a0000000-0000-4000-8000-000000000003', 'users.update'),
  ('a0000000-0000-4000-8000-000000000003', 'users.delete'),
  ('a0000000-0000-4000-8000-000000000003', 'users.manage_roles'),
  ('a0000000-0000-4000-8000-000000000003', 'users.manage_overrides'),
  ('a0000000-0000-4000-8000-000000000003', 'audit.view'),
  ('a0000000-0000-4000-8000-000000000003', 'notifications.access'),
  ('a0000000-0000-4000-8000-000000000004', 'dashboard.view'),
  ('a0000000-0000-4000-8000-000000000004', 'branches.switch'),
  ('a0000000-0000-4000-8000-000000000004', 'copiers.access'),
  ('a0000000-0000-4000-8000-000000000004', 'copiers.readings.view'),
  ('a0000000-0000-4000-8000-000000000004', 'copiers.readings.submit'),
  ('a0000000-0000-4000-8000-000000000004', 'copiers.readings.export'),
  ('a0000000-0000-4000-8000-000000000004', 'copiers.machines.view'),
  ('a0000000-0000-4000-8000-000000000004', 'copiers.machines.create'),
  ('a0000000-0000-4000-8000-000000000004', 'copiers.machines.update'),
  ('a0000000-0000-4000-8000-000000000004', 'copiers.machines.decommission'),
  ('a0000000-0000-4000-8000-000000000004', 'copiers.machines.recommission'),
  ('a0000000-0000-4000-8000-000000000004', 'copiers.customers.view'),
  ('a0000000-0000-4000-8000-000000000004', 'copiers.customers.archive'),
  ('a0000000-0000-4000-8000-000000000004', 'copiers.consumables.view'),
  ('a0000000-0000-4000-8000-000000000004', 'copiers.consumables.order'),
  ('a0000000-0000-4000-8000-000000000005', 'dashboard.view'),
  ('a0000000-0000-4000-8000-000000000005', 'branches.switch'),
  ('a0000000-0000-4000-8000-000000000005', 'copiers.access'),
  ('a0000000-0000-4000-8000-000000000005', 'copiers.readings.view'),
  ('a0000000-0000-4000-8000-000000000005', 'copiers.readings.submit'),
  ('a0000000-0000-4000-8000-000000000005', 'copiers.readings.export'),
  ('a0000000-0000-4000-8000-000000000006', 'dashboard.view'),
  ('a0000000-0000-4000-8000-000000000006', 'branches.switch'),
  ('a0000000-0000-4000-8000-000000000006', 'fibre_orders.access'),
  ('a0000000-0000-4000-8000-000000000006', 'fibre_orders.update_requests.create');

-- Backfill role_id from legacy enum (matches role.key)
UPDATE "users" u
SET "role_id" = r."id"
FROM "roles" r
WHERE r."key" = u."role"::text;

-- Craig → Owner (enum column left as-is for dual-run)
UPDATE "users" u
SET "role_id" = r."id"
FROM "roles" r
WHERE r."key" = 'owner'
  AND lower(u."email") = lower('craig@pancom.co.za');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" WHERE "role_id" IS NULL) THEN
    RAISE EXCEPTION 'Stage A blocked: one or more users have no role_id after backfill';
  END IF;
END $$;

ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL;

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
