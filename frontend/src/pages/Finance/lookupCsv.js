import { parseCsv } from './parseCsv.js';

export const LOOKUP_CSV_HEADERS = ['Customer Name', 'Smart Edge Code'];

function csvCell(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function lookupRowsToCsv(rows) {
  const lines = [LOOKUP_CSV_HEADERS.map(csvCell).join(',')];
  for (const row of rows) {
    const name = String(row.customerName || '').trim();
    if (!name) continue;
    lines.push([csvCell(name), csvCell(String(row.smartEdgeCode || '').trim())].join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function headerKey(name) {
  return String(name || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
}

function pickNameHeader(headers) {
  const mapped = headers.map((h) => ({ raw: h, key: headerKey(h) }));
  return (
    mapped.find((h) => h.key === 'customer name') ||
    mapped.find((h) => h.key === 'customer') ||
    mapped.find((h) => h.key.includes('customer') && h.key.includes('name')) ||
    mapped.find((h) => h.key === 'name')
  )?.raw;
}

function pickCodeHeader(headers) {
  const mapped = headers.map((h) => ({ raw: h, key: headerKey(h) }));
  return (
    mapped.find((h) => h.key === 'smart edge code') ||
    mapped.find((h) => h.key.includes('smart') && h.key.includes('code')) ||
    mapped.find((h) => h.key === 'code') ||
    mapped.find((h) => h.key.includes('client') && h.key.includes('code'))
  )?.raw;
}

export function parseLookupCsv(text) {
  const { headers, rows } = parseCsv(text);
  const nameHeader = pickNameHeader(headers);
  const codeHeader = pickCodeHeader(headers);
  if (!nameHeader || !codeHeader || nameHeader === codeHeader) {
    throw new Error('CSV must have Customer Name and Smart Edge Code columns');
  }
  const lookup = {};
  for (const row of rows) {
    const name = String(row[nameHeader] || '').trim();
    if (!name) continue;
    lookup[name] = String(row[codeHeader] || '').trim();
  }
  return lookup;
}

export function downloadLookupCsv(filename, csv) {
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
