/**
 * Keep catalog lists aligned with the selected app site (JHB/CT).
 * @param {Array<{ branch?: string }>|null|undefined} items
 * @param {string|null|undefined} site
 */
export function filterCatalogBySite(items, site) {
  if (!site || !Array.isArray(items)) return items || [];
  // If API omits branch (older backend), don't hide everything — server filter should still apply.
  if (!items.some((item) => item.branch)) return items;
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
