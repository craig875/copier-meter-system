export const INSTALL_STATUSES = ['active', 'complete', 'on_hold', 'cancelled'];

export const INSTALL_STATUS_LABELS = {
  active: 'Active',
  complete: 'Complete',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

export const SALES_ORDER_URL_TEMPLATE_KEY = 'accounting.sales_order_url_template';

/**
 * Build sales-order URL from template + order number.
 * Returns null if template or order number is missing / invalid.
 */
export function buildSalesOrderUrl(template, salesOrderNumber) {
  if (!template || !salesOrderNumber) return null;
  if (!template.includes('{orderNumber}')) return null;
  return template.replaceAll(
    '{orderNumber}',
    encodeURIComponent(String(salesOrderNumber).trim())
  );
}
