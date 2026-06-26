import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const makes = await prisma.make.findMany({
    orderBy: [{ branch: 'asc' }, { name: 'asc' }],
    include: { models: { orderBy: { name: 'asc' } } },
  });

  const makeGroups = new Map();
  for (const m of makes) {
    const key = `${m.branch}::${m.name}`;
    if (!makeGroups.has(key)) makeGroups.set(key, []);
    makeGroups.get(key).push(m);
  }

  const dupMakes = [...makeGroups.entries()].filter(([, rows]) => rows.length > 1);
  console.log('Duplicate makes (same name + branch):', dupMakes.length);
  for (const [key, rows] of dupMakes) {
    console.log(`  ${key}: ${rows.map((r) => r.id).join(', ')}`);
  }

  const modelGroups = new Map();
  for (const m of makes) {
    for (const mod of m.models) {
      const key = `${m.branch}::${m.name}::${mod.name}`;
      if (!modelGroups.has(key)) modelGroups.set(key, []);
      modelGroups.get(key).push({ makeId: m.id, modelId: mod.id, makeName: m.name, branch: m.branch });
    }
  }

  const dupModels = [...modelGroups.entries()].filter(([, rows]) => rows.length > 1);
  console.log('Duplicate models (same make name + model name + branch):', dupModels.length);
  for (const [key, rows] of dupModels.slice(0, 20)) {
    console.log(`  ${key}:`, rows);
  }

  console.log('\nCatalog counts by branch:');
  const counts = await prisma.make.groupBy({ by: ['branch'], _count: true });
  console.log(counts);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
