import ping from 'ping';

/**
 * Ping Service Implementation
 * Uses the 'ping' npm package (system ping via child_process)
 * Cross-platform, no root required
 */
export class PingServiceImpl {
  /**
   * @param {number} [timeout=5] - Timeout in seconds
   */
  constructor(timeout = 5) {
    this.timeout = timeout;
  }

  /**
   * Ping a target (IP or hostname)
   * @param {string} target - IP address or hostname to ping
   * @param {number} [count=3] - Number of pings to send (min_reply)
   * @returns {Promise<{success: boolean, latencyMs: number|null, packetLossPercent: number}>}
   */
  async pingTarget(target, count = 3) {
    const config = {
      timeout: this.timeout,
      min_reply: count,
    };

    try {
      const result = await ping.promise.probe(target, config);

      const success = !!result.alive;

      let latencyMs = null;
      if (success) {
        if (typeof result.time === 'number' && result.time > 0) {
          latencyMs = result.time;
        } else if (typeof result.avg === 'string') {
          const parsed = parseFloat(result.avg);
          latencyMs = !Number.isNaN(parsed) ? parsed : null;
        } else if (typeof result.avg === 'number') {
          latencyMs = result.avg;
        }
      }

      let packetLossPercent = 100;
      if (result.packetLoss !== undefined && result.packetLoss !== null) {
        const val = typeof result.packetLoss === 'string'
          ? parseFloat(result.packetLoss)
          : result.packetLoss;
        packetLossPercent = Number.isNaN(val) ? 100 : Math.min(100, Math.max(0, val));
      }

      return {
        success,
        latencyMs: success ? (latencyMs ?? 0) : null,
        packetLossPercent,
      };
    } catch (_err) {
      return {
        success: false,
        latencyMs: null,
        packetLossPercent: 100,
      };
    }
  }
}

export const pingService = new PingServiceImpl(5);
