/**
 * After add_crm_models: set crm_status from is_archived.
 *   non-archived → active
 *   archived     → prospect
 *
 * Queries live counts; does not hard-code a row total.
 *
 * Usage (from backend/):
 *   node prisma/backfill-crm-status-from-archive.mjs
 * Production:
 *   ALLOW_PRODUCTION=1 node prisma/backfill-crm-status-from-archive.mjs
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

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

async function statusSnapshot(label) {
  const [total, archived, activeRows, byStatus] = await Promise.all([
    prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "customers"`,
    prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "customers" WHERE "is_archived" = true`,
    prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "customers" WHERE "is_archived" = false`,
    prisma.$queryRaw`
      SELECT "is_archived" AS archived, "crm_status"::text AS crm_status, COUNT(*)::int AS n
      FROM "customers"
      GROUP BY 1, 2
      ORDER BY 1, 2
    `,
  ]);
  console.log(`${label}`);
  console.log(`  total=${total[0].n}  non_archived=${activeRows[0].n}  archived=${archived[0].n}`);
  for (const row of byStatus) {
    console.log(
      `  archived=${row.archived} crm_status=${row.crm_status} count=${row.n}`
    );
  }
  return { total: total[0].n, archived: archived[0].n, nonArchived: activeRows[0].n };
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

  await statusSnapshot('Before:');

  const setActive = await prisma.$executeRaw`
    UPDATE "customers"
    SET "crm_status" = 'active'::"CrmStatus"
    WHERE "is_archived" = false
  `;
  const setProspect = await prisma.$executeRaw`
    UPDATE "customers"
    SET "crm_status" = 'prospect'::"CrmStatus"
    WHERE "is_archived" = true
  `;

  console.log(`Updated non-archived → active: ${setActive} row(s)`);
  console.log(`Updated archived → prospect: ${setProspect} row(s)`);

  await statusSnapshot('After:');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
