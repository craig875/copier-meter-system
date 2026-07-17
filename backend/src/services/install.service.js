import { repositories } from '../repositories/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { assertRecordInTenant } from '../middleware/tenant.js';
import {
  buildSalesOrderUrl,
} from '../constants/install-statuses.js';

function parseDateOnly(dateStr) {
  if (dateStr == null || dateStr === '') return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function sameProgress(a, b) {
  const left = a == null || a === '' ? null : String(a);
  const right = b == null || b === '' ? null : String(b);
  return left === right;
}

/**
 * Installations tracker — elevated CRUD + progress/status timeline.
 */
export class InstallService {
  constructor(repos = repositories) {
    this.installRepo = repos.install;
  }

  async enrich(install, template = null) {
    if (!install) return install;
    const tpl =
      template ?? (await this.installRepo.getSalesOrderUrlTemplate());
    return {
      ...install,
      salesOrderUrl: buildSalesOrderUrl(tpl, install.salesOrderNumber),
    };
  }

  async enrichMany(installs) {
    const template = await this.installRepo.getSalesOrderUrlTemplate();
    return Promise.all(installs.map((row) => this.enrich(row, template)));
  }

  buildListWhere(filters = {}) {
    const where = {
      branch: filters.branch,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.typeId) {
      where.typeId = filters.typeId;
    }

    if (filters.completedOnly === 'true' || filters.completedOnly === true) {
      where.status = 'complete';
    } else if (
      (filters.activeOnly === 'true' || filters.activeOnly === true) &&
      !filters.status
    ) {
      where.status = { in: ['active', 'on_hold'] };
    }

    if (filters.search) {
      const s = filters.search.trim();
      if (s) {
        where.OR = [
          { customerName: { contains: s, mode: 'insensitive' } },
          { siteName: { contains: s, mode: 'insensitive' } },
          { siteAddress: { contains: s, mode: 'insensitive' } },
          { salesOrderNumber: { contains: s, mode: 'insensitive' } },
          { progress: { contains: s, mode: 'insensitive' } },
          { assignedTechnicianName: { contains: s, mode: 'insensitive' } },
        ];
      }
    }

    return where;
  }

  async listTypes() {
    return this.installRepo.findActiveTypes();
  }

  async listInstalls(filters = {}) {
    const where = this.buildListWhere(filters);
    const rows = await this.installRepo.findManyWithRelations(where);
    return this.enrichMany(rows);
  }

  async getInstallById(id, tenantBranch) {
    const install = await this.installRepo.findByIdWithRelations(id);
    if (!install) throw new NotFoundError('Installation');
    assertRecordInTenant(install, tenantBranch);
    return this.enrich(install);
  }

  async getUpdates(id, tenantBranch) {
    await this.getInstallById(id, tenantBranch);
    return this.installRepo.findUpdates(id);
  }

  async createInstall(user, data, tenantBranch) {
    const type = await this.installRepo.findTypeById(data.typeId);
    if (!type || !type.isActive) {
      throw new ValidationError('Invalid or inactive installation type');
    }

    const branch = data.branch || tenantBranch;
    if (branch !== tenantBranch) {
      throw new ValidationError('Branch must match active branch');
    }

    const status = data.status || 'active';
    const completedDate =
      status === 'complete'
        ? parseDateOnly(data.completedDate) || new Date()
        : parseDateOnly(data.completedDate);

    const created = await this.installRepo.create({
      branch,
      typeId: data.typeId,
      customerName: data.customerName,
      siteName: data.siteName ?? null,
      siteAddress: data.siteAddress ?? null,
      salesOrderNumber: data.salesOrderNumber ?? null,
      status,
      progress: data.progress ?? null,
      scheduledDate: parseDateOnly(data.scheduledDate),
      completedDate,
      assignedTechnicianName: data.assignedTechnicianName ?? null,
      notes: data.notes ?? null,
      createdById: user.id,
    });

    if (data.documentUrl) {
      await this.installRepo.upsertPrimaryDocument(created.id, {
        url: data.documentUrl,
        label: data.documentLabel,
        createdById: user.id,
      });
    }

    // Initial timeline snapshot
    await this.installRepo.createUpdate({
      installId: created.id,
      previousStatus: null,
      newStatus: status,
      previousProgress: null,
      newProgress: data.progress ?? null,
      note: 'Created',
      createdById: user.id,
    });

    return this.getInstallById(created.id, tenantBranch);
  }

  async updateInstall(user, id, data, tenantBranch) {
    const existing = await this.installRepo.findByIdWithRelations(id);
    if (!existing) throw new NotFoundError('Installation');
    assertRecordInTenant(existing, tenantBranch);

    if (data.typeId) {
      const type = await this.installRepo.findTypeById(data.typeId);
      if (!type || !type.isActive) {
        throw new ValidationError('Invalid or inactive installation type');
      }
    }

    const nextStatus = data.status !== undefined ? data.status : existing.status;
    const nextProgress =
      data.progress !== undefined ? data.progress : existing.progress;

    const statusChanged = data.status !== undefined && data.status !== existing.status;
    const progressChanged =
      data.progress !== undefined && !sameProgress(data.progress, existing.progress);

    const updateData = {};
    if (data.typeId !== undefined) updateData.typeId = data.typeId;
    if (data.customerName !== undefined) updateData.customerName = data.customerName;
    if (data.siteName !== undefined) updateData.siteName = data.siteName;
    if (data.siteAddress !== undefined) updateData.siteAddress = data.siteAddress;
    if (data.salesOrderNumber !== undefined) {
      updateData.salesOrderNumber = data.salesOrderNumber;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.progress !== undefined) updateData.progress = data.progress;
    if (data.scheduledDate !== undefined) {
      updateData.scheduledDate = parseDateOnly(data.scheduledDate);
    }
    if (data.assignedTechnicianName !== undefined) {
      updateData.assignedTechnicianName = data.assignedTechnicianName;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.completedDate !== undefined) {
      updateData.completedDate = parseDateOnly(data.completedDate);
    } else if (statusChanged && nextStatus === 'complete' && !existing.completedDate) {
      updateData.completedDate = new Date();
    } else if (statusChanged && nextStatus !== 'complete') {
      // leave completedDate as-is unless explicitly cleared
    }

    if (Object.keys(updateData).length > 0) {
      await this.installRepo.update(id, updateData);
    }

    if (data.documentUrl !== undefined) {
      await this.installRepo.upsertPrimaryDocument(id, {
        url: data.documentUrl,
        label: data.documentLabel,
        createdById: user.id,
      });
    }

    if (statusChanged || progressChanged) {
      await this.installRepo.createUpdate({
        installId: id,
        previousStatus: statusChanged ? existing.status : null,
        newStatus: statusChanged ? nextStatus : null,
        previousProgress: progressChanged ? existing.progress : null,
        newProgress: progressChanged ? nextProgress : null,
        note: data.note ?? null,
        createdById: user.id,
      });
    }

    return this.getInstallById(id, tenantBranch);
  }
}
