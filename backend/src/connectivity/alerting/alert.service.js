import { ConnectivityRepository } from '../connectivity.repository.js';
import { emailService } from './nodemailer.impl.js';
import { services } from '../../services/index.js';

const MAX_EMAILS_PER_MINUTE = parseInt(process.env.CONNECTIVITY_ALERT_RATE_LIMIT || '10', 10);
let emailsSentThisMinute = 0;
let minuteWindowStart = Date.now();

function resetRateLimitIfNeeded() {
  const now = Date.now();
  if (now - minuteWindowStart > 60000) {
    emailsSentThisMinute = 0;
    minuteWindowStart = now;
  }
}

function canSendEmail() {
  resetRateLimitIfNeeded();
  return emailsSentThisMinute < MAX_EMAILS_PER_MINUTE;
}

/**
 * Check if current time is within alert time window
 * @param {Object} tw - AlertTimeWindow
 * @returns {boolean}
 */
function isWithinTimeWindow(tw) {
  if (!tw || !tw.enabled) return true; // No window = 24/7
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysOfWeek = tw.daysOfWeek || [];
  if (daysOfWeek.length > 0 && !daysOfWeek.includes(day === 0 ? 7 : day)) return false;
  const [sh, sm] = (tw.startTime || '00:00').split(':').map(Number);
  const [eh, em] = (tw.endTime || '23:59').split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (startMins <= endMins) return nowMins >= startMins && nowMins <= endMins;
  return nowMins >= startMins || nowMins <= endMins;
}

/**
 * Send a connectivity alert email (fire-and-forget)
 * @param {Object} target - MonitoringTarget with alertEmail
 * @param {string} alertType - down, restored, dns_failure
 * @param {Object} details - { duration, message }
 */
export async function sendConnectivityAlert(target, alertType, details = {}) {
  const repo = new ConnectivityRepository();
  const timeWindows = await repo.findAlertTimeWindowsForTarget(target.id);
  const withinWindow = timeWindows.length === 0 || timeWindows.some(isWithinTimeWindow);
  if (!withinWindow) return;

  // In-app notifications for admins (fire-and-forget)
  services.notification.notifyConnectivityLinkDown(target, alertType, details).catch(() => {});

  const to = target?.alertEmail?.trim();
  if (!to) {
    console.warn(`Connectivity alert (${alertType}): No alert email configured for ${target.customerName} - ${target.siteName}. Add an Alert Email in the target settings.`);
    return;
  }

  if (!canSendEmail()) {
    console.warn('Connectivity alert rate limit exceeded, skipping email');
    return;
  }

  const subject = `[Connectivity] ${target.customerName} - ${target.siteName}: ${alertType}`;
  const body = `
    <h2>Connectivity Alert</h2>
    <p><strong>Type:</strong> ${alertType}</p>
    <p><strong>Customer:</strong> ${target.customerName}</p>
    <p><strong>Site:</strong> ${target.siteName}</p>
    <p><strong>Target:</strong> ${target.monitoringTarget}</p>
    ${target.supplier ? `<p><strong>Supplier:</strong> ${target.supplier}</p>` : ''}
    ${target.circuitNumber ? `<p><strong>Circuit Number:</strong> ${target.circuitNumber}</p>` : ''}
    ${target.fno ? `<p><strong>FNO:</strong> ${target.fno}</p>` : ''}
    ${target.serviceType ? `<p><strong>Service Type:</strong> ${target.serviceType}</p>` : ''}
    ${target.resolvedIp ? `<p><strong>Resolved IP:</strong> ${target.resolvedIp}</p>` : ''}
    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    ${details.duration ? `<p><strong>Duration:</strong> ${details.duration}</p>` : ''}
    ${details.message ? `<p>${details.message}</p>` : ''}
    ${target.notes ? `<p><strong>Notes:</strong> ${target.notes}</p>` : ''}
  `;

  try {
    const result = await emailService.send({ to, subject, html: body });
    emailsSentThisMinute++;
    await repo.createAlertLog({
      targetId: target.id,
      alertType,
      deliveryStatus: result.success ? 'sent' : 'failed',
      recipientEmail: to,
    });
    if (!result.success) {
      console.error(`Connectivity alert email failed for ${target.customerName} - ${target.siteName}:`, result.error || 'Unknown error');
    }
  } catch (err) {
    console.error('Connectivity alert failed:', err);
  }
}
