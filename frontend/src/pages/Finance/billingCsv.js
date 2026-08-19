export const BILLING_CSV_HEADERS = [
  'Code',
  'Customer Name',
  'Category',
  'Mobile',
  'International',
  'National',
  'Local',
  'Special',
  'Virtual',
  'VCE',
];

function csvCell(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

export function billingLinesToCsv(lines = []) {
  const rows = [BILLING_CSV_HEADERS.map(csvCell).join(',')];
  for (const line of lines) {
    rows.push(
      [
        csvCell(line.clientCode || ''),
        csvCell(line.customerName || ''),
        csvCell(line.category || ''),
        money(line.mobile),
        money(line.international),
        money(line.national),
        money(line.local),
        money(line.special),
        money(line.virtual),
        money(line.vce),
      ].join(',')
    );
  }
  return `\uFEFF${rows.join('\r\n')}\r\n`;
}

export function downloadBillingCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
