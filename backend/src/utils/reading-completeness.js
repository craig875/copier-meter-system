/**
 * Enabled-counter completeness and "unable to obtain" reading rules.
 */

export const ENABLED_COUNTERS = [
  { field: 'monoReading', enabledKey: 'monoEnabled', label: 'Mono' },
  { field: 'colourReading', enabledKey: 'colourEnabled', label: 'Colour' },
  { field: 'scanReading', enabledKey: 'scanEnabled', label: 'Scan' },
];

export function isUnableToRead(reading) {
  return reading?.unableToRead === true;
}

/**
 * Consecutive Unable-to-obtain is blocked on the normal capture path
 * when the previous month's reading was also unable-to-obtain.
 */
export function isConsecutiveUnableToReadBlocked(previousReading) {
  return previousReading?.unableToRead === true;
}

export const CONSECUTIVE_UNABLE_TO_READ_MESSAGE =
  'Unable to obtain is not allowed for two consecutive months. An administrator must force-approve via Admin Tools → Unable to Obtain Overrides.';

export function hasReadingValues(reading) {
  return reading.monoReading != null
    || reading.colourReading != null
    || reading.scanReading != null;
}

/**
 * All enabled counters must be present when not flagged unable-to-read.
 */
export function validateEnabledCountersComplete(reading, machine) {
  const errors = [];
  if (!machine) return errors;

  for (const counter of ENABLED_COUNTERS) {
    if (machine[counter.enabledKey] && reading[counter.field] == null) {
      errors.push({
        field: counter.field,
        message: `${counter.label} reading is required for this machine`,
      });
    }
  }
  return errors;
}

export function validateUnableToReadReading(reading) {
  const errors = [];
  const reason = typeof reading.unableToReadReason === 'string'
    ? reading.unableToReadReason.trim()
    : '';

  if (!reason) {
    errors.push({
      field: 'unableToReadReason',
      message: 'Reason is required when Unable to obtain is selected',
    });
  }

  for (const counter of ENABLED_COUNTERS) {
    if (reading[counter.field] != null) {
      errors.push({
        field: counter.field,
        message: 'Counter values cannot be saved when Unable to obtain is selected',
      });
    }
  }

  return errors;
}

export function parseUnableToReadFlag(value) {
  if (value == null || value === '') return false;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === '1' || normalized === 'y';
}
