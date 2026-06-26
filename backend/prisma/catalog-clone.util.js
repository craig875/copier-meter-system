/**
 * Whether a CT make row is referenced by CT operational data.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} ctMakeId
 */
export async function isCtMakeInUse(prisma, ctMakeId) {
  const models = await prisma.model.findMany({
    where: { makeId: ctMakeId },
    select: { id: true },
  });
  const modelIds = models.map((m) => m.id);
  if (modelIds.length === 0) return false;

  const [machines, parts] = await Promise.all([
    prisma.machine.count({ where: { branch: 'CT', modelId: { in: modelIds } } }),
    prisma.modelPart.count({ where: { branch: 'CT', modelId: { in: modelIds } } }),
  ]);
  return machines > 0 || parts > 0;
}

/**
 * Whether a JHB make should get/sync a CT catalog copy.
 * Selective: only when CT machines or CT parts need it.
 * Full (--full): clone entire JHB baseline (one-time only).
 */
export async function shouldEnsureCtMake(prisma, jhbMake, { fullBaseline = false }) {
  if (fullBaseline) return true;

  const ctMachinesOnJhbModels = await prisma.machine.count({
    where: { branch: 'CT', model: { makeId: jhbMake.id } },
  });
  if (ctMachinesOnJhbModels > 0) return true;

  const ctMake = await prisma.make.findUnique({
    where: { name_branch: { name: jhbMake.name, branch: 'CT' } },
    select: { id: true },
  });
  if (ctMake && (await isCtMakeInUse(prisma, ctMake.id))) return true;

  const ctPartsOnJhbModels = await prisma.modelPart.count({
    where: { branch: 'CT', model: { makeId: jhbMake.id } },
  });
  return ctPartsOnJhbModels > 0;
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
