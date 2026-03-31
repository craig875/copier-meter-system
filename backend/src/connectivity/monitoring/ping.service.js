/**
 * Ping Service Interface
 * Abstraction for ping operations - enables swapping implementations (SOLID/DIP)
 *
 * Implementations must provide:
 * - pingTarget(target, count?) => Promise<PingResult>
 */

/**
 * @typedef {Object} PingResult
 * @property {boolean} success - Whether ping received response
 * @property {number|null} latencyMs - Average latency in milliseconds (null if failed)
 * @property {number} packetLossPercent - Percentage of packets lost (0-100)
 */

/**
 * Interface for ping operations.
 * Use PingServiceImpl for the concrete implementation.
 *
 * @interface
 */
export class IPingService {
  /**
   * Ping a target (IP or hostname)
   * @param {string} target - IP address or hostname to ping
   * @param {number} [count=3] - Number of pings to send
   * @returns {Promise<PingResult>}
   */
  async pingTarget(target, count = 3) {
    throw new Error('pingTarget must be implemented');
  }
}
