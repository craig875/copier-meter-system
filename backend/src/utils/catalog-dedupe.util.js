/**
 * Collapse duplicate make/model names in a catalog list (display safety net).
 * @param {Array<{ name: string, models?: Array<{ name: string }> }>} makes
 */
export function dedupeMakesCatalog(makes) {
  if (!Array.isArray(makes) || makes.length === 0) return makes;

  const byMakeName = new Map();
  for (const make of makes) {
    const key = make.name.trim().toLowerCase();
    if (!byMakeName.has(key)) {
      byMakeName.set(key, { ...make, models: dedupeModelsByName(make.models) });
      continue;
    }
    const existing = byMakeName.get(key);
    existing.models = dedupeModelsByName([...(existing.models || []), ...(make.models || [])]);
  }

  return [...byMakeName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function dedupeModelsByName(models) {
  if (!Array.isArray(models)) return [];
  const byName = new Map();
  for (const model of models) {
    const key = model.name.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, model);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
