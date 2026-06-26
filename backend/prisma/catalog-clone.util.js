/**
 * CT copier ↔ catalog helpers (shared by repair, cleanup, and prune).
 */

/**
 * Count CT copiers assigned to any model under the JHB and/or CT make rows for one make name.
 * CT copiers often still reference JHB model IDs until repair remaps them.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ jhbMakeId?: string|null, ctMakeId?: string|null }} ids
 */
export async function countCtCopiersOnMakeFamily(prisma, { jhbMakeId, ctMakeId }) {
  const modelIds = [];

  if (jhbMakeId) {
    const jhbModels = await prisma.model.findMany({
      where: { makeId: jhbMakeId },
      select: { id: true },
    });
    modelIds.push(...jhbModels.map((m) => m.id));
  }

  if (ctMakeId) {
    const ctModels = await prisma.model.findMany({
      where: { makeId: ctMakeId },
      select: { id: true },
    });
    modelIds.push(...ctModels.map((m) => m.id));
  }

  const uniqueIds = [...new Set(modelIds)];
  if (uniqueIds.length === 0) return 0;

  return prisma.machine.count({
    where: { branch: 'CT', modelId: { in: uniqueIds } },
  });
}

/**
 * Whether CT operational data still needs this make name (any CT copier on JHB or CT models).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} makeName
 */
export async function isMakeNameUsedByCtCopiers(prisma, makeName) {
  const [jhbMake, ctMake] = await Promise.all([
    prisma.make.findUnique({ where: { name_branch: { name: makeName, branch: 'JHB' } }, select: { id: true } }),
    prisma.make.findUnique({ where: { name_branch: { name: makeName, branch: 'CT' } }, select: { id: true } }),
  ]);
  if (!jhbMake && !ctMake) return false;
  const count = await countCtCopiersOnMakeFamily(prisma, {
    jhbMakeId: jhbMake?.id,
    ctMakeId: ctMake?.id,
  });
  return count > 0;
}

/**
 * Whether any CT copier is assigned to a model under this CT make row only.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} ctMakeId
 */
export async function isCtMakeUsedByCopiers(prisma, ctMakeId) {
  return (await countCtCopiersOnMakeFamily(prisma, { ctMakeId })) > 0;
}

/** @deprecated Use isCtMakeUsedByCopiers */
export async function isCtMakeInUse(prisma, ctMakeId) {
  return isCtMakeUsedByCopiers(prisma, ctMakeId);
}

/**
 * Whether a JHB make should get/sync a CT catalog copy.
 */
export async function shouldEnsureCtMake(prisma, jhbMake, { fullBaseline = false }) {
  if (fullBaseline) return true;

  const ctCopiers = await countCtCopiersOnMakeFamily(prisma, { jhbMakeId: jhbMake.id });
  if (ctCopiers > 0) return true;

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
