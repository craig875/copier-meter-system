import { isCtMakeUsedByCopiers } from './catalog-clone.util.js';
import { deleteMakeCatalog } from './catalog-delete.util.js';

/**
 * Remove an unused CT catalog copy that mirrors a JHB make name (leftover from old clones).
 * Only runs when the authoritative write is on JHB — never deletes JHB rows.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} name
 * @returns {Promise<{ removed: boolean, reason?: string }>}
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
  return { removed: true };
}
