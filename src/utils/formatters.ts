export const FY_MONTHS = [
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
  'Jan',
  'Feb',
  'Mar',
] as const;

export function formatCurrency(
  amount: number | null | undefined,
  currency: 'INR' | 'USD' | 'EUR' | 'GBP' = 'INR'
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '—';
  }
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(
  amount: number | null | undefined,
  currency: 'INR' | 'USD' | 'EUR' | 'GBP' = 'INR'
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '—';
  }
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';

  if (currency === 'INR') {
    if (abs >= 10000000) {
      return `${sign}${symbol}${(abs / 10000000).toFixed(2)} Cr`;
    }
    if (abs >= 100000) {
      return `${sign}${symbol}${(abs / 100000).toFixed(2)} L`;
    }
    if (abs >= 1000) {
      return `${sign}${symbol}${(abs / 1000).toFixed(1)} K`;
    }
    return `${sign}${symbol}${abs.toFixed(0)}`;
  }

  if (abs >= 1000000) {
    return `${sign}${symbol}${(abs / 1000000).toFixed(2)}M`;
  }
  if (abs >= 1000) {
    return `${sign}${symbol}${(abs / 1000).toFixed(1)}K`;
  }
  return `${sign}${symbol}${abs.toFixed(0)}`;
}

export function formatPercent(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || !Number.isFinite(val)) {
    return 'N/A';
  }
  return `${val.toFixed(decimals)}%`;
}

export function getMonthShortFromDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 2) return 'Apr';
  const monthIdx = Number(parts[1]) - 1;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[monthIdx] ?? 'Apr';
}

export function getIndianFYFromDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 2) return 'FY 2026-27';
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return 'FY 2026-27';
  const startYear = month >= 4 ? year : year - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, '0');
  return `FY ${startYear}-${endShort}`;
}

export function getQuarterFromDate(dateStr: string): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const parts = dateStr.split('-');
  const month = Number(parts[1] ?? 4);
  if (month >= 4 && month <= 6) return 'Q1';
  if (month >= 7 && month <= 9) return 'Q2';
  if (month >= 10 && month <= 12) return 'Q3';
  return 'Q4';
}
