/**
 * Reading Calculation Utilities
 * Single Responsibility: Business logic for reading calculations
 */

/**
 * Calculate usage from current and previous readings
 * @param {number|null} currentReading
 * @param {number|null} previousReading
 * @returns {number|null}
 */
export const calculateUsage = (currentReading, previousReading) => {
  if (currentReading == null) return null;
  // If there's no previous reading, this is the first reading - usage should be 0 or null
  if (previousReading == null) return 0;
  return currentReading - previousReading;
};

/**
 * Calculate all usage metrics for a reading
 * @param {Object} reading - Reading input data
 * @param {Object} previousReading - Previous month's reading
 * @returns {Object} Calculated usage data
 */
export const calculateReadingMetrics = (reading, previousReading) => {
  const monoUsage = calculateUsage(reading.monoReading, previousReading?.monoReading);
  const colourUsage = calculateUsage(reading.colourReading, previousReading?.colourReading);
  const scanUsage = calculateUsage(reading.scanReading, previousReading?.scanReading);

  return {
    monoUsage,
    colourUsage,
    scanUsage,
  };
};
