/**
 * Whether any CT copier is assigned to a model under this CT make.
 * Catalog parts alone do not count — orphan cloned parts should not block cleanup.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} ctMakeId
 */
export async function isCtMakeUsedByCopiers(prisma, ctMakeId) {
  const models = await prisma.model.findMany({
    where: { makeId: ctMakeId },
    select: { id: true },
  });
  const modelIds = models.map((m) => m.id);
  if (modelIds.length === 0) return false;

  const machines = await prisma.machine.count({
    where: { branch: 'CT', modelId: { in: modelIds } },
  });
  return machines > 0;
}

/** @deprecated Use isCtMakeUsedByCopiers — parts-only usage is not operational. */
export async function isCtMakeInUse(prisma, ctMakeId) {
  return isCtMakeUsedByCopiers(prisma, ctMakeId);
}

/**
 * Whether a JHB make should get/sync a CT catalog copy.
 * Only when CT copiers use its models (JHB or CT model rows) — not catalog parts alone.
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
  if (ctMake && (await isCtMakeUsedByCopiers(prisma, ctMake.id))) return true;

  return false;
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
