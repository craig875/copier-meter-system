import { ConnectivityRepository } from './connectivity.repository.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Connectivity Service - Business logic for connectivity monitoring
 */
export class ConnectivityService {
  constructor(repository) {
    this.repo = repository || new ConnectivityRepository();
  }

  async getDashboard() {
    const targets = await this.repo.findTargets({});
    const summary = this._buildSummary(targets);
    return { summary, targets };
  }

  /**
   * Lightweight summary for Layout polling (down/dns_failure counts for alert banner)
   */
  async getSummary() {
    const targets = await this.repo.findTargets({});
    const summary = this._buildSummary(targets);
    return { down: summary.down, dnsFailure: summary.dnsFailure, total: summary.total };
  }

  _buildSummary(targets) {
    return {
      total: targets.length,
      up: targets.filter((t) => t.currentStatus === 'up').length,
      down: targets.filter((t) => t.currentStatus === 'down').length,
      partial: targets.filter((t) => t.currentStatus === 'partial').length,
      dnsFailure: targets.filter((t) => t.currentStatus === 'dns_failure').length,
    };
  }

  async getTargets(filters = {}) {
    const targets = await this.repo.findTargets(filters);
    return { targets };
  }

  async getTarget(id, options = {}) {
    const target = await this.repo.findTargetById(id, options);
    if (!target) throw new NotFoundError('Monitoring target');
    return { target };
  }

  async createTarget(data) {
    const payload = {
      customerName: data.customerName,
      siteName: data.siteName,
      monitoringTarget: data.monitoringTarget.trim(),
      supplier: data.supplier?.trim() || null,
      circuitNumber: data.circuitNumber?.trim() || null,
      fno: data.fno?.trim() || null,
      serviceType: data.serviceType || 'other',
      notes: data.notes || null,
      alertEmail: data.alertEmail && data.alertEmail.trim() ? data.alertEmail.trim() : null,
      status: data.status || 'enabled',
      dnsRefreshIntervalMinutes: data.dnsRefreshIntervalMinutes ?? 5,
    };
    const target = await this.repo.createTarget(payload);
    return { target };
  }

  async updateTarget(id, data) {
    const existing = await this.repo.findTargetById(id);
    if (!existing) throw new NotFoundError('Monitoring target');

    const payload = {};
    if (data.customerName !== undefined) payload.customerName = data.customerName;
    if (data.siteName !== undefined) payload.siteName = data.siteName;
    if (data.monitoringTarget != null) payload.monitoringTarget = String(data.monitoringTarget).trim();
    if (data.supplier !== undefined) payload.supplier = data.supplier?.trim() || null;
    if (data.circuitNumber !== undefined) payload.circuitNumber = data.circuitNumber?.trim() || null;
    if (data.fno !== undefined) payload.fno = data.fno?.trim() || null;
    if (data.serviceType !== undefined) payload.serviceType = data.serviceType;
    if (data.notes !== undefined) payload.notes = data.notes || null;
    if (data.alertEmail !== undefined) payload.alertEmail = data.alertEmail?.trim() || null;
    if (data.status !== undefined) payload.status = data.status;
    if (data.dnsRefreshIntervalMinutes !== undefined) {
      const mins = Number(data.dnsRefreshIntervalMinutes);
      payload.dnsRefreshIntervalMinutes = Number.isFinite(mins) ? Math.min(60, Math.max(1, mins)) : 5;
    }

    const target = await this.repo.updateTarget(id, payload);
    return { target };
  }

  async deleteTarget(id) {
    const existing = await this.repo.findTargetById(id);
    if (!existing) throw new NotFoundError('Monitoring target');
    await this.repo.deleteTarget(id);
    return { message: 'Target deleted' };
  }

  async setTargetStatus(id, status) {
    const existing = await this.repo.findTargetById(id);
    if (!existing) throw new NotFoundError('Monitoring target');
    const target = await this.repo.updateTarget(id, { status: status === 'enabled' ? 'enabled' : 'disabled' });
    return { target };
  }

  async getTimeWindows() {
    const timeWindows = await this.repo.findAllAlertTimeWindows();
    return { timeWindows };
  }

  async createOrUpdateTimeWindow(data) {
    const payload = {
      startTime: data.startTime,
      endTime: data.endTime,
      daysOfWeek: data.daysOfWeek,
      enabled: data.enabled ?? true,
    };
    if (data.targetId && data.targetId !== '') payload.targetId = data.targetId;
    else payload.targetId = null;

    let timeWindow;
    if (data.id) {
      timeWindow = await this.repo.updateAlertTimeWindow(data.id, payload);
    } else {
      timeWindow = await this.repo.createAlertTimeWindow(payload);
    }
    return { timeWindow };
  }

  async getOutages(filters = {}, options = {}) {
    const { items, total } = await this.repo.findOutageLogs(filters, options);
    return { outages: items, total };
  }
}
