import { ConnectivityRepository } from '../connectivity.repository.js';

/**
 * Report Service - Uptime, SLA, and export logic
 */
export class ReportService {
  constructor(repository) {
    this.repo = repository || new ConnectivityRepository();
  }

  /**
   * Calculate uptime for a target over a date range
   * Uses check results: uptime = (successful checks / total checks) * 100
   */
  async getUptimeReport(startDate, endDate, customerName, siteName, targetId, branch) {
    const targets = await this.repo.findTargets(branch ? { branch } : {});
    let filtered = targets;
    if (targetId) {
      filtered = filtered.filter((t) => t.id === targetId);
    }
    if (customerName) {
      filtered = filtered.filter((t) =>
        t.customerName.toLowerCase().includes(customerName.toLowerCase())
      );
    }
    if (siteName) {
      filtered = filtered.filter((t) =>
        t.siteName.toLowerCase().includes(siteName.toLowerCase())
      );
    }

    const results = [];
    for (const target of filtered) {
      const checks = await this.repo.findCheckResultsForUptime(
        target.id,
        startDate,
        endDate
      );
      const total = checks.length;
      const successful = checks.filter(
        (c) => c.status === 'up' || c.status === 'partial'
      ).length;
      const uptimePercent = total > 0 ? (successful / total) * 100 : null;
      const downtimeSeconds = checks
        .filter((c) => c.status === 'down' || c.status === 'dns_failure')
        .length * 60; // approximate: 1 check per minute
      results.push({
        targetId: target.id,
        customerName: target.customerName,
        siteName: target.siteName,
        supplier: target.supplier,
        circuitNumber: target.circuitNumber,
        fno: target.fno,
        monitoringTarget: target.monitoringTarget,
        serviceType: target.serviceType,
        totalChecks: total,
        successfulChecks: successful,
        uptimePercent: uptimePercent !== null ? Math.round(uptimePercent * 100) / 100 : null,
        approximateDowntimeSeconds: downtimeSeconds,
      });
    }

    return { results, startDate, endDate };
  }

  /**
   * SLA report - compare uptime to SLA targets per service type
   */
  async getSlaReport(startDate, endDate, customerName, siteName, branch) {
    const slaTargets = await this.repo.findSlaTargets();
    const slaMap = Object.fromEntries(slaTargets.map((s) => [s.serviceType, s.targetPercent]));

    const uptimeReport = await this.getUptimeReport(startDate, endDate, customerName, siteName, undefined, branch);
    const byTarget = uptimeReport.results.map((r) => ({
      ...r,
      slaTarget: slaMap[r.serviceType] ?? 99.9,
      meetsSla: r.uptimePercent !== null && r.uptimePercent >= (slaMap[r.serviceType] ?? 99.9),
    }));

    return {
      results: byTarget,
      startDate,
      endDate,
      slaTargets: slaMap,
    };
  }

  /**
   * Export as CSV
   */
  async exportCsv(startDate, endDate, branch) {
    const report = await this.getUptimeReport(startDate, endDate, undefined, undefined, undefined, branch);
    const headers = [
      'Customer',
      'Site',
      'Supplier',
      'Circuit Number',
      'FNO',
      'Target',
      'Service Type',
      'Total Checks',
      'Successful Checks',
      'Uptime %',
      'Approx Downtime (sec)',
    ];
    const rows = report.results.map((r) => [
      r.customerName,
      r.siteName,
      r.supplier ?? '',
      r.circuitNumber ?? '',
      r.fno ?? '',
      r.monitoringTarget,
      r.serviceType,
      r.totalChecks,
      r.successfulChecks,
      r.uptimePercent ?? '',
      r.approximateDowntimeSeconds ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    return csv;
  }
}
