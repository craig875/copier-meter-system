import { countCtCopiersOnMakeFamily, isMakeNameUsedByCtCopiers } from './catalog-clone.util.js';
import { deleteMakeCatalog } from './catalog-delete.util.js';

/**
 * Remove an unused CT catalog copy (JHB-only test makes with no CT copiers anywhere).
 * Never removes CT catalog still needed by CT copiers (including via JHB model IDs).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} name
 */
export async function pruneUnusedCtMirror(prisma, name) {
  if (await isMakeNameUsedByCtCopiers(prisma, name)) {
    return { removed: false, reason: 'ct_copiers_assigned' };
  }

  const mirror = await prisma.make.findUnique({
    where: { name_branch: { name, branch: 'CT' } },
    include: { models: { select: { id: true, name: true } } },
  });
  if (!mirror) return { removed: false };

  await deleteMakeCatalog(prisma, mirror);
  return { removed: true, name };
}

/**
 * Remove CT catalog duplicates only when no CT copier uses that make name (JHB or CT models).
 * Safe to run manually — NOT called automatically on page load.
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
      select: { id: true },
    });
    if (!jhbTwin) continue;

    const ctCopiers = await countCtCopiersOnMakeFamily(prisma, {
      jhbMakeId: jhbTwin.id,
      ctMakeId: ctMake.id,
    });
    if (ctCopiers > 0) continue;

    await deleteMakeCatalog(prisma, ctMake);
    removed.push(ctMake.name);
  }

  return removed;
}
