import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';

export const getMakes = asyncHandler(async (req, res) => {
  const makes = await prisma.make.findMany({
    orderBy: { name: 'asc' },
    include: { models: { orderBy: { name: 'asc' } } },
  });
  res.json({ makes });
});

export const getModels = asyncHandler(async (req, res) => {
  const { makeId } = req.query;
  const where = makeId ? { makeId } : {};
  const models = await prisma.model.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { make: true },
  });
  res.json({ models });
});

export const createMake = asyncHandler(async (req, res) => {
  const existing = await prisma.make.findUnique({ where: { name: req.body.name.trim() } });
  if (existing) throw new ConflictError('Make already exists');
  const make = await prisma.make.create({ data: { name: req.body.name.trim() } });
  res.status(201).json({ make });
});

export const updateMake = asyncHandler(async (req, res) => {
  const make = await prisma.make.findUnique({ where: { id: req.params.id } });
  if (!make) throw new NotFoundError('Make');
  const name = req.body.name?.trim();
  if (!name) throw new ValidationError('Name is required');
  const existing = await prisma.make.findFirst({ where: { name, id: { not: req.params.id } } });
  if (existing) throw new ConflictError('Make name already exists');
  const updated = await prisma.make.update({
    where: { id: req.params.id },
    data: { name },
  });
  res.json({ make: updated });
});

export const deleteMake = asyncHandler(async (req, res) => {
  const make = await prisma.make.findUnique({
    where: { id: req.params.id },
    include: { models: { include: { modelParts: { include: { _count: { select: { replacements: true } } } } } } },
  });
  if (!make) throw new NotFoundError('Make');
  const hasReplacements = make.models?.some((m) =>
    m.modelParts?.some((p) => (p._count?.replacements ?? 0) > 0)
  );
  if (hasReplacements) throw new ConflictError('Cannot delete make: some parts have replacement history');
  await prisma.$transaction(async (tx) => {
    for (const model of make.models || []) {
      await tx.modelPart.deleteMany({ where: { modelId: model.id } });
      await tx.model.delete({ where: { id: model.id } });
    }
    await tx.make.delete({ where: { id: req.params.id } });
  });
  res.json({ message: 'Make deleted' });
});

export const createModel = asyncHandler(async (req, res) => {
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
  const model = await prisma.model.findUnique({ where: { id: req.params.id } });
  if (!model) throw new NotFoundError('Model');
  const existing = await prisma.model.findFirst({
    where: { makeId: req.body.makeId || model.makeId, name: req.body.name?.trim() || model.name, id: { not: req.params.id } },
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
  const model = await prisma.model.findUnique({
    where: { id: req.params.id },
    include: { modelParts: { include: { _count: { select: { replacements: true } } } } },
  });
  if (!model) throw new NotFoundError('Model');
  const hasReplacements = model.modelParts?.some((p) => (p._count?.replacements ?? 0) > 0);
  if (hasReplacements) throw new ConflictError('Cannot delete model: some parts have replacement history');
  await prisma.$transaction(async (tx) => {
    await tx.modelPart.deleteMany({ where: { modelId: req.params.id } });
    await tx.model.delete({ where: { id: req.params.id } });
  });
  res.json({ message: 'Model deleted' });
});
