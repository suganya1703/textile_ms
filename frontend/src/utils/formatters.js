// Utility formatting functions for Loomdo

/**
 * Format a number into Indian currency representation (e.g. ₹3,29,220.00).
 * Handles numbers, strings, and undefined/null gracefully.
 */
export function formatINR(amount, decimals = 2) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return decimals === 2 ? '₹0.00' : '₹0';
  }
  const num = Number(amount);
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return `₹${formatted}`;
}

/**
 * Format numbers with Indian commas (e.g. 12,450) without currency symbol.
 */
export function formatNumber(val, decimals = 0) {
  if (val === undefined || val === null || isNaN(Number(val))) {
    return '0';
  }
  return Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
