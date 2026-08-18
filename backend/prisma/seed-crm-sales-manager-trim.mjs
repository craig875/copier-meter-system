/**
 * Follow-up to Stage 2: Sales Manager is CRM + dashboard + branch-switch only.
 *
 * seed-crm-permissions-stage-2.mjs is additive-only and will not drop keys.
 * This script reconciles sales_manager RolePermission rows to the matrix:
 *   - deletes extras (Fibre Orders + Installations inbox, and any other stray keys)
 *   - adds any missing matrix keys
 *
 * Does NOT touch other roles.
 *
 * Usage (from backend/):
 *   node prisma/seed-crm-sales-manager-trim.mjs
 * Production (explicit opt-in):
 *   ALLOW_PRODUCTION=1 node prisma/seed-crm-sales-manager-trim.mjs
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ALL_PERMISSION_KEYS } from '../src/permissions/catalog.js';
import {
  ROLE_PERMISSION_MATRIX,
  SYSTEM_ROLE_IDS,
} from '../src/permissions/rolePermissionMatrix.js';

const prisma = new PrismaClient();

function databaseLooksLocal(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('[::1]') ||
    url.includes('@::1')
  );
}

async function main() {
  const url = process.env.DATABASE_URL;
  const local = databaseLooksLocal(url);
  if (!local && process.env.ALLOW_PRODUCTION !== '1') {
    console.error(
      'Refusing to run: DATABASE_URL is not local. Set ALLOW_PRODUCTION=1 to run on production.'
    );
    process.exit(1);
  }
  if (!local) {
    console.log('ALLOW_PRODUCTION=1: proceeding against non-local DATABASE_URL');
  }

  const roleId = SYSTEM_ROLE_IDS.sales_manager;
  const desired = [...new Set(ROLE_PERMISSION_MATRIX.sales_manager || [])].sort();

  for (const key of desired) {
    if (!ALL_PERMISSION_KEYS.includes(key)) {
      throw new Error(`Unknown permission key on sales_manager matrix: ${key}`);
    }
  }

  const existing = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permissionKey: true },
  });
  const existingKeys = existing.map((r) => r.permissionKey).sort();
  const existingSet = new Set(existingKeys);
  const desiredSet = new Set(desired);

  const toRemove = existingKeys.filter((k) => !desiredSet.has(k));
  const toAdd = desired.filter((k) => !existingSet.has(k));

  if (toRemove.length) {
    const deleted = await prisma.rolePermission.deleteMany({
      where: { roleId, permissionKey: { in: toRemove } },
    });
    console.log(`Removed ${deleted.count} key(s) from sales_manager:`);
    for (const k of toRemove) console.log(`  - ${k}`);
  } else {
    console.log('No extra keys to remove from sales_manager.');
  }

  if (toAdd.length) {
    await prisma.rolePermission.createMany({
      data: toAdd.map((permissionKey) => ({ roleId, permissionKey })),
      skipDuplicates: true,
    });
    console.log(`Added ${toAdd.length} missing key(s) to sales_manager:`);
    for (const k of toAdd) console.log(`  + ${k}`);
  } else {
    console.log('No missing matrix keys to add.');
  }

  const finalRows = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permissionKey: true },
    orderBy: { permissionKey: 'asc' },
  });
  const finalKeys = finalRows.map((r) => r.permissionKey);
  const crmKeys = finalKeys.filter((k) => k.startsWith('crm.'));
  const otherKeys = finalKeys.filter((k) => !k.startsWith('crm.'));

  console.log('---');
  console.log(`sales_manager final count: ${finalKeys.length}`);
  console.log(`crm.*: ${crmKeys.length}`);
  console.log('non-crm:');
  for (const k of otherKeys) console.log(`  ${k}`);
  console.log('all keys:');
  for (const k of finalKeys) console.log(`  ${k}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
