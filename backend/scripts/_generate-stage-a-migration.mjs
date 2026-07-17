/**
 * Generates Stage A migration SQL from catalog/matrix. Run once when authoring.
 *   node scripts/_generate-stage-a-migration.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ROLE_PERMISSION_MATRIX,
  SYSTEM_ROLES,
} from '../src/permissions/rolePermissionMatrix.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(
  __dirname,
  '../prisma/migrations/20260717200000_permission_roles_stage_a'
);
const outFile = path.join(outDir, 'migration.sql');

const esc = (s) => String(s).replace(/'/g, "''");

const roleInserts = SYSTEM_ROLES.map(
  (r) =>
    `  ('${r.id}', '${r.key}', '${esc(r.name)}', '${esc(r.description || '')}', ${r.isSystem}, ${r.isImmutable}, ${r.sortOrder}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
).join(',\n');

const permRows = [];
for (const role of SYSTEM_ROLES) {
  for (const key of ROLE_PERMISSION_MATRIX[role.key]) {
    permRows.push(`  ('${role.id}', '${key}')`);
  }
}

const sql = `-- =============================================================================
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
${roleInserts};

INSERT INTO "role_permissions" ("role_id", "permission_key")
VALUES
${permRows.join(',\n')};

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
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, sql);
console.log(`Wrote ${outFile}`);
console.log(`roles=${SYSTEM_ROLES.length} role_permissions=${permRows.length}`);
