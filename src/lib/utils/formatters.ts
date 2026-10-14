import { fmtDisplayDate } from './dates';

export function fmtINR(amount: number | string | undefined | null): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * PDF-safe currency format without Unicode glyphs that break standard PDF WinAnsi fonts
 */
export function formatPdfINR(amount: number | string | undefined | null): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return `Rs. ${Math.round(num).toLocaleString('en-IN')}`;
}

export function fmtDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  // If date string contains 'T', extract the YYYY-MM-DD part or format
  const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  return fmtDisplayDate(dateOnly);
}

export function generateId(prefix = ''): string {
  // Use timestamp + random characters to prevent collisions
  const timeSlice = Date.now().toString(36).slice(-4).toUpperCase();
  const randSlice = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timeSlice}${randSlice}`;
}
