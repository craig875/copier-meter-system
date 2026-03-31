/**
 * Email Service Interface
 * Abstraction for email delivery - enables swapping implementations (SOLID/DIP)
 */

export class IEmailService {
  /**
   * Send an email
   * @param {Object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML body
   * @param {string} [options.text] - Plain text body (optional)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async send({ to, subject, html, text }) {
    throw new Error('send must be implemented');
  }
}
