/**
 * Build connectivity target form prefill from a completed fibre order.
 */
export function fibreOrderToConnectivityPrefill(order) {
  if (!order) return null;

  const siteName =
    order.siteLabel?.trim() ||
    order.installationAddress?.split(',')[0]?.trim() ||
    order.installationAddress ||
    order.customerName;

  const noteLines = [
    order.product?.name && `Product: ${order.product.name}`,
    order.customerReference && `Customer ref: ${order.customerReference}`,
    order.installationAddress && `Address: ${order.installationAddress}`,
    `Fibre order: ${order.id}`,
  ].filter(Boolean);

  return {
    customerName: order.customerName || '',
    siteName,
    supplier: '',
    circuitNumber: '',
    fno: '',
    monitoringTarget: '',
    serviceType: 'fibre',
    notes: noteLines.join('\n'),
    alertEmail: '',
    status: 'enabled',
    dnsRefreshIntervalMinutes: 5,
    fibreOrderId: order.id,
  };
}

const DISMISS_KEY = (orderId) => `fibre-connectivity-prompt-dismissed-${orderId}`;

export function isConnectivityPromptDismissed(orderId) {
  try {
    return sessionStorage.getItem(DISMISS_KEY(orderId)) === '1';
  } catch {
    return false;
  }
}

export function dismissConnectivityPrompt(orderId) {
  try {
    sessionStorage.setItem(DISMISS_KEY(orderId), '1');
  } catch {
    // ignore
  }
}
