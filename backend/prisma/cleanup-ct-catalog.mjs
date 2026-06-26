/**
 * Remove CT catalog makes/models not used by any CT copier or CT parts.
 * Deletes orphan rows like TEST JHB1 on CT left by old full JHB→CT clones.
 *
 * Dry run:
 *   node prisma/cleanup-ct-catalog.mjs --dry-run
 *
 * Run on server:
 *   npm run db:cleanup-ct-catalog
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { isCtMakeInUse } from './catalog-clone.util.js';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(dryRun ? 'DRY RUN — no CT catalog deletions\n' : 'Cleaning unused CT catalog entries...\n');

  const ctMakes = await prisma.make.findMany({
    where: { branch: 'CT' },
    include: { models: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });

  let removedMakes = 0;
  let removedModels = 0;

  for (const make of ctMakes) {
    const inUse = await isCtMakeInUse(prisma, make.id);
    if (inUse) continue;

    console.log(`  - unused CT make: ${make.name} (${make.models.length} model(s))`);
    if (!dryRun) {
      for (const model of make.models) {
        await prisma.model.delete({ where: { id: model.id } });
        removedModels++;
      }
      await prisma.make.delete({ where: { id: make.id } });
    } else {
      removedModels += make.models.length;
    }
    removedMakes++;
  }

  console.log('\nRemoved:', { makes: removedMakes, models: removedModels });
  const summary = await prisma.make.groupBy({ by: ['branch'], _count: true });
  console.log('Catalog summary:', summary);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
