/**
 * Restore / rebuild the CT (Cape Town) machine configuration catalog from JHB.
 *
 * WARNING: Clones ALL JHB makes to CT. For ongoing use prefer:
 *   npm run db:repair-catalog   (selective — only CT machines/parts in use)
 *
 * One-time baseline only:
 *   node prisma/clone-jhb-catalog-to-ct.js
 *   node prisma/clone-jhb-catalog-to-ct.js --full
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { loadJhbMakesWithCatalog, shouldEnsureCtMake } from './catalog-clone.util.js';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const fullBaseline = !process.argv.includes('--selective');

async function main() {
  console.log(dryRun ? 'DRY RUN — no writes\n' : 'Cloning JHB catalog to CT...\n');
  if (fullBaseline) {
    console.warn('WARNING: cloning ALL JHB makes to CT. Pass --selective for in-use catalog only.\n');
  }

  const jhbMakes = await loadJhbMakesWithCatalog(prisma);

  const ctBefore = await prisma.make.count({ where: { branch: 'CT' } });
  console.log(`JHB makes: ${jhbMakes.length}, CT makes before: ${ctBefore}`);

  let makesCreated = 0;
  let modelsCreated = 0;
  let partsCreated = 0;
  let machinesRemapped = 0;

  for (const jhbMake of jhbMakes) {
    const ensure = await shouldEnsureCtMake(prisma, jhbMake, { fullBaseline });
    if (!ensure) continue;

    let ctMake = await prisma.make.findUnique({
      where: { name_branch: { name: jhbMake.name, branch: 'CT' } },
    });

    if (!ctMake) {
      console.log(`  + make CT: ${jhbMake.name}`);
      if (!dryRun) {
        ctMake = await prisma.make.create({
          data: { name: jhbMake.name, branch: 'CT' },
        });
      } else {
        ctMake = { id: `dry-ct-make-${jhbMake.id}`, name: jhbMake.name, branch: 'CT' };
      }
      makesCreated++;
    }

    for (const jhbModel of jhbMake.models) {
      let ctModel = dryRun
        ? null
        : await prisma.model.findFirst({
            where: { makeId: ctMake.id, name: jhbModel.name },
          });

      if (!ctModel) {
        console.log(`    + model CT: ${jhbMake.name} / ${jhbModel.name}`);
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
          ctModel = { id: `dry-ct-model-${jhbModel.id}`, name: jhbModel.name };
        }
        modelsCreated++;
      }

      // CT parts: prefer existing CT-branch parts on JHB model (pre-migration layout), else copy JHB parts
      const ctPartsOnJhbModel = jhbModel.modelParts.filter((p) => p.branch === 'CT');
      const jhbPartsOnJhbModel = jhbModel.modelParts.filter((p) => p.branch === 'JHB');
      const sourceParts = ctPartsOnJhbModel.length > 0 ? ctPartsOnJhbModel : jhbPartsOnJhbModel;

      for (const part of sourceParts) {
        if (dryRun) {
          partsCreated++;
          continue;
        }
        const existing = await prisma.modelPart.findFirst({
          where: {
            modelId: ctModel.id,
            partName: part.partName,
            branch: 'CT',
          },
        });
        if (existing) continue;

        await prisma.modelPart.create({
          data: {
            modelId: ctModel.id,
            partName: part.partName,
            itemCode: part.itemCode,
            partType: part.partType,
            tonerColor: part.tonerColor,
            expectedYield: part.expectedYield,
            costRand: part.costRand,
            meterType: part.meterType,
            branch: 'CT',
            isActive: part.isActive,
          },
        });
        partsCreated++;
      }

      // Remap CT machines still pointing at JHB model
      if (!dryRun && ctModel?.id) {
        const result = await prisma.machine.updateMany({
          where: { branch: 'CT', modelId: jhbModel.id },
          data: { modelId: ctModel.id },
        });
        machinesRemapped += result.count;
      } else if (dryRun) {
        const count = await prisma.machine.count({
          where: { branch: 'CT', modelId: jhbModel.id },
        });
        machinesRemapped += count;
      }
    }
  }

  const ctAfter = dryRun ? ctBefore : await prisma.make.count({ where: { branch: 'CT' } });

  console.log('\nSummary:');
  console.log(`  CT makes created:  ${makesCreated}`);
  console.log(`  CT models created: ${modelsCreated}`);
  console.log(`  CT parts created:  ${partsCreated}`);
  console.log(`  CT machines remapped to CT models: ${machinesRemapped}`);
  if (!dryRun) console.log(`  CT makes after: ${ctAfter}`);
  if (dryRun) console.log('\nRe-run without --dry-run to apply.');
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
