/**
 * Client-side reading completeness checks (mirrors backend rules).
 */

export const ENABLED_COUNTERS = [
  { field: 'monoReading', enabledKey: 'monoEnabled', label: 'Mono' },
  { field: 'colourReading', enabledKey: 'colourEnabled', label: 'Colour' },
  { field: 'scanReading', enabledKey: 'scanEnabled', label: 'Scan' },
];

export function isUnableToReadReading(reading) {
  return reading?.unableToRead === true;
}

export function hasReadingValues(reading) {
  return reading?.monoReading != null
    || reading?.colourReading != null
    || reading?.scanReading != null;
}

export function getMissingEnabledCounters(reading, machine) {
  if (!machine) return [];

  return ENABLED_COUNTERS.flatMap((counter) => {
    if (!machine[counter.enabledKey]) return [];
    if (reading[counter.field] != null) return [];
    return [{
      field: counter.field,
      message: `${counter.label} reading is required for this machine`,
    }];
  });
}

export function validateReadingForSubmit(reading, machine, { canUseUnableToObtain = false } = {}) {
  const errors = [];

  if (isUnableToReadReading(reading)) {
    if (!canUseUnableToObtain) {
      return getMissingEnabledCounters(reading, machine);
    }

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

  return getMissingEnabledCounters(reading, machine);
}

/**
 * Merge edited row state with persisted reading for submit payload.
 */
export function buildReadingPayload(machineId, entry, editedValues) {
  const { machine, currentReading } = entry;
  const reading = {
    machineId,
    monoReading: editedValues?.monoReading !== undefined
      ? editedValues.monoReading
      : currentReading?.monoReading ?? null,
    colourReading: editedValues?.colourReading !== undefined
      ? editedValues.colourReading
      : currentReading?.colourReading ?? null,
    scanReading: editedValues?.scanReading !== undefined
      ? editedValues.scanReading
      : currentReading?.scanReading ?? null,
    note: editedValues?.note !== undefined
      ? editedValues.note
      : currentReading?.note ?? null,
    unableToRead: editedValues?.unableToRead !== undefined
      ? editedValues.unableToRead
      : currentReading?.unableToRead ?? false,
    unableToReadReason: editedValues?.unableToReadReason !== undefined
      ? editedValues.unableToReadReason
      : currentReading?.unableToReadReason ?? null,
  };

  const hasEditedCounters = ['monoReading', 'colourReading', 'scanReading'].some(
    (field) => editedValues?.[field] !== undefined,
  );
  if (editedValues?.unableToRead === true) {
    reading.unableToRead = true;
  } else if (hasEditedCounters || hasReadingValues(reading)) {
    reading.unableToRead = false;
    reading.unableToReadReason = null;
  }

  if (reading.unableToRead) {
    reading.monoReading = null;
    reading.colourReading = null;
    reading.scanReading = null;
    reading.note = null;
  }

  return reading;
}

export function readingRowHasEdits(editedFields) {
  if (!editedFields || Object.keys(editedFields).length === 0) return false;
  return true;
}

export function resolveUnableToRead(currentReading, editedFields) {
  if (editedFields?.unableToRead !== undefined) return editedFields.unableToRead;
  return currentReading?.unableToRead ?? false;
}
