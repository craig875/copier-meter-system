/**
 * Idempotent backfill: append 'installations' to User.modules for admin/manager
 * users who do not already have it. Safe to re-run against any database
 * (local or production) pointed at by DATABASE_URL — never duplicates the module.
 *
 * Prisma schema: modules String[].
 *
 * Usage (from backend/):
 *   node scripts/installations-module-backfill.mjs           # dry-run (default)
 *   node scripts/installations-module-backfill.mjs --apply
 */
import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');
const MODULE = 'installations';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['admin', 'manager'] } },
    select: { id: true, email: true, name: true, role: true, modules: true },
    orderBy: { email: 'asc' },
  });

  const already = [];
  const needs = [];
  for (const u of users) {
    const mods = Array.isArray(u.modules) ? u.modules : [];
    if (mods.includes(MODULE)) already.push(u);
    else needs.push(u);
  }

  console.log(`admin/manager users: ${users.length}`);
  console.log(`already have '${MODULE}': ${already.length}`);
  for (const u of already) {
    console.log(`  OK  ${u.email} (${u.role}) modules=${JSON.stringify(u.modules)}`);
  }
  console.log(`NEED '${MODULE}': ${needs.length}`);
  for (const u of needs) {
    console.log(`  ADD ${u.email} (${u.role}) modules=${JSON.stringify(u.modules)}`);
  }

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to update.');
    return;
  }

  console.log('\nApplying…');
  let updated = 0;
  for (const u of needs) {
    // Re-read so a concurrent/re-run path cannot double-append
    const fresh = await prisma.user.findUnique({
      where: { id: u.id },
      select: { modules: true },
    });
    const mods = Array.isArray(fresh?.modules) ? fresh.modules : [];
    if (mods.includes(MODULE)) {
      console.log(`  skip ${u.email} (already has '${MODULE}')`);
      continue;
    }
    const next = [...mods, MODULE];
    await prisma.user.update({
      where: { id: u.id },
      data: { modules: next },
    });
    updated += 1;
    console.log(`  updated ${u.email} → ${JSON.stringify(next)}`);
  }
  console.log(`Done. Updated ${updated} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
