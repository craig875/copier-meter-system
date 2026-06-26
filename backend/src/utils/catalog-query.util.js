import prisma from '../config/database.js';

/**
 * When site-tagged catalog is empty, show makes/models still linked to copiers on this site.
 * Does not affect creates — new makes only appear on the site they were added to.
 */
export async function findMakesLinkedToSiteMachines(site) {
  const siteMachines = await prisma.machine.findMany({
    where: { branch: site, modelId: { not: null } },
    select: { modelId: true },
  });
  const modelIds = [...new Set(siteMachines.map((m) => m.modelId).filter(Boolean))];
  if (modelIds.length === 0) return [];

  return prisma.make.findMany({
    where: { models: { some: { id: { in: modelIds } } } },
    orderBy: { name: 'asc' },
    include: {
      models: {
        where: { id: { in: modelIds } },
        orderBy: { name: 'asc' },
      },
    },
  });
}
