import { isCtMakeUsedByCopiers } from './catalog-clone.util.js';
import { deleteMakeCatalog } from './catalog-delete.util.js';

/**
 * Remove an unused CT catalog copy that mirrors a JHB make name (leftover from old clones).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} name
 */
export async function pruneUnusedCtMirror(prisma, name) {
  const mirror = await prisma.make.findUnique({
    where: { name_branch: { name, branch: 'CT' } },
    include: { models: { select: { id: true, name: true } } },
  });
  if (!mirror) return { removed: false };
  if (await isCtMakeUsedByCopiers(prisma, mirror.id)) {
    return { removed: false, reason: 'ct_copiers_assigned' };
  }
  await deleteMakeCatalog(prisma, mirror);
  return { removed: true, name };
}

/**
 * Remove all CT catalog rows that duplicate a JHB make name but have no CT copiers assigned.
 * JHB-only entries (e.g. test makes) must not appear on Cape Town.
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function pruneAllStaleCtMirrors(prisma) {
  const removed = [];
  const ctMakes = await prisma.make.findMany({
    where: { branch: 'CT' },
    include: { models: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });

  for (const ctMake of ctMakes) {
    const jhbTwin = await prisma.make.findUnique({
      where: { name_branch: { name: ctMake.name, branch: 'JHB' } },
    });
    if (!jhbTwin) continue;
    if (await isCtMakeUsedByCopiers(prisma, ctMake.id)) continue;
    await deleteMakeCatalog(prisma, ctMake);
    removed.push(ctMake.name);
  }

  return removed;
}
