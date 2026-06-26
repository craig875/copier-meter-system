import { PrismaClient } from '@prisma/client';

/**
 * Whether a JHB make should have a CT catalog copy.
 * Selective mode: only when CT machines/parts use its models, or CT row already exists.
 * Full mode (--full): clone entire JHB baseline to CT (one-time setup only).
 */
export async function shouldEnsureCtMake(prisma, jhbMake, { fullBaseline = false }) {
  if (fullBaseline) return true;

  const existingCt = await prisma.make.findUnique({
    where: { name_branch: { name: jhbMake.name, branch: 'CT' } },
  });
  if (existingCt) return true;

  const ctMachinesOnMake = await prisma.machine.count({
    where: { branch: 'CT', model: { makeId: jhbMake.id } },
  });
  if (ctMachinesOnMake > 0) return true;

  const ctPartsOnMakeModels = await prisma.modelPart.count({
    where: { branch: 'CT', model: { makeId: jhbMake.id } },
  });
  return ctPartsOnMakeModels > 0;
}

export async function loadJhbMakesWithCatalog(prisma) {
  return prisma.make.findMany({
    where: { branch: 'JHB' },
    include: {
      models: {
        include: { modelParts: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}
