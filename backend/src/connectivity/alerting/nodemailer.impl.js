import nodemailer from 'nodemailer';

/**
 * Nodemailer Email Service Implementation
 */
export class NodemailerEmailService {
  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.from = process.env.ALERT_FROM_EMAIL || user || 'alerts@localhost';
    this.enabled = !!(host && user && pass);
    this.transporter = this.enabled
      ? nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
      : null;
  }

  async send({ to, subject, html, text }) {
    if (!this.enabled) {
      console.warn('Connectivity alerts: SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS.');
      return { success: false, error: 'SMTP not configured' };
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html: html || text,
        text,
      });
      return { success: true };
    } catch (err) {
      console.error('Connectivity alert email failed:', err.message);
      return { success: false, error: err.message };
    }
  }
}

export const emailService = new NodemailerEmailService();
