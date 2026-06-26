/**
 * Repair site catalog when Machine Configuration looks empty but machines still
 * have models assigned (catalog branch tags / CT clones out of sync).
 *
 * 1. Clone full JHB makes/models/parts to CT (same as clone-jhb-catalog-to-ct.js)
 * 2. Remap CT machines to CT model copies where needed
 * 3. Report catalog counts per site
 *
 * Run on server:
 *   cd backend && npm run db:repair-catalog
 *
 * Dry run:
 *   node prisma/repair-site-catalog.js --dry-run
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function cloneJhbToCt() {
  const jhbMakes = await prisma.make.findMany({
    where: { branch: 'JHB' },
    include: { models: { include: { modelParts: true } } },
    orderBy: { name: 'asc' },
  });

  let makesCreated = 0;
  let modelsCreated = 0;
  let partsCreated = 0;
  let machinesRemapped = 0;

  for (const jhbMake of jhbMakes) {
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
        for (const jhbPart of jhbModel.modelParts) {
          const existingPart = await prisma.modelPart.findFirst({
            where: { modelId: ctModel.id, branch: 'CT', partName: jhbPart.partName },
          });
          if (!existingPart) {
            await prisma.modelPart.create({
              data: {
                modelId: ctModel.id,
                branch: 'CT',
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

  return { makesCreated, modelsCreated, partsCreated, machinesRemapped };
}

async function report() {
  const makes = await prisma.make.groupBy({ by: ['branch'], _count: true });
  const parts = await prisma.modelPart.groupBy({ by: ['branch'], _count: true });
  const jhbMachines = await prisma.machine.count({ where: { branch: 'JHB', modelId: { not: null } } });
  const ctMachines = await prisma.machine.count({ where: { branch: 'CT', modelId: { not: null } } });
  console.log('\nCatalog summary:', { makes, parts, jhbMachinesWithModel: jhbMachines, ctMachinesWithModel: ctMachines });
}

async function main() {
  console.log(dryRun ? 'DRY RUN — no writes\n' : 'Repairing site catalog...\n');
  const before = await prisma.make.groupBy({ by: ['branch'], _count: true });
  console.log('Makes before:', before);

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
