/**
 * Remove CT catalog makes/models not assigned to any CT copier.
 * Orphan parts from old JHB→CT clones are deleted with the unused models.
 *
 * Dry run:
 *   node prisma/cleanup-ct-catalog.mjs --dry-run
 *
 * Run on server:
 *   npm run db:cleanup-ct-catalog
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { isCtMakeUsedByCopiers } from './catalog-clone.util.js';

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
    const modelIds = make.models.map((m) => m.id);
    const machines =
      modelIds.length === 0
        ? 0
        : await prisma.machine.count({ where: { branch: 'CT', modelId: { in: modelIds } } });

    if (machines > 0) {
      console.log(`  keep ${make.name} (${machines} CT copier(s) assigned)`);
      kept++;
      continue;
    }

    const parts =
      modelIds.length === 0
        ? 0
        : await prisma.modelPart.count({ where: { branch: 'CT', modelId: { in: modelIds } } });

    console.log(
      `  - remove unused CT make: ${make.name} (${make.models.length} model(s), ${parts} orphan part(s), 0 copiers)`
    );
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
