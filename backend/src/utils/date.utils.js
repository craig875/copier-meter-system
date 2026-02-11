/**
 * Date Utility Functions
 * Single Responsibility: Date-related calculations
 */

/**
 * Get previous month from given year and month
 * @param {number} year
 * @param {number} month
 * @returns {{year: number, month: number}}
 */
export const getPreviousMonth = (year, month) => {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
};

/**
 * Get current year and month
 * @returns {{year: number, month: number}}
 */
export const getCurrentPeriod = () => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
};
