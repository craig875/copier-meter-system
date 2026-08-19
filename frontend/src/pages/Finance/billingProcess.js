import { parseAmount, parseCsv, roundMoney } from './parseCsv.js';
import { isAutoExcludedCategory } from './contractReport.js';
import { logEngineParts, logMergedLines } from './billingDebug.js';

export const CALL_TYPE_COLUMNS = [
  'Mobile',
  'International',
  'National',
  'Local',
  'Special',
  'Virtual',
  'VCE',
];

const CALL_TYPE_TO_FIELD = {
  Mobile: 'mobile',
  International: 'international',
  National: 'national',
  Local: 'local',
  Special: 'special',
  Virtual: 'virtual',
  VCE: 'vce',
};

export function detectEngine(filename) {
  const name = String(filename || '').trim();
  const lower = name.toLowerCase();
  const base = lower.split(/[/\\]/).pop() || lower;
  if (base.startsWith('costrevenue')) return 'engine3';
  if (lower.includes('albatross')) return 'engine1';
  if (lower.includes('porta')) return 'engine2';
  return null;
}

export function engineLabel(engine) {
  if (engine === 'engine1') return 'Engine 1 · Albatross';
  if (engine === 'engine2') return 'Engine 2 · Porta';
  if (engine === 'engine3') return 'Engine 3 · VCE';
  if (engine === 'contract') return 'Contract';
  return 'Unknown';
}

function findHeader(headers, testers) {
  const list = headers.map((h) => ({ raw: h, lower: String(h || '').toLowerCase().trim() }));
  for (const test of testers) {
    const hit = list.find((h) => test(h.lower));
    if (hit) return hit.raw;
  }
  return null;
}

function pickEngine12Columns(headers) {
  return {
    duration: findHeader(headers, [(h) => h.includes('duration')]),
    name: findHeader(headers, [(h) => h === 'name', (h) => h.includes('name') && !h.includes('customer')]),
    code: findHeader(headers, [(h) => h === 'code', (h) => h.includes('client') && h.includes('code'), (h) => h === 'account']),
    amount: findHeader(headers, [
      (h) => h === 'amount',
      (h) => h.includes('amount'),
      (h) => h.includes('charge'),
      (h) => h.includes('cost') && !h.includes('duration'),
    ]),
    callType: findHeader(headers, [
      (h) => h.includes('call') && h.includes('type'),
      (h) => h === 'type',
      (h) => h.includes('description'),
      (h) => h.includes('destination'),
      (h) => h.includes('service'),
    ]),
  };
}

export function mapCallType(raw) {
  const s = String(raw || '')
    .replace(/\(CLI Err\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const n = s.toLowerCase();
  if (!n) return null;
  if (n.includes('f2m') || n.includes('mobile')) return 'Mobile';
  if (n.includes('international') || n.includes('intl')) return 'International';
  if (n.includes('domestic') || n.includes('national')) return 'National';
  if (n.includes('local')) return 'Local';
  if (n.includes('on net') || n.includes('on-net') || n.includes('onnet') || n.includes('special')) {
    return 'Special';
  }
  if (n.includes('virtual')) return 'Virtual';
  if (n.includes('vce')) return 'VCE';
  return null;
}

function customerFromAlbatrossName(name) {
  const parts = String(name || '').split('|').map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(name || '').trim();
}

function exclusionSets(exclusions = {}) {
  const categories = new Set(
    (exclusions.categories || []).map((c) => String(c).trim().toLowerCase()).filter(Boolean)
  );
  const codes = new Set(
    (exclusions.codes || [])
      .map((c) => (typeof c === 'string' ? c : c?.value))
      .map((c) => String(c || '').trim().toLowerCase())
      .filter(Boolean)
  );
  return { categories, codes };
}

function isExcluded(_code, callType, rawType, sets) {
  const cats = [callType, rawType]
    .map((v) => String(v || '').trim().toLowerCase())
    .filter(Boolean);
  return cats.some((c) => sets.categories.has(c));
}

function lookupCode(lookup, customerName) {
  if (!lookup || typeof lookup !== 'object') return '';
  const name = String(customerName || '').trim();
  if (!name) return '';
  if (Object.prototype.hasOwnProperty.call(lookup, name) && String(lookup[name] || '').trim()) {
    return String(lookup[name]).trim();
  }
  const want = name.toLowerCase();
  const hit = Object.entries(lookup).find(([k]) => k.trim().toLowerCase() === want);
  return hit ? String(hit[1] || '').trim() : '';
}

function lookupHasName(lookup, customerName) {
  const want = String(customerName || '').trim().toLowerCase();
  if (!want || !lookup) return false;
  return Object.keys(lookup).some((k) => k.trim().toLowerCase() === want);
}

/** Use the export code when present; otherwise look up by customer name. */
function resolveClientCode(lookup, customerName, exportCode) {
  const fromExport = String(exportCode || '').trim();
  if (fromExport) return fromExport;
  const fromLookup = lookupCode(lookup, customerName);
  if (fromLookup) return fromLookup;
  const name = String(customerName || '').trim();
  if (name && lookup && !lookupHasName(lookup, name)) {
    lookup[name] = '';
  }
  return '';
}

function emptyPivot(code, customerName, category = '') {
  return {
    clientCode: code,
    customerName,
    category,
    mobile: 0,
    international: 0,
    national: 0,
    local: 0,
    special: 0,
    virtual: 0,
    vce: 0,
    excluded: false,
    unmatched: false,
  };
}

export function normalizeClientCode(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase();
}

export function contractCodeSet(contractRows = []) {
  const codes = new Set();
  for (const row of contractRows) {
    const norm = normalizeClientCode(row?.code);
    if (norm) codes.add(norm);
  }
  return codes;
}

function addAmount(pivot, callType, amount) {
  const field = CALL_TYPE_TO_FIELD[callType];
  if (!field) return;
  pivot[field] = roundMoney(pivot[field] + amount);
}

function processEngine12(text, { swappedNameCode, warnings, filename, exclusions, lookup }) {
  const { headers, rows } = parseCsv(text);
  const cols = pickEngine12Columns(headers);
  if (!cols.name || !cols.code || !cols.amount) {
    warnings.push(`${filename}: missing Name/Code/Amount columns`);
    return [];
  }
  const sets = exclusionSets(exclusions);
  const grouped = new Map();
  const unmapped = new Set();
  const missingLookup = new Set();

  for (const row of rows) {
    const duration = cols.duration ? parseAmount(row[cols.duration]) : 1;
    if (duration <= 0) continue;

    const nameVal = row[cols.name] ?? '';
    const codeVal = row[cols.code] ?? '';
    const customerName = swappedNameCode
      ? String(codeVal).trim()
      : customerFromAlbatrossName(nameVal);
    // Engine 1: Code = Smart Edge code. Engine 2 (Porta): Name = client_id, Code = customer name.
    const exportCode = swappedNameCode ? String(nameVal).trim() : String(codeVal).trim();
    const codeFromExport = Boolean(exportCode);
    const clientCode = resolveClientCode(lookup, customerName, exportCode);
    const rawType = cols.callType ? String(row[cols.callType] ?? '') : '';
    const callType = mapCallType(rawType);
    const amount = parseAmount(row[cols.amount]);
    if (!customerName && !clientCode) continue;
    if (amount === 0) continue;
    if (!exportCode && customerName && !clientCode && !missingLookup.has(customerName)) {
      missingLookup.add(customerName);
      warnings.push(`${filename}: no lookup code for "${customerName}" — added to lookup for assignment`);
    }
    if (isExcluded(clientCode, callType, rawType, sets)) continue;
    if (!callType) {
      const label = rawType.trim() || '(empty)';
      if (!unmapped.has(label)) {
        unmapped.add(label);
        warnings.push(`${filename}: skipped unmapped call type "${label}"`);
      }
      continue;
    }

    const key = clientCode
      ? JSON.stringify(['code', clientCode.toLowerCase(), callType])
      : JSON.stringify(['name', customerName.toLowerCase(), callType]);
    const prev = grouped.get(key);
    if (!prev) {
      grouped.set(key, {
        clientCode,
        customerName,
        callType,
        amount,
        codeFromExport,
      });
    } else {
      prev.amount += amount;
      if (codeFromExport && !prev.codeFromExport && customerName) {
        prev.customerName = customerName;
        prev.codeFromExport = true;
      }
    }
  }

  return [...grouped.values()].map((row) => ({
    ...row,
    amount: roundMoney(row.amount),
  }));
}

function processEngine1(text, ctx) {
  return processEngine12(text, { ...ctx, swappedNameCode: false });
}

function processEngine2(text, ctx) {
  return processEngine12(text, { ...ctx, swappedNameCode: true });
}

function processEngine3(text, { lookup, warnings, filename, exclusions }) {
  const { rawRows } = parseCsv(text);
  const headerIdx = rawRows.findIndex((cells) => String(cells[0] || '').trim() === 'Customer Name');
  if (headerIdx < 0) {
    warnings.push(`${filename}: could not find "Customer Name" header row`);
    return [];
  }
  const sets = exclusionSets(exclusions);
  const grouped = new Map();
  const missingLookup = new Set();

  for (const cells of rawRows.slice(headerIdx + 1)) {
    const customerName = String(cells[0] || '').trim();
    if (!customerName) continue;
    const upper = customerName.toUpperCase();
    if (upper === 'SUBTOTAL' || upper === 'TOTAL' || upper.startsWith('SUBTOTAL') || upper.startsWith('TOTAL')) {
      continue;
    }
    const amount = parseAmount(cells[2]);
    if (amount === 0) continue;
    const clientCode = resolveClientCode(lookup, customerName, '');
    if (!clientCode && !missingLookup.has(customerName)) {
      missingLookup.add(customerName);
      warnings.push(`${filename}: no Engine 3 lookup for "${customerName}" — added to lookup for assignment`);
    }
    if (isExcluded(clientCode, 'VCE', customerName, sets)) continue;
    const key = clientCode
      ? JSON.stringify(['code', clientCode.toLowerCase(), 'VCE'])
      : JSON.stringify(['name', customerName.toLowerCase(), 'VCE']);
    const prev = grouped.get(key);
    if (!prev) {
      grouped.set(key, {
        clientCode,
        customerName,
        callType: 'VCE',
        amount,
        codeFromExport: false,
      });
    } else {
      prev.amount += amount;
    }
  }

  return [...grouped.values()].map((row) => ({
    ...row,
    amount: roundMoney(row.amount),
  }));
}

function pivotLines(parts) {
  const byClient = new Map();
  for (const part of parts) {
    const code = String(part.clientCode || '').trim();
    const name = String(part.customerName || '').trim();
    if (!code && !name) continue;
    const key = code ? `code:${code.toLowerCase()}` : `name:${name.toLowerCase()}`;
    if (!byClient.has(key)) {
      const row = emptyPivot(code, name);
      row.namedFromExportCode = Boolean(part.codeFromExport);
      byClient.set(key, row);
    } else {
      const row = byClient.get(key);
      if (code && !row.clientCode) row.clientCode = code;
      if (part.codeFromExport && !row.namedFromExportCode && name) {
        row.customerName = name;
        row.namedFromExportCode = true;
      } else if (!row.customerName && name) {
        row.customerName = name;
      }
    }
    addAmount(byClient.get(key), part.callType, part.amount);
  }
  return [...byClient.values()]
    .map(({ namedFromExportCode, ...row }) => row)
    .sort((a, b) =>
      String(a.customerName).localeCompare(String(b.customerName), undefined, { sensitivity: 'base' })
    );
}

/**
 * @param {{ name: string, text: string, engine?: string|null }[]} files
 * @param {{ lookup?: Record<string, string>, exclusions?: { categories?: string[], codes?: Array<string|{value:string}> } }} ctx
 */
export function processBillingFiles(files, ctx = {}) {
  const warnings = [];
  const parts = [];
  const lookup = { ...(ctx.lookup || {}) };
  const exclusions = ctx.exclusions || { categories: [], codes: [] };

  for (const file of files) {
    const engine = file.engine ?? detectEngine(file.name);
    if (!engine) {
      warnings.push(`${file.name}: could not detect engine from filename`);
      continue;
    }
    if (engine === 'engine1') {
      const produced = processEngine1(file.text, { warnings, filename: file.name, exclusions, lookup });
      logEngineParts(file.name, engine, produced);
      parts.push(...produced);
    } else if (engine === 'engine2') {
      const produced = processEngine2(file.text, { warnings, filename: file.name, exclusions, lookup });
      logEngineParts(file.name, engine, produced);
      parts.push(...produced);
    } else if (engine === 'engine3') {
      const produced = processEngine3(file.text, { lookup, warnings, filename: file.name, exclusions });
      logEngineParts(file.name, engine, produced);
      parts.push(...produced);
    }
  }

  const lines = pivotLines(parts);
  logMergedLines(lines, 'after engine merge');
  return { lines, warnings, lookup };
}

export function mergeBillingAmounts(target, source) {
  target.mobile = roundMoney((target.mobile || 0) + (source.mobile || 0));
  target.international = roundMoney((target.international || 0) + (source.international || 0));
  target.national = roundMoney((target.national || 0) + (source.national || 0));
  target.local = roundMoney((target.local || 0) + (source.local || 0));
  target.special = roundMoney((target.special || 0) + (source.special || 0));
  target.virtual = roundMoney((target.virtual || 0) + (source.virtual || 0));
  target.vce = roundMoney((target.vce || 0) + (source.vce || 0));
}

/**
 * Match pivoted billing to Smart Edge contract rows by Code.
 * Any billing row whose code is missing from the contract is unmatched,
 * including Engine 1 / Engine 2 rows that already have an export code.
 */
export function mergeWithContracts(billingLines, contractRows, warnings = [], exclusions = {}, lookup = {}) {
  const contractNorms = contractCodeSet(contractRows);
  const sets = exclusionSets(exclusions);
  const billingByNorm = new Map();
  const unmatched = [];

  const codeIsExcluded = (norm) => Boolean(norm) && sets.codes.has(norm);
  const categoryIsExcluded = (category) => {
    const cat = String(category || '').trim().toLowerCase();
    return isAutoExcludedCategory(category) || (cat && sets.categories.has(cat));
  };

  for (const line of billingLines) {
    const mapped = lookupCode(lookup, line.customerName);
    const raw = String(mapped || line.clientCode || '').trim();
    const norm = normalizeClientCode(raw);
    if (norm && contractNorms.has(norm)) {
      if (!billingByNorm.has(norm)) {
        billingByNorm.set(norm, {
          ...emptyPivot(raw, line.customerName, line.category || ''),
          ...line,
          clientCode: raw,
        });
      } else {
        mergeBillingAmounts(billingByNorm.get(norm), line);
      }
      continue;
    }
    const excluded = codeIsExcluded(norm);
    unmatched.push({
      ...line,
      clientCode: raw,
      category: line.category || '',
      excluded,
      unmatched: !excluded,
      noActivity: false,
    });
    if (!excluded) {
      warnings.push(
        raw
          ? `Billing code ${raw} is not in the contract report`
          : `Billing row "${line.customerName}" has no code in the contract report`
      );
    }
  }

  const matched = [];
  for (const contract of contractRows) {
    const raw = String(contract.code || '').trim();
    const norm = normalizeClientCode(raw);
    if (!norm) continue;
    const billing = billingByNorm.get(norm);
    const category = contract.category || '';
    const excluded = categoryIsExcluded(category) || codeIsExcluded(norm);
    const row = {
      ...(billing || emptyPivot(raw, contract.customerName, category)),
      clientCode: raw,
      customerName: contract.customerName || billing?.customerName || '',
      category,
      excluded,
      unmatched: false,
    };
    row.noActivity = !excluded && lineTotal(row) === 0;
    matched.push(row);
  }

  unmatched.sort((a, b) =>
    String(a.customerName).localeCompare(String(b.customerName), undefined, { sensitivity: 'base' })
  );

  return [...matched, ...unmatched];
}

/**
 * Fold an unmatched billing row into a contract row identified by Smart Edge code.
 * In-memory only; does not call the API.
 */
export function mergeUnmatchedIntoCode(lines, sourceIndex, targetCode) {
  const code = String(targetCode || '').trim();
  if (!code) return { ok: false, error: 'Enter a Smart Edge code' };
  const source = lines[sourceIndex];
  if (!source || !source.unmatched) {
    return { ok: false, error: 'That row is not flagged as not on contract' };
  }
  const want = code.toLowerCase();
  const sourceCode = String(source.clientCode || '').trim().toLowerCase();
  if (sourceCode && sourceCode === want) {
    return { ok: false, error: 'Choose a different contract code' };
  }
  const targetIndex = lines.findIndex((line, i) => {
    if (i === sourceIndex) return false;
    if (line.unmatched || line.excluded) return false;
    return String(line.clientCode || '').trim().toLowerCase() === want;
  });
  if (targetIndex < 0) {
    const excludedHit = lines.some(
      (line, i) =>
        i !== sourceIndex &&
        line.excluded &&
        String(line.clientCode || '').trim().toLowerCase() === want
    );
    if (excludedHit) {
      return { ok: false, error: `Code ${code} is excluded from the save (Data/Top Up)` };
    }
    return { ok: false, error: `No contract row found for code ${code}` };
  }
  const next = lines.map((line, i) => (i === targetIndex ? { ...line } : line));
  const target = next[targetIndex];
  mergeBillingAmounts(target, source);
  target.noActivity = false;
  next.splice(sourceIndex, 1);
  return { ok: true, lines: next, targetCode: target.clientCode };
}

export function lineTotal(line) {
  return roundMoney(
    (line.mobile || 0) +
      (line.international || 0) +
      (line.national || 0) +
      (line.local || 0) +
      (line.special || 0) +
      (line.virtual || 0) +
      (line.vce || 0)
  );
}
