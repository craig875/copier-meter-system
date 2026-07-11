import { matchPath } from 'react-router-dom';

/**
 * Safe internal "from" for back navigation (not login redirect, not external).
 * Accepts a path string or a location-like { pathname, search?, hash? }.
 */
export function isSafeFrom(from) {
  if (from == null) return false;
  if (typeof from === 'string') {
    return from.startsWith('/') && !from.startsWith('//');
  }
  if (typeof from === 'object' && typeof from.pathname === 'string') {
    return from.pathname.startsWith('/') && !from.pathname.startsWith('//');
  }
  return false;
}

/** Normalize location.state.from to a path string for navigate(). */
export function normalizeFrom(from) {
  if (!isSafeFrom(from)) return null;
  if (typeof from === 'string') return from;
  return `${from.pathname}${from.search || ''}${from.hash || ''}`;
}

/**
 * Build { from } from the current location for Link/navigate state.
 * Merge with extra keys (e.g. fromFibreOrder) via mergeNavigationState.
 */
export function buildFromState(location) {
  return {
    from: {
      pathname: location.pathname,
      search: location.search || '',
      hash: location.hash || '',
    },
  };
}

/**
 * Merge current location into navigation state without dropping other keys
 * (e.g. fromFibreOrder prefill).
 */
export function mergeNavigationState(location, extra = {}) {
  return {
    ...extra,
    ...buildFromState(location),
  };
}

/**
 * Resolve where Back should go: honour location.state.from when safe, else fallback.
 */
export function resolveBackTarget(location, fallback) {
  const normalized = normalizeFrom(location?.state?.from);
  if (normalized) return normalized;
  return fallback;
}

/**
 * Static fallback parent for a pathname when state.from is missing.
 * More specific patterns must come first.
 */
const FALLBACK_RULES = [
  {
    pattern: '/consumables/machines/:machineId/readings',
    fallback: (params) => `/consumables/machines/${params.machineId}`,
  },
  { pattern: '/consumables/machines/:machineId', fallback: '/consumables/summary' },
  { pattern: '/customers/:id', fallback: '/customers' },
  {
    pattern: '/fibre-orders/:id/edit',
    fallback: (params) => `/fibre-orders/${params.id}`,
  },
  { pattern: '/fibre-orders/new', fallback: '/fibre-orders' },
  { pattern: '/fibre-orders/products', fallback: '/fibre-orders' },
  { pattern: '/fibre-orders/completed', fallback: '/fibre-orders' },
  { pattern: '/fibre-orders/list', fallback: '/fibre-orders' },
  { pattern: '/fibre-orders/:id', fallback: '/fibre-orders/list' },
  {
    pattern: '/connectivity/targets/:id/edit',
    fallback: (params) => `/connectivity/targets/${params.id}`,
  },
  { pattern: '/connectivity/targets/new', fallback: '/connectivity/targets' },
  { pattern: '/connectivity/targets/:id', fallback: '/connectivity' },
  { pattern: '/connectivity/targets', fallback: '/connectivity' },
  { pattern: '/connectivity/reports', fallback: '/connectivity' },
  { pattern: '/connectivity/outages', fallback: '/connectivity' },
  { pattern: '/connectivity/time-windows', fallback: '/connectivity' },
  { pattern: '/import-readings', fallback: '/meter-readings' },
  { pattern: '/notifications', fallback: '/' },
  { pattern: '/security', fallback: '/' },
  { pattern: '/capture', fallback: '/meter-readings' },
  { pattern: '/history', fallback: '/meter-readings' },
  { pattern: '/machines', fallback: '/meter-readings' },
  { pattern: '/users', fallback: '/' },
  { pattern: '/admin/parts-pricing', fallback: '/admin/machine-configuration' },
  { pattern: '/admin/machine-configuration', fallback: '/' },
  { pattern: '/admin', fallback: '/' },
  { pattern: '/parts-pricing', fallback: '/' },
  { pattern: '/copier-service', fallback: '/' },
  { pattern: '/meter-readings', fallback: '/' },
  { pattern: '/consumables/summary', fallback: '/copier-service' },
  { pattern: '/customers', fallback: '/copier-service' },
  { pattern: '/fibre-orders', fallback: '/' },
  { pattern: '/connectivity', fallback: '/' },
];

export function getFallbackForPath(pathname) {
  if (!pathname || pathname === '/') return '/';

  for (const rule of FALLBACK_RULES) {
    const match = matchPath({ path: rule.pattern, end: true }, pathname);
    if (!match) continue;
    if (typeof rule.fallback === 'function') {
      return rule.fallback(match.params);
    }
    return rule.fallback;
  }

  return '/';
}

export function resolveBackTargetForLocation(location) {
  const fallback = getFallbackForPath(location.pathname);
  return resolveBackTarget(location, fallback);
}
