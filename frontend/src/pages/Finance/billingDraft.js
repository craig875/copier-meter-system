import { storedToItem } from './billingImportSession';
import { billingLineAmount, BILLING_LINE_TYPES } from './billingLineSets';

export function dbLineToImportLine(line) {
  const lineType = String(line?.lineType || BILLING_LINE_TYPES.billed);
  const excluded = lineType === BILLING_LINE_TYPES.excluded;
  const unmatched = lineType === BILLING_LINE_TYPES.unmatched;
  const amount = billingLineAmount(line);
  const noActivity =
    !excluded &&
    !unmatched &&
    (lineType === BILLING_LINE_TYPES.noActivity || amount === 0);

  return {
    clientCode: line.clientCode || '',
    customerName: line.customerName || '',
    category: line.category || '',
    mobile: line.mobile || 0,
    international: line.international || 0,
    national: line.national || 0,
    local: line.local || 0,
    special: line.special || 0,
    virtual: line.virtual || 0,
    vce: line.vce || 0,
    lineTotal: line.lineTotal != null ? Number(line.lineTotal) : amount,
    excluded,
    unmatched,
    noActivity,
  };
}

export function confirmedCodesFromDbLines(lines = []) {
  return lines
    .filter((line) => line.confirmed && String(line.clientCode || '').trim())
    .map((line) => String(line.clientCode).trim().toLowerCase());
}

export function draftFilesToImportItems(files = []) {
  return (files || [])
    .map((file, index) => {
      const filename = file.filename || file.name;
      if (!filename) return null;
      const encoding = file.encoding === 'base64' ? 'base64' : 'text';
      return storedToItem({
        id: `${filename}-${file.id || index}`,
        engine: file.engine || 'unknown',
        payload: {
          name: filename,
          type:
            file.contentType ||
            (encoding === 'text'
              ? 'text/csv'
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
          encoding,
          content: file.content || '',
          lastModified: Date.now(),
          size: String(file.content || '').length,
        },
      });
    })
    .filter(Boolean);
}

export function itemsToDraftFiles(items = []) {
  return items
    .map((item) => {
      const payload = item.payload;
      if (!payload?.content && payload?.content !== '') return null;
      return {
        filename: item.file?.name || payload.name,
        engine: item.engine,
        content: payload.content,
        encoding: payload.encoding === 'base64' ? 'base64' : 'text',
        contentType: payload.type || null,
      };
    })
    .filter(Boolean);
}
