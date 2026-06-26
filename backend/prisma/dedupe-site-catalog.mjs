/**
 * Remove duplicate makes/models on the same site (same name + branch).
 * Keeps the row with the most machine references; remaps FKs then deletes extras.
 *
 * Dry run:
 *   node prisma/dedupe-site-catalog.mjs --dry-run
 *
 * Run on server:
 *   npm run db:dedupe-catalog
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function machineCountForModel(modelId) {
  return prisma.machine.count({ where: { modelId } });
}

async function mergeModels(keeperMake, dupMake, stats) {
  const keeperModels = await prisma.model.findMany({ where: { makeId: keeperMake.id } });
  const keeperByName = new Map(keeperModels.map((m) => [m.name.trim().toLowerCase(), m]));

  const dupModels = await prisma.model.findMany({ where: { makeId: dupMake.id } });

  for (const dupModel of dupModels) {
    const key = dupModel.name.trim().toLowerCase();
    let target = keeperByName.get(key);

    if (!target) {
      console.log(`    move model ${dupMake.name} / ${dupModel.name} → keeper make`);
      if (!dryRun) {
        target = await prisma.model.update({
          where: { id: dupModel.id },
          data: { makeId: keeperMake.id },
        });
      } else {
        target = { ...dupModel, makeId: keeperMake.id };
      }
      keeperByName.set(key, target);
      stats.modelsMoved++;
      continue;
    }

    const dupMachines = await machineCountForModel(dupModel.id);
    const keepMachines = await machineCountForModel(target.id);
    if (dupMachines > 0) {
      console.log(`    remap ${dupMachines} machine(s) from duplicate model ${dupModel.name}`);
      if (!dryRun) {
        await prisma.machine.updateMany({
          where: { modelId: dupModel.id },
          data: { modelId: target.id },
        });
      }
      stats.machinesRemapped += dupMachines;
    }

    console.log(`    remove duplicate model ${dupModel.name} under ${dupMake.name}`);
    if (!dryRun) {
      await prisma.modelPart.deleteMany({ where: { modelId: dupModel.id } });
      await prisma.model.delete({ where: { id: dupModel.id } });
    }
    stats.modelsDeleted++;
  }
}

async function dedupeBranch(branch) {
  const stats = {
    makesDeleted: 0,
    modelsMoved: 0,
    modelsDeleted: 0,
    machinesRemapped: 0,
  };

  const makes = await prisma.make.findMany({
    where: { branch },
    orderBy: { name: 'asc' },
  });

  const groups = new Map();
  for (const make of makes) {
    const key = make.name.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(make);
  }

  for (const [, rows] of groups) {
    if (rows.length < 2) continue;

    const ranked = await Promise.all(
      rows.map(async (make) => {
        const modelIds = (await prisma.model.findMany({ where: { makeId: make.id }, select: { id: true } })).map(
          (m) => m.id
        );
        const machines =
          modelIds.length === 0
            ? 0
            : await prisma.machine.count({ where: { modelId: { in: modelIds } } });
        return { make, machines };
      })
    );
    ranked.sort((a, b) => b.machines - a.machines || a.make.id.localeCompare(b.make.id));
    const keeper = ranked[0].make;
    const duplicates = ranked.slice(1).map((r) => r.make);

    console.log(`\n[${branch}] duplicate make "${keeper.name}" — keep ${keeper.id}, remove ${duplicates.length} copy/copies`);
    for (const dup of duplicates) {
      await mergeModels(keeper, dup, stats);
      if (!dryRun) {
        await prisma.make.delete({ where: { id: dup.id } });
      }
      stats.makesDeleted++;
    }
  }

  // Same makeId + model name duplicates (shouldn't happen after make dedupe)
  const models = await prisma.model.findMany({
    where: { make: { branch } },
    include: { make: true },
    orderBy: [{ makeId: 'asc' }, { name: 'asc' }],
  });
  const modelGroups = new Map();
  for (const model of models) {
    const key = `${model.makeId}::${model.name.trim().toLowerCase()}`;
    if (!modelGroups.has(key)) modelGroups.set(key, []);
    modelGroups.get(key).push(model);
  }

  for (const [, rows] of modelGroups) {
    if (rows.length < 2) continue;
    const ranked = await Promise.all(
      rows.map(async (model) => ({
        model,
        machines: await machineCountForModel(model.id),
      }))
    );
    ranked.sort((a, b) => b.machines - a.machines || a.model.id.localeCompare(b.model.id));
    const keeper = ranked[0].model;
    for (const { model: dup } of ranked.slice(1)) {
      console.log(`  [${branch}] duplicate model ${dup.make.name} / ${dup.name} — keep ${keeper.id}`);
      const count = await machineCountForModel(dup.id);
      if (count > 0 && !dryRun) {
        await prisma.machine.updateMany({ where: { modelId: dup.id }, data: { modelId: keeper.id } });
      }
      stats.machinesRemapped += count;
      if (!dryRun) {
        await prisma.modelPart.deleteMany({ where: { modelId: dup.id } });
        await prisma.model.delete({ where: { id: dup.id } });
      }
      stats.modelsDeleted++;
    }
  }

  return stats;
}

async function main() {
  console.log(dryRun ? 'DRY RUN — no writes\n' : 'Deduplicating site catalog...\n');
  const jhb = await dedupeBranch('JHB');
  const ct = await dedupeBranch('CT');
  console.log('\nJHB:', jhb);
  console.log('CT:', ct);
  const summary = await prisma.make.groupBy({ by: ['branch'], _count: true });
  console.log('\nCatalog summary:', summary);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
