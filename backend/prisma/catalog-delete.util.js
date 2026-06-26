/**
 * Delete a model and its catalog parts, including part replacement rows that block FK cascade.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} modelId
 */
export async function deleteModelCatalog(prisma, modelId) {
  const parts = await prisma.modelPart.findMany({
    where: { modelId },
    select: { id: true },
  });
  const partIds = parts.map((p) => p.id);
  if (partIds.length > 0) {
    await prisma.partReplacement.deleteMany({ where: { modelPartId: { in: partIds } } });
    await prisma.modelPart.deleteMany({ where: { id: { in: partIds } } });
  }
  await prisma.model.delete({ where: { id: modelId } });
}

/**
 * Delete a make and all models/parts under it (no CT/JHB copiers should reference these models).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ id: string, models: Array<{ id: string }> }} make
 */
export async function deleteMakeCatalog(prisma, make) {
  for (const model of make.models) {
    await deleteModelCatalog(prisma, model.id);
  }
  await prisma.make.delete({ where: { id: make.id } });
}
