/**
 * Stage A seed — idempotent sync of system roles + RolePermission matrix.
 *
 * Migration 20260717200000 already seeds roles/permissions and backfills
 * users.role_id (including craig@pancom.co.za → Owner). This script re-applies
 * the JS matrix so local/dev can refresh without re-running the migration.
 *
 * Usage (from backend/):
 *   node prisma/seed-permissions-stage-a.mjs
 *
 * Does NOT change enforcement. Does NOT modify User.role enum values.
 */
import { PrismaClient } from '@prisma/client';
import { ALL_PERMISSION_KEYS } from '../src/permissions/catalog.js';
import {
  OWNER_EMAIL,
  ROLE_PERMISSION_MATRIX,
  SYSTEM_ROLES,
} from '../src/permissions/rolePermissionMatrix.js';

const prisma = new PrismaClient();

async function upsertSystemRoles() {
  for (const role of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { id: role.id },
      create: {
        id: role.id,
        key: role.key,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isImmutable: role.isImmutable,
        sortOrder: role.sortOrder,
      },
      update: {
        key: role.key,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isImmutable: role.isImmutable,
        sortOrder: role.sortOrder,
      },
    });
  }
}

async function syncRolePermissions() {
  for (const role of SYSTEM_ROLES) {
    const desired = new Set(ROLE_PERMISSION_MATRIX[role.key] || []);
    for (const key of desired) {
      if (!ALL_PERMISSION_KEYS.includes(key)) {
        throw new Error(`Unknown permission key for ${role.key}: ${key}`);
      }
    }

    const existing = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionKey: true },
    });
    const existingKeys = new Set(existing.map((r) => r.permissionKey));

    const toAdd = [...desired].filter((k) => !existingKeys.has(k));
    const toRemove = [...existingKeys].filter((k) => !desired.has(k));

    if (toAdd.length) {
      await prisma.rolePermission.createMany({
        data: toAdd.map((permissionKey) => ({
          roleId: role.id,
          permissionKey,
        })),
        skipDuplicates: true,
      });
    }
    if (toRemove.length) {
      await prisma.rolePermission.deleteMany({
        where: {
          roleId: role.id,
          permissionKey: { in: toRemove },
        },
      });
    }

    console.log(
      `  ${role.key}: ${desired.size} keys (added ${toAdd.length}, removed ${toRemove.length})`
    );
  }
}

async function ensureCraigIsOwner() {
  const owner = SYSTEM_ROLES.find((r) => r.key === 'owner');
  const updated = await prisma.user.updateMany({
    where: { email: { equals: OWNER_EMAIL, mode: 'insensitive' } },
    data: { roleId: owner.id },
  });
  if (updated.count === 0) {
    console.warn(`  WARN: ${OWNER_EMAIL} not found — Owner assignment skipped`);
  } else {
    console.log(`  ${OWNER_EMAIL} → owner (${updated.count} row)`);
  }
}

async function summarize() {
  const roleCounts = await prisma.rolePermission.groupBy({
    by: ['roleId'],
    _count: { _all: true },
  });
  const byId = Object.fromEntries(roleCounts.map((r) => [r.roleId, r._count._all]));
  for (const role of SYSTEM_ROLES) {
    console.log(`  ${role.key}: ${byId[role.id] ?? 0} permissions`);
  }
  const owners = await prisma.user.findMany({
    where: { roleId: SYSTEM_ROLES.find((r) => r.key === 'owner').id },
    select: { email: true, role: true },
  });
  console.log(
    `  Owner role holders: ${owners.map((o) => `${o.email} (enum=${o.role})`).join(', ') || '(none)'}`
  );
}

async function main() {
  console.log('Stage A permission seed (additive / idempotent)...');
  console.log('Upserting system roles...');
  await upsertSystemRoles();
  console.log('Syncing RolePermission matrix...');
  await syncRolePermissions();
  console.log('Ensuring Craig → Owner...');
  await ensureCraigIsOwner();
  console.log('Summary:');
  await summarize();
  console.log('Done. Enforcement unchanged.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
