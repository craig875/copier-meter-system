/**
 * Collapse duplicate make/model names in a catalog list.
 */
export function dedupeMakesCatalog(makes) {
  if (!Array.isArray(makes) || makes.length === 0) return makes || [];
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

/**
 * Catalog rows returned by GET /makes are already scoped server-side.
 * Only hide rows when we know the cache is from a different site.
 * @param {{ makes?: Array, site?: string|null, needsBranch?: boolean, linkedCatalog?: boolean }|null|undefined} apiResult
 * @param {string|null|undefined} site
 */
export function catalogMakesFromApi(apiResult, site) {
  if (apiResult?.needsBranch) return [];
  const rows = apiResult?.makes;
  if (!Array.isArray(rows)) return [];
  let result = rows;
  if (apiResult?.linkedCatalog) result = rows;
  else if (!site) result = rows;
  else if (apiResult?.site === site) result = rows;
  else if (apiResult?.site == null) result = rows;
  else result = [];
  return dedupeMakesCatalog(result);
}

export function filterCatalogBySite(items, site) {
  if (!site || !Array.isArray(items)) return items || [];
  if (!items.some((item) => item?.branch != null && item.branch !== '')) {
    return items;
  }
  return items.filter((item) => item.branch === site);
}

/**
 * Models inherit site from their parent make.
 * @param {Array<{ make?: { branch?: string } }>|null|undefined} models
 * @param {string|null|undefined} site
 */
export function filterModelsBySite(models, site) {
  if (!site || !Array.isArray(models)) return models || [];
  return models.filter((model) => model.make?.branch === site);
}

/** Physical copiers — filter list by branch column. */
export function filterMachinesBySite(machines, site) {
  if (!site || !Array.isArray(machines)) return machines || [];
  return machines.filter((machine) => machine.branch === site);
}

/** Trust server-scoped GET /machines; only drop rows on known cross-site cache. */
export function machinesFromApi(data, site) {
  if (data?.needsBranch) return [];
  const rows = data?.machines;
  if (!Array.isArray(rows)) return [];
  if (!site) return rows;
  if (data?.site === site) return rows;
  if (data?.site == null) return rows;
  return filterMachinesBySite(rows, site);
}
