/**
 * Indian Standard Time (IST, UTC+5:30) and local date-only utilities.
 * Never uses toISOString().split('T')[0] which flips the day between 00:00 and 05:30 IST.
 */

export function getTodayDateStr(): string {
  // Use Intl with Asia/Kolkata timezone to get accurate IST date
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date()); // Formats as YYYY-MM-DD
  } catch {
    return formatLocalDate(new Date());
  }
}

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length < 3) return new Date(dateStr);
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  // Noon prevents any midnight edge or DST anomaly
  return new Date(y, m, d, 12, 0, 0);
}

export function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const d1 = parseLocalDate(checkIn).getTime();
  const d2 = parseLocalDate(checkOut).getTime();
  const diffMs = d2 - d1;
  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, nights);
}

export function isCheckOutAfterCheckIn(checkIn: string, checkOut: string): boolean {
  if (!checkIn || !checkOut) return false;
  return checkOut > checkIn;
}

export function fmtDisplayDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function fmtFullDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
