import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';
import { resolveAppSite, assertMakeInSite } from '../utils/app-site.util.js';

export const getMakes = asyncHandler(async (req, res) => {
  const site = resolveAppSite(req);
  const includeModels = { models: { orderBy: { name: 'asc' } } };

  let makes = await prisma.make.findMany({
    where: { branch: site },
    orderBy: { name: 'asc' },
    include: includeModels,
  });

  // Recovery: site catalog empty but machines on this site still reference models
  if (makes.length === 0) {
    const siteMachines = await prisma.machine.findMany({
      where: { branch: site, modelId: { not: null } },
      select: { modelId: true },
    });
    const modelIds = [...new Set(siteMachines.map((m) => m.modelId).filter(Boolean))];
    if (modelIds.length > 0) {
      makes = await prisma.make.findMany({
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
  }

  res.json({
    makes: makes.map((m) => ({ ...m, branch: m.branch ?? site })),
    site,
  });
});

export const getModels = asyncHandler(async (req, res) => {
  const site = resolveAppSite(req);
  const { makeId } = req.query;
  const where = {
    make: { branch: site },
    ...(makeId ? { makeId } : {}),
  };
  const models = await prisma.model.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { make: true },
  });
  res.json({ models, site });
});

export const createMake = asyncHandler(async (req, res) => {
  const site = resolveAppSite(req);
  const name = req.body.name.trim();
  const existing = await prisma.make.findUnique({
    where: { name_branch: { name, branch: site } },
  });
  if (existing) throw new ConflictError('Make already exists for this site');
  const make = await prisma.make.create({ data: { name, branch: site } });
  res.status(201).json({ make });
});

export const updateMake = asyncHandler(async (req, res) => {
  const site = resolveAppSite(req);
  const make = await prisma.make.findUnique({ where: { id: req.params.id } });
  if (!make) throw new NotFoundError('Make');
  assertMakeInSite(make, site);
  const name = req.body.name?.trim();
  if (!name) throw new ValidationError('Name is required');
  const existing = await prisma.make.findFirst({
    where: { name, branch: site, id: { not: req.params.id } },
  });
  if (existing) throw new ConflictError('Make name already exists for this site');
  const updated = await prisma.make.update({
    where: { id: req.params.id },
    data: { name },
  });
  res.json({ make: updated });
});

export const deleteMake = asyncHandler(async (req, res) => {
  const site = resolveAppSite(req);
  const make = await prisma.make.findUnique({
    where: { id: req.params.id },
    include: {
      models: {
        include: {
          modelParts: {
            where: { branch: site },
            include: { _count: { select: { replacements: true } } },
          },
        },
      },
    },
  });
  if (!make) throw new NotFoundError('Make');
  assertMakeInSite(make, site);
  const hasReplacements = make.models?.some((m) =>
    m.modelParts?.some((p) => (p._count?.replacements ?? 0) > 0)
  );
  if (hasReplacements) throw new ConflictError('Cannot delete make: some parts have replacement history');
  await prisma.$transaction(async (tx) => {
    for (const model of make.models || []) {
      await tx.modelPart.deleteMany({ where: { modelId: model.id, branch: site } });
      await tx.model.delete({ where: { id: model.id } });
    }
    await tx.make.delete({ where: { id: req.params.id } });
  });
  res.json({ message: 'Make deleted' });
});

export const createModel = asyncHandler(async (req, res) => {
  const site = resolveAppSite(req);
  const make = await prisma.make.findUnique({ where: { id: req.body.makeId } });
  if (!make) throw new NotFoundError('Make');
  assertMakeInSite(make, site);
  const existing = await prisma.model.findFirst({
    where: { makeId: req.body.makeId, name: req.body.name.trim() },
  });
  if (existing) throw new ConflictError('Model already exists for this make');
  const model = await prisma.model.create({
    data: {
      makeId: req.body.makeId,
      name: req.body.name.trim(),
      paperSize: req.body.paperSize || 'A4',
      modelType: req.body.modelType || 'mono',
      machineLife: (req.body.machineLife !== '' && req.body.machineLife != null) ? Number(req.body.machineLife) : null,
    },
    include: { make: true },
  });
  res.status(201).json({ model });
});

export const updateModel = asyncHandler(async (req, res) => {
  const site = resolveAppSite(req);
  const model = await prisma.model.findUnique({
    where: { id: req.params.id },
    include: { make: true },
  });
  if (!model) throw new NotFoundError('Model');
  assertMakeInSite(model.make, site);
  const targetMakeId = req.body.makeId || model.makeId;
  if (req.body.makeId && req.body.makeId !== model.makeId) {
    const newMake = await prisma.make.findUnique({ where: { id: req.body.makeId } });
    if (!newMake) throw new NotFoundError('Make');
    assertMakeInSite(newMake, site);
  }
  const existing = await prisma.model.findFirst({
    where: {
      makeId: targetMakeId,
      name: req.body.name?.trim() || model.name,
      id: { not: req.params.id },
    },
  });
  if (existing) throw new ConflictError('Model name already exists for this make');
  const updateData = {
    ...(req.body.makeId && { makeId: req.body.makeId }),
    ...(req.body.name && { name: req.body.name.trim() }),
    ...(req.body.paperSize && { paperSize: req.body.paperSize }),
    ...(req.body.modelType && { modelType: req.body.modelType }),
    ...(req.body.machineLife !== undefined && { machineLife: (req.body.machineLife !== '' && req.body.machineLife != null) ? Number(req.body.machineLife) : null }),
  };
  const updated = await prisma.model.update({
    where: { id: req.params.id },
    data: updateData,
    include: { make: true },
  });
  res.json({ model: updated });
});

export const deleteModel = asyncHandler(async (req, res) => {
  const site = resolveAppSite(req);
  const model = await prisma.model.findUnique({
    where: { id: req.params.id },
    include: {
      make: true,
      modelParts: {
        where: { branch: site },
        include: { _count: { select: { replacements: true } } },
      },
    },
  });
  if (!model) throw new NotFoundError('Model');
  assertMakeInSite(model.make, site);
  const hasReplacements = model.modelParts?.some((p) => (p._count?.replacements ?? 0) > 0);
  if (hasReplacements) throw new ConflictError('Cannot delete model: some parts have replacement history');
  await prisma.$transaction(async (tx) => {
    await tx.modelPart.deleteMany({ where: { modelId: req.params.id, branch: site } });
    await tx.model.delete({ where: { id: req.params.id } });
  });
  res.json({ message: 'Model deleted' });
});
