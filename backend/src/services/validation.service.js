/**
 * Validation Service - Validates meter readings against business rules
 * Single Responsibility: Validation logic
 * Open/Closed Principle: Easy to extend with new validation rules
 */

import {
  isUnableToRead,
  hasReadingValues,
  validateEnabledCountersComplete,
  validateUnableToReadReading,
} from '../utils/reading-completeness.js';

const UNCHANGED_REASON_FIELDS = {
  monoReading: 'monoUnchangedReason',
  colourReading: 'colourUnchangedReason',
  scanReading: 'scanUnchangedReason',
};

const COUNTER_LABELS = {
  monoReading: 'Mono',
  colourReading: 'Colour',
  scanReading: 'Scan',
};

/**
 * Validate a single meter reading value
 * @param {number|null} currentValue
 * @param {number|null} previousValue
 * @param {string} fieldName
 * @param {string|null|undefined} unchangedReason
 * @returns {Object|null} Error object or null
 */
const validateMeterReading = (currentValue, previousValue, fieldName, unchangedReason) => {
  if (currentValue == null || previousValue == null) {
    return null;
  }

  if (currentValue < previousValue) {
    return {
      field: fieldName,
      message: `${COUNTER_LABELS[fieldName] || fieldName} reading (${currentValue}) cannot be less than previous month (${previousValue})`,
      currentValue,
      previousValue,
    };
  }

  if (currentValue === previousValue) {
    const reason = typeof unchangedReason === 'string' ? unchangedReason.trim() : '';
    if (reason.length > 0) {
      return null;
    }
    return {
      field: fieldName,
      message: `${COUNTER_LABELS[fieldName] || fieldName} reading (${currentValue}) matches previous month (${previousValue}). Provide a reason confirming zero usage for this counter.`,
      currentValue,
      previousValue,
      requiresUnchangedReason: true,
    };
  }

  return null;
};

/**
 * Validate that reading is only provided for enabled meter types
 * @param {boolean} enabled
 * @param {number|null} value
 * @param {string} fieldName
 * @returns {Object|null} Error object or null
 */
const validateMeterEnabled = (enabled, value, fieldName) => {
  if (!enabled && value != null) {
    return {
      field: fieldName,
      message: `${COUNTER_LABELS[fieldName] || fieldName} reading not applicable for this machine`,
    };
  }
  return null;
};

/**
 * Validate a single reading against machine configuration and previous reading
 * @param {Object} reading - Reading input
 * @param {Object} machine - Machine configuration
 * @param {Object|null} prevReading - Previous month's reading
 * @returns {Array} Array of errors
 */
export const validateSingleReading = (reading, machine, prevReading) => {
  const errors = [];

  if (!machine) {
    return [{
      machineId: reading.machineId,
      field: 'machineId',
      message: 'Machine not found',
    }];
  }

  if (isUnableToRead(reading)) {
    const unableErrors = validateUnableToReadReading(reading);
    return unableErrors.map((error) => ({
      machineId: reading.machineId,
      machineSerialNumber: machine.machineSerialNumber,
      ...error,
    }));
  }

  const completenessErrors = validateEnabledCountersComplete(reading, machine);
  for (const error of completenessErrors) {
    errors.push({
      machineId: reading.machineId,
      machineSerialNumber: machine.machineSerialNumber,
      ...error,
    });
  }
  if (completenessErrors.length > 0) {
    return errors;
  }

  if (machine.monoEnabled && reading.monoReading != null) {
    const error = validateMeterReading(
      reading.monoReading,
      prevReading?.monoReading,
      'monoReading',
      reading.monoUnchangedReason
    );
    if (error) {
      errors.push({
        machineId: reading.machineId,
        machineSerialNumber: machine.machineSerialNumber,
        ...error,
      });
    }
  }

  if (machine.colourEnabled && reading.colourReading != null) {
    const error = validateMeterReading(
      reading.colourReading,
      prevReading?.colourReading,
      'colourReading',
      reading.colourUnchangedReason
    );
    if (error) {
      errors.push({
        machineId: reading.machineId,
        machineSerialNumber: machine.machineSerialNumber,
        ...error,
      });
    }
  }

  if (machine.scanEnabled && reading.scanReading != null) {
    const error = validateMeterReading(
      reading.scanReading,
      prevReading?.scanReading,
      'scanReading',
      reading.scanUnchangedReason
    );
    if (error) {
      errors.push({
        machineId: reading.machineId,
        machineSerialNumber: machine.machineSerialNumber,
        ...error,
      });
    }
  }

  const monoError = validateMeterEnabled(machine.monoEnabled, reading.monoReading, 'monoReading');
  if (monoError) {
    errors.push({
      machineId: reading.machineId,
      machineSerialNumber: machine.machineSerialNumber,
      ...monoError,
    });
  }

  const colourError = validateMeterEnabled(machine.colourEnabled, reading.colourReading, 'colourReading');
  if (colourError) {
    errors.push({
      machineId: reading.machineId,
      machineSerialNumber: machine.machineSerialNumber,
      ...colourError,
    });
  }

  const scanError = validateMeterEnabled(machine.scanEnabled, reading.scanReading, 'scanReading');
  if (scanError) {
    errors.push({
      machineId: reading.machineId,
      machineSerialNumber: machine.machineSerialNumber,
      ...scanError,
    });
  }

  return errors;
};

/**
 * Validates meter readings against business rules
 * @param {Array} readings - Array of reading inputs
 * @param {Map} machineMap - Map of machineId -> machine
 * @param {Map} previousReadingMap - Map of machineId -> previous reading
 * @returns {{ valid: boolean, errors: Array }}
 */
export const validateReadings = (readings, machineMap, previousReadingMap) => {
  const errors = [];

  for (const reading of readings) {
    const machine = machineMap.get(reading.machineId);

    if (!machine) {
      errors.push({
        machineId: reading.machineId,
        field: 'machineId',
        message: 'Machine not found',
      });
      continue;
    }

    if (isUnableToRead(reading)) {
      const readingErrors = validateSingleReading(reading, machine, null);
      errors.push(...readingErrors);
      continue;
    }

    if (!hasReadingValues(reading)) {
      const completenessErrors = validateEnabledCountersComplete(reading, machine);
      errors.push(...completenessErrors.map((error) => ({
        machineId: reading.machineId,
        machineSerialNumber: machine.machineSerialNumber,
        ...error,
      })));
      continue;
    }

    const prevReading = previousReadingMap.get(reading.machineId);
    const readingErrors = validateSingleReading(reading, machine, prevReading);
    errors.push(...readingErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export { UNCHANGED_REASON_FIELDS, COUNTER_LABELS };
