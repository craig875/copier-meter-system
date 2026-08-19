const keyFor = (branch) => `finance.billingImport.${branch || 'none'}`;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunks = [];
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + size)));
  }
  return btoa(chunks.join(''));
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function fileToPayload(file) {
  const name = file.name;
  const type = file.type || '';
  const lastModified = file.lastModified;
  const size = file.size;
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv')) {
    return {
      name,
      type: type || 'text/csv',
      lastModified,
      size,
      encoding: 'text',
      content: await file.text(),
    };
  }
  return {
    name,
    type: type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified,
    size,
    encoding: 'base64',
    content: arrayBufferToBase64(await file.arrayBuffer()),
  };
}

export function payloadToFile(payload) {
  const type = payload.type || (payload.encoding === 'text' ? 'text/csv' : 'application/octet-stream');
  if (payload.encoding === 'text') {
    return new File([payload.content || ''], payload.name, { type, lastModified: payload.lastModified });
  }
  return new File([base64ToUint8Array(payload.content || '')], payload.name, {
    type,
    lastModified: payload.lastModified,
  });
}

export function itemToStored(item) {
  return {
    id: item.id,
    engine: item.engine,
    contractRows: item.contractRows || null,
    payload: item.payload,
  };
}

export function storedToItem(stored) {
  if (!stored?.payload) return null;
  return {
    id: stored.id,
    engine: stored.engine,
    contractRows: stored.contractRows || undefined,
    payload: stored.payload,
    file: payloadToFile(stored.payload),
  };
}

export function loadBillingImportSession(branch) {
  try {
    const raw = sessionStorage.getItem(keyFor(branch));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const items = (parsed.items || []).map(storedToItem).filter(Boolean);
    return {
      items,
      lines: Array.isArray(parsed.lines) ? parsed.lines : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      period: parsed.period || null,
      confirmedCodes: Array.isArray(parsed.confirmedCodes) ? parsed.confirmedCodes : [],
    };
  } catch {
    return null;
  }
}

export function saveBillingImportSession(branch, snapshot) {
  try {
    sessionStorage.setItem(
      keyFor(branch),
      JSON.stringify({
        items: (snapshot.items || []).map(itemToStored),
        lines: snapshot.lines || [],
        warnings: snapshot.warnings || [],
        period: snapshot.period || null,
        confirmedCodes: snapshot.confirmedCodes || [],
      })
    );
    return true;
  } catch {
    return false;
  }
}

export function clearBillingImportSession(branch) {
  try {
    sessionStorage.removeItem(keyFor(branch));
  } catch {
    /* ignore */
  }
}
