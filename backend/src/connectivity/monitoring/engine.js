import { promisify } from 'util';
import dns from 'dns';
import PQueue from 'p-queue';
import { ConnectivityRepository } from '../connectivity.repository.js';
import { pingService } from './ping.impl.js';
import { sendConnectivityAlert } from '../alerting/alert.service.js';

const dnsLookup = promisify(dns.lookup);

const PING_INTERVAL_MS = parseInt(process.env.CONNECTIVITY_PING_INTERVAL_MS || '60000', 10);
const CONCURRENT_PINGS = parseInt(process.env.CONNECTIVITY_CONCURRENT_PINGS || '15', 10);
const PINGS_PER_CHECK = 3;

const IPv4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

function isIP(target) {
  return IPv4_REGEX.test(target);
}

/**
 * Resolve hostname to IP
 * @param {string} target
 * @returns {Promise<{success: boolean, ip?: string, error?: string}>}
 */
async function resolveHostname(target) {
  try {
    const { address } = await dnsLookup(target, { family: 4 });
    return { success: true, ip: address };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Monitoring Engine - Orchestrates ping checks for all enabled targets
 */
export class MonitoringEngine {
  constructor(repository, pingServiceImpl) {
    this.repo = repository || new ConnectivityRepository();
    this.ping = pingServiceImpl || pingService;
    this.queue = new PQueue({ concurrency: CONCURRENT_PINGS });
    this.intervalId = null;
  }

  /**
   * Run a single check for one target
   * @param {Object} target
   */
  async runCheck(target) {
    let pingTarget = target.monitoringTarget;
    let resolvedIp = target.resolvedIp;

    if (!isIP(target.monitoringTarget)) {
      const resolved = await resolveHostname(target.monitoringTarget);
      if (!resolved.success) {
        await this.handleDnsFailure(target);
        return;
      }
      pingTarget = resolved.ip;
      resolvedIp = resolved.ip;
    }

    const pingResult = await this.ping.pingTarget(pingTarget, PINGS_PER_CHECK);

    let status;
    let lastSuccessfulPing = null;
    if (pingResult.success) {
      status = pingResult.packetLossPercent > 0 && pingResult.packetLossPercent < 100 ? 'partial' : 'up';
      lastSuccessfulPing = new Date();
    } else {
      status = 'down';
    }

    const consecutiveFailures = pingResult.success ? 0 : (target.consecutiveFailures || 0) + 1;
    // Mark Down only after 3 consecutive failures; 1-2 failures = partial (degraded)
    const effectiveStatus = consecutiveFailures >= 3 ? 'down' : (pingResult.success ? status : 'partial');

    await this.repo.saveCheckResult(target.id, {
      status: effectiveStatus,
      latencyMs: pingResult.latencyMs,
      packetLossPercent: pingResult.packetLossPercent,
      lastSuccessfulPing,
    });

    await this.repo.updateTargetStatus(target.id, {
      lastCheckAt: new Date(),
      currentStatus: effectiveStatus,
      currentLatencyMs: pingResult.latencyMs,
      currentPacketLossPercent: pingResult.packetLossPercent,
      consecutiveFailures,
      resolvedIp: resolvedIp ?? target.resolvedIp,
    });

    const previousStatus = target.currentStatus;

    // Down alert: once per outage only (no open outage yet). Avoids spam when status flaps partial↔down.
    if ((previousStatus === 'up' || previousStatus === 'partial') && effectiveStatus === 'down') {
      const openOutage = await this.repo.findOpenOutage(target.id);
      if (!openOutage) {
        await this.repo.createOutageLog({
          targetId: target.id,
          startedAt: new Date(),
        });
        sendConnectivityAlert(target, 'down').catch(() => {});
      }
    } else if (
      (previousStatus === 'down' || previousStatus === 'dns_failure' || previousStatus === 'partial') &&
      effectiveStatus === 'up'
    ) {
      // Recovered: require full "up" (not partial/degraded) so brief flaky success does not
      // close the outage and trigger another down cycle on the next failures.
      const openOutage = await this.repo.findOpenOutage(target.id);
      if (openOutage) {
        const endedAt = new Date();
        const durationSeconds = Math.round((endedAt - openOutage.startedAt) / 1000);
        await this.repo.updateOutageLog(openOutage.id, {
          endedAt,
          durationSeconds,
          statusAtEnd: effectiveStatus,
        });
        const duration = durationSeconds >= 60 ? `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s` : `${durationSeconds}s`;
        sendConnectivityAlert(target, 'restored', { duration }).catch(() => {});
      }
    }
  }

  async handleDnsFailure(target) {
    await this.repo.saveCheckResult(target.id, {
      status: 'dns_failure',
      latencyMs: null,
      packetLossPercent: 100,
      lastSuccessfulPing: null,
    });

    await this.repo.updateTargetStatus(target.id, {
      lastCheckAt: new Date(),
      currentStatus: 'dns_failure',
      currentLatencyMs: null,
      currentPacketLossPercent: 100,
      consecutiveFailures: (target.consecutiveFailures || 0) + 1,
      resolvedIp: null,
    });

    const previousStatus = target.currentStatus;
    if (previousStatus !== 'dns_failure' && previousStatus !== 'down') {
      const openOutage = await this.repo.findOpenOutage(target.id);
      if (!openOutage) {
        await this.repo.createOutageLog({
          targetId: target.id,
          startedAt: new Date(),
        });
        sendConnectivityAlert(target, 'dns_failure', { message: 'Hostname could not be resolved' }).catch(() => {});
      }
    }
  }

  /**
   * Run checks for all enabled targets
   */
  async runAllChecks() {
    let targets;
    try {
      targets = await this.repo.findTargetsEnabled();
    } catch (err) {
      if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
        console.warn('Connectivity: monitoring_targets table not found. Run: npx prisma migrate deploy');
        return;
      }
      throw err;
    }
    const tasks = targets.map((target) =>
      this.queue.add(() => this.runCheck(target))
    );
    await Promise.allSettled(tasks);
  }

  /**
   * Start the monitoring loop
   */
  start() {
    if (this.intervalId) return;
    this.runAllChecks();
    this.intervalId = setInterval(() => {
      this.runAllChecks();
    }, PING_INTERVAL_MS);
  }

  /**
   * Stop the monitoring loop
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

let engineInstance = null;

export function getMonitoringEngine() {
  if (!engineInstance) {
    engineInstance = new MonitoringEngine();
  }
  return engineInstance;
}
