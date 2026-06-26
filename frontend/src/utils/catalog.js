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
  if (apiResult?.linkedCatalog) return rows;
  if (!site) return rows;
  if (apiResult?.site === site) return rows;
  if (apiResult?.site == null) return rows;
  return [];
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
