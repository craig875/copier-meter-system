/**
 * Sync CT catalog copies only where CT operational data needs them.
 * Does NOT copy new JHB-only makes (e.g. test makes) to CT.
 *
 * Run on server when CT machines exist but CT catalog is missing entries:
 *   cd backend && npm run db:repair-catalog
 *
 * One-time full JHB→CT baseline (clones ALL makes — do not use after go-live):
 *   node prisma/repair-site-catalog.js --full
 *
 * Dry run:
 *   node prisma/repair-site-catalog.js --dry-run
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { loadJhbMakesWithCatalog, shouldEnsureCtMake } from './catalog-clone.util.js';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const fullBaseline = process.argv.includes('--full');

async function cloneJhbToCt() {
  const jhbMakes = await loadJhbMakesWithCatalog(prisma);

  let makesCreated = 0;
  let modelsCreated = 0;
  let partsCreated = 0;
  let machinesRemapped = 0;
  let skipped = 0;

  for (const jhbMake of jhbMakes) {
    const ensure = await shouldEnsureCtMake(prisma, jhbMake, { fullBaseline });
    if (!ensure) {
      skipped++;
      continue;
    }

    let ctMake = await prisma.make.findUnique({
      where: { name_branch: { name: jhbMake.name, branch: 'CT' } },
    });

    if (!ctMake) {
      console.log(`  + CT make: ${jhbMake.name}`);
      if (!dryRun) {
        ctMake = await prisma.make.create({ data: { name: jhbMake.name, branch: 'CT' } });
      } else {
        ctMake = { id: `dry-${jhbMake.id}`, name: jhbMake.name, branch: 'CT' };
      }
      makesCreated++;
    }

    for (const jhbModel of jhbMake.models) {
      let ctModel = dryRun
        ? null
        : await prisma.model.findFirst({ where: { makeId: ctMake.id, name: jhbModel.name } });

      if (!ctModel) {
        console.log(`    + CT model: ${jhbMake.name} / ${jhbModel.name}`);
        if (!dryRun) {
          ctModel = await prisma.model.create({
            data: {
              makeId: ctMake.id,
              name: jhbModel.name,
              paperSize: jhbModel.paperSize,
              modelType: jhbModel.modelType,
              machineLife: jhbModel.machineLife,
            },
          });
        } else {
          ctModel = { id: `dry-${jhbModel.id}`, name: jhbModel.name };
        }
        modelsCreated++;
      }

      if (!dryRun && ctModel) {
        for (const jhbPart of jhbModel.modelParts.filter((p) => p.branch === 'JHB' || p.branch === 'CT')) {
          const branch = 'CT';
          const existingPart = await prisma.modelPart.findFirst({
            where: { modelId: ctModel.id, branch, partName: jhbPart.partName },
          });
          if (!existingPart) {
            await prisma.modelPart.create({
              data: {
                modelId: ctModel.id,
                branch,
                partName: jhbPart.partName,
                itemCode: jhbPart.itemCode,
                partType: jhbPart.partType,
                tonerColor: jhbPart.tonerColor,
                expectedYield: jhbPart.expectedYield,
                costRand: jhbPart.costRand,
                meterType: jhbPart.meterType,
              },
            });
            partsCreated++;
          }
        }

        const remapped = await prisma.machine.updateMany({
          where: { branch: 'CT', modelId: jhbModel.id },
          data: { modelId: ctModel.id },
        });
        machinesRemapped += remapped.count;
      }
    }
  }

  return { makesCreated, modelsCreated, partsCreated, machinesRemapped, skipped };
}

async function report() {
  const makes = await prisma.make.groupBy({ by: ['branch'], _count: true });
  console.log('\nCatalog summary:', { makes });
}

async function main() {
  console.log(
    dryRun ? 'DRY RUN — no writes\n' : `Repairing CT catalog (${fullBaseline ? 'FULL baseline' : 'selective'})...\n`
  );
  if (fullBaseline) {
    console.warn('WARNING: --full clones every JHB make to CT. Use only for initial baseline.\n');
  }

  const stats = await cloneJhbToCt();
  console.log('\nChanges:', stats);
  await report();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
