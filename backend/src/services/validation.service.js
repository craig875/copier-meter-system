/**
 * Validation Service - Validates meter readings against business rules
 * Single Responsibility: Validation logic
 * Open/Closed Principle: Easy to extend with new validation rules
 */

/**
 * Validate a single meter reading value
 * @param {number|null} currentValue
 * @param {number|null} previousValue
 * @param {string} fieldName
 * @param {string} machineSerialNumber
 * @returns {Object|null} Error object or null
 */
const validateMeterReading = (currentValue, previousValue, fieldName, machineSerialNumber) => {
  if (currentValue == null || previousValue == null) {
    return null;
  }

  if (currentValue < previousValue) {
    return {
      field: fieldName,
      message: `${fieldName} reading (${currentValue}) cannot be less than previous month (${previousValue})`,
      currentValue,
      previousValue,
    };
  }

  if (currentValue === previousValue) {
    return {
      field: fieldName,
      message: `${fieldName} reading (${currentValue}) cannot be the same as previous month (${previousValue}). Reading must increase.`,
      currentValue,
      previousValue,
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
      message: `${fieldName} reading not applicable for this machine`,
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
const validateSingleReading = (reading, machine, prevReading) => {
  const errors = [];

  // Validate machine exists
  if (!machine) {
    return [{
      machineId: reading.machineId,
      field: 'machineId',
      message: 'Machine not found',
    }];
  }

  // Validate mono reading
  if (machine.monoEnabled && reading.monoReading != null) {
    const error = validateMeterReading(
      reading.monoReading,
      prevReading?.monoReading,
      'monoReading',
      machine.machineSerialNumber
    );
    if (error) {
      errors.push({
        machineId: reading.machineId,
        machineSerialNumber: machine.machineSerialNumber,
        ...error,
      });
    }
  }

  // Validate colour reading
  if (machine.colourEnabled && reading.colourReading != null) {
    const error = validateMeterReading(
      reading.colourReading,
      prevReading?.colourReading,
      'colourReading',
      machine.machineSerialNumber
    );
    if (error) {
      errors.push({
        machineId: reading.machineId,
        machineSerialNumber: machine.machineSerialNumber,
        ...error,
      });
    }
  }

  // Validate scan reading
  if (machine.scanEnabled && reading.scanReading != null) {
    const error = validateMeterReading(
      reading.scanReading,
      prevReading?.scanReading,
      'scanReading',
      machine.machineSerialNumber
    );
    if (error) {
      errors.push({
        machineId: reading.machineId,
        machineSerialNumber: machine.machineSerialNumber,
        ...error,
      });
    }
  }

  // Validate enabled meter types
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
 * Check if a reading has any actual reading values (not just a note)
 * @param {Object} reading - Reading input
 * @returns {boolean}
 */
const hasReadingValues = (reading) => {
  return reading.monoReading != null || 
         reading.colourReading != null || 
         reading.scanReading != null;
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
    
    // If machine doesn't exist, that's an error
    if (!machine) {
      errors.push({
        machineId: reading.machineId,
        field: 'machineId',
        message: 'Machine not found',
      });
      continue;
    }

    // If reading only has a note (no actual reading values), skip validation
    // This allows users to save notes when unable to retrieve readings
    if (!hasReadingValues(reading)) {
      // Only validate that we have at least a note
      if (!reading.note || (typeof reading.note === 'string' && reading.note.trim().length === 0)) {
        errors.push({
          machineId: reading.machineId,
          field: 'note',
          message: 'Either reading values or a note must be provided',
        });
      }
      continue; // Skip reading value validation
    }

    // Validate reading values if they exist
    const prevReading = previousReadingMap.get(reading.machineId);
    const readingErrors = validateSingleReading(reading, machine, prevReading);
    errors.push(...readingErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
