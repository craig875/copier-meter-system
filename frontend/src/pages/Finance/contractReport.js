import * as XLSX from 'xlsx';

const AUTO_EXCLUDE_CATEGORIES = new Set(['data', 'top up', 'top-up', 'topup']);

function normalizeHeader(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function headersHaveCodeAndCategory(headers) {
  const set = new Set(headers.map((h) => normalizeHeader(h).toLowerCase()).filter(Boolean));
  return set.has('code') && set.has('category');
}

export function findContractHeaderRow(rows) {
  const limit = Math.min(rows.length, 30);
  for (let i = 0; i < limit; i += 1) {
    const headers = (rows[i] || []).map((cell) => normalizeHeader(cell));
    if (headersHaveCodeAndCategory(headers)) return i;
  }
  return -1;
}

export function isAutoExcludedCategory(category) {
  return AUTO_EXCLUDE_CATEGORIES.has(String(category || '').trim().toLowerCase());
}

function colIndex(headers, name) {
  const want = name.toLowerCase();
  return headers.findIndex((h) => normalizeHeader(h).toLowerCase() === want);
}

export function parseContractSheet(rows) {
  const headerIdx = findContractHeaderRow(rows);
  if (headerIdx < 0) return { rows: [], headerIdx: -1 };
  const headers = (rows[headerIdx] || []).map((cell) => normalizeHeader(cell));
  const codeIdx = colIndex(headers, 'Code');
  const nameIdx = colIndex(headers, 'Customer Name');
  const categoryIdx = colIndex(headers, 'Category');
  const parsed = [];

  for (const cells of rows.slice(headerIdx + 1)) {
    const code = normalizeHeader(cells[codeIdx]);
    if (!code) continue;
    parsed.push({
      code,
      customerName: nameIdx >= 0 ? normalizeHeader(cells[nameIdx]) : '',
      category: categoryIdx >= 0 ? normalizeHeader(cells[categoryIdx]) : '',
    });
  }
  return { rows: parsed, headerIdx };
}

export function parseContractWorkbook(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { rows: [], headerIdx: -1 };
  const sheet = workbook.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  return parseContractSheet(aoa);
}

export async function readContractFile(file) {
  const name = String(file?.name || '').toLowerCase();
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) return null;
  try {
    const buf = await file.arrayBuffer();
    const parsed = parseContractWorkbook(buf);
    if (parsed.headerIdx < 0) return null;
    return parsed;
  } catch {
    return null;
  }
}
