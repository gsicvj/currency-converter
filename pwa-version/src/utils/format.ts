export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

// Rates run from fractions of a cent to thousands, so keep significant
// digits instead of fixed decimals.
export function formatRate(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: 6,
  }).format(value)
}

export function formatChangePercent(percent: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent / 100)
}
