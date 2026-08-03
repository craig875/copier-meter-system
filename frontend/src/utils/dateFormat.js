/**
 * Fixed date/time display helpers — no locale / Intl dependency.
 *
 * formatDate: calendar day as dd/mm/yyyy (date-only safe: no local TZ day-shift).
 * formatDateTime: local wall-clock as dd/mm/yyyy HH:mm.
 * formatDateFriendly: prose calendar day as "d MMM yyyy" (e.g. 3 Aug 2026).
 */

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const EMPTY = '—';

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Calendar Y/M/D for date-only display.
 * Prefers YYYY-MM-DD prefix (and UTC parts for midnight-UTC Date / ISO) so
 * @db.Date values do not shift when the browser is west of UTC.
 */
function calendarParts(value) {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
    }
  }

  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return null;

  // Midnight UTC → treat as calendar date in UTC (typical Prisma @db.Date JSON).
  if (
    dt.getUTCHours() === 0 &&
    dt.getUTCMinutes() === 0 &&
    dt.getUTCSeconds() === 0 &&
    dt.getUTCMilliseconds() === 0
  ) {
    return {
      y: dt.getUTCFullYear(),
      mo: dt.getUTCMonth() + 1,
      d: dt.getUTCDate(),
    };
  }

  return {
    y: dt.getFullYear(),
    mo: dt.getMonth() + 1,
    d: dt.getDate(),
  };
}

function localDateTimeParts(value) {
  if (value == null || value === '') return null;
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return {
    y: dt.getFullYear(),
    mo: dt.getMonth() + 1,
    d: dt.getDate(),
    h: dt.getHours(),
    mi: dt.getMinutes(),
  };
}

/** @param {unknown} value @returns {string} dd/mm/yyyy or — */
export function formatDate(value) {
  const p = calendarParts(value);
  if (!p) return EMPTY;
  return `${pad2(p.d)}/${pad2(p.mo)}/${p.y}`;
}

/** @param {unknown} value @returns {string} dd/mm/yyyy HH:mm (local) or — */
export function formatDateTime(value) {
  const p = localDateTimeParts(value);
  if (!p) return EMPTY;
  return `${pad2(p.d)}/${pad2(p.mo)}/${p.y} ${pad2(p.h)}:${pad2(p.mi)}`;
}

/** @param {unknown} value @returns {string} d MMM yyyy or — */
export function formatDateFriendly(value) {
  const p = calendarParts(value);
  if (!p) return EMPTY;
  return `${p.d} ${MONTHS_SHORT[p.mo - 1]} ${p.y}`;
}
