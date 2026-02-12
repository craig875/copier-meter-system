/**
 * Consumable yield validation and charge calculation
 * Formulas per scope document
 */

/**
 * Calculate yield compliance and charges for general (non-toner) parts
 * @param {number} usage - Current reading - prior reading
 * @param {number} expectedYield - Expected yield in clicks
 * @param {number} costRand - Cost per part in Rand
 * @returns {{ yieldMet: boolean, shortfallClicks: number, adjustedShortfallClicks: number, costPerClick: number, displayChargeRand: number }}
 */
export function calcGeneralPart(usage, expectedYield, costRand) {
  const yieldMet = usage >= expectedYield;
  const shortfallClicks = yieldMet ? 0 : expectedYield - usage;
  const adjustedShortfallClicks = shortfallClicks; // No adjustment for general parts
  const costPerClick = expectedYield > 0 ? costRand / expectedYield : 0;
  const displayChargeRand = adjustedShortfallClicks * costPerClick;
  return {
    yieldMet,
    shortfallClicks,
    adjustedShortfallClicks,
    costPerClick,
    displayChargeRand,
  };
}

/**
 * Calculate yield compliance and charges for toner (with % deduction)
 * @param {number} usage - Current reading - prior reading
 * @param {number} expectedYield - Expected yield in clicks
 * @param {number} costRand - Cost per part in Rand
 * @param {number} remainingTonerPercent - Remaining toner % at order time (0-100)
 * @returns {{ yieldMet: boolean, shortfallClicks: number, adjustedShortfallClicks: number, costPerClick: number, displayChargeRand: number }}
 */
export function calcTonerPart(usage, expectedYield, costRand, remainingTonerPercent = 0) {
  const yieldMet = usage >= expectedYield;
  const shortfallClicks = yieldMet ? 0 : expectedYield - usage;
  const deduction = shortfallClicks * (Math.min(100, Math.max(0, remainingTonerPercent)) / 100);
  const adjustedShortfallClicks = Math.round(shortfallClicks - deduction);
  const costPerClick = expectedYield > 0 ? costRand / expectedYield : 0;
  const displayChargeRand = adjustedShortfallClicks * costPerClick;
  return {
    yieldMet,
    shortfallClicks,
    adjustedShortfallClicks: Math.max(0, adjustedShortfallClicks),
    costPerClick,
    displayChargeRand,
  };
}
