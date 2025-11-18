// metrics.utils.js
// General utilities: standard deviation and number formatting.

export function standardDeviation(arr = []) {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  const nums = arr.map(n => Number(n) || 0);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}
