/**
 * Remove CT catalog makes/models not assigned to any CT copier.
 * Counts copiers on both CT model rows AND JHB model rows (pre-remap assignments).
 *
 * Dry run:
 *   node prisma/cleanup-ct-catalog.mjs --dry-run
 *
 * Run on server:
 *   npm run db:cleanup-ct-catalog
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { countCtCopiersOnMakeFamily } from './catalog-clone.util.js';
import { deleteMakeCatalog } from './catalog-delete.util.js';

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
  let kept = 0;

  for (const make of ctMakes) {
    const jhbTwin = await prisma.make.findUnique({
      where: { name_branch: { name: make.name, branch: 'JHB' } },
      select: { id: true },
    });

    const machines = await countCtCopiersOnMakeFamily(prisma, {
      jhbMakeId: jhbTwin?.id,
      ctMakeId: make.id,
    });

    if (machines > 0) {
      console.log(`  keep ${make.name} (${machines} CT copier(s) assigned)`);
      kept++;
      continue;
    }

    const parts =
      make.models.length === 0
        ? 0
        : await prisma.modelPart.count({
            where: { branch: 'CT', modelId: { in: make.models.map((m) => m.id) } },
          });

    console.log(
      `  - remove unused CT make: ${make.name} (${make.models.length} model(s), ${parts} orphan part(s), 0 copiers)`
    );
    if (!dryRun) {
      await deleteMakeCatalog(prisma, make);
      removedModels += make.models.length;
      removedMakes++;
    } else {
      removedModels += make.models.length;
      removedMakes++;
    }
  }

  console.log('\nRemoved:', { makes: removedMakes, models: removedModels, kept });
  const summary = await prisma.make.groupBy({ by: ['branch'], _count: true });
  console.log('Catalog summary:', summary);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
