import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';
import { assertRecordInTenant } from '../middleware/tenant.js';

export const getMakes = asyncHandler(async (req, res) => {
  const branch = req.tenantBranch;
  const makes = await prisma.make.findMany({
    where: { branch },
    orderBy: { name: 'asc' },
    include: {
      models: {
        where: { branch },
        orderBy: { name: 'asc' },
      },
    },
  });
  res.json({ makes });
});

export const getModels = asyncHandler(async (req, res) => {
  const branch = req.tenantBranch;
  const { makeId } = req.query;
  const where = {
    branch,
    ...(makeId ? { makeId } : {}),
  };
  const models = await prisma.model.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { make: true },
  });
  res.json({ models });
});

export const createMake = asyncHandler(async (req, res) => {
  const branch = req.tenantBranch;
  const name = req.body.name.trim();
  const existing = await prisma.make.findFirst({ where: { name, branch } });
  if (existing) throw new ConflictError('Make already exists');
  const make = await prisma.make.create({ data: { name, branch } });
  res.status(201).json({ make });
});

export const updateMake = asyncHandler(async (req, res) => {
  const branch = req.tenantBranch;
  const make = await prisma.make.findUnique({ where: { id: req.params.id } });
  assertRecordInTenant(make, branch, 'Make');
  const name = req.body.name?.trim();
  if (!name) throw new ValidationError('Name is required');
  const existing = await prisma.make.findFirst({
    where: { name, branch, id: { not: req.params.id } },
  });
  if (existing) throw new ConflictError('Make name already exists');
  const updated = await prisma.make.update({
    where: { id: req.params.id },
    data: { name },
  });
  res.json({ make: updated });
});

export const deleteMake = asyncHandler(async (req, res) => {
  const branch = req.tenantBranch;
  const make = await prisma.make.findUnique({
    where: { id: req.params.id },
    include: {
      models: {
        include: {
          modelParts: { include: { _count: { select: { replacements: true } } } },
        },
      },
    },
  });
  assertRecordInTenant(make, branch, 'Make');
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
  const branch = req.tenantBranch;
  const make = await prisma.make.findUnique({ where: { id: req.body.makeId } });
  assertRecordInTenant(make, branch, 'Make');

  const existing = await prisma.model.findFirst({
    where: { makeId: req.body.makeId, name: req.body.name.trim(), branch },
  });
  if (existing) throw new ConflictError('Model already exists for this make');
  const model = await prisma.model.create({
    data: {
      makeId: req.body.makeId,
      name: req.body.name.trim(),
      paperSize: req.body.paperSize || 'A4',
      modelType: req.body.modelType || 'mono',
      machineLife:
        req.body.machineLife !== '' && req.body.machineLife != null
          ? Number(req.body.machineLife)
          : null,
      branch,
    },
    include: { make: true },
  });
  res.status(201).json({ model });
});

export const updateModel = asyncHandler(async (req, res) => {
  const branch = req.tenantBranch;
  const model = await prisma.model.findUnique({ where: { id: req.params.id } });
  assertRecordInTenant(model, branch, 'Model');

  const nextMakeId = req.body.makeId || model.makeId;
  if (req.body.makeId) {
    const make = await prisma.make.findUnique({ where: { id: req.body.makeId } });
    assertRecordInTenant(make, branch, 'Make');
  }

  const existing = await prisma.model.findFirst({
    where: {
      makeId: nextMakeId,
      name: req.body.name?.trim() || model.name,
      branch,
      id: { not: req.params.id },
    },
  });
  if (existing) throw new ConflictError('Model name already exists for this make');

  const { branch: _ignored, ...body } = req.body;
  const updateData = {
    ...(body.makeId && { makeId: body.makeId }),
    ...(body.name && { name: body.name.trim() }),
    ...(body.paperSize && { paperSize: body.paperSize }),
    ...(body.modelType && { modelType: body.modelType }),
    ...(body.machineLife !== undefined && {
      machineLife:
        body.machineLife !== '' && body.machineLife != null ? Number(body.machineLife) : null,
    }),
  };
  const updated = await prisma.model.update({
    where: { id: req.params.id },
    data: updateData,
    include: { make: true },
  });
  res.json({ model: updated });
});

export const deleteModel = asyncHandler(async (req, res) => {
  const branch = req.tenantBranch;
  const model = await prisma.model.findUnique({
    where: { id: req.params.id },
    include: { modelParts: { include: { _count: { select: { replacements: true } } } } },
  });
  assertRecordInTenant(model, branch, 'Model');
  const hasReplacements = model.modelParts?.some((p) => (p._count?.replacements ?? 0) > 0);
  if (hasReplacements) throw new ConflictError('Cannot delete model: some parts have replacement history');
  await prisma.$transaction(async (tx) => {
    await tx.modelPart.deleteMany({ where: { modelId: req.params.id } });
    await tx.model.delete({ where: { id: req.params.id } });
  });
  res.json({ message: 'Model deleted' });
});
