import { COMPANY_HOLIDAYS } from './constants';

export const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export function floorTwoDecimals(value: number): number {
  return Math.floor(value * 100) / 100;
}

export function calculateDurationDays(startIso: string, endIso: string): number {
  if (!startIso || !endIso) {
    return 0;
  }

  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }

  if (end <= start) {
    return floorTwoDecimals((end - start) / DAY_MS);
  }

  let includedHours = 0;
  let cursor = start;

  while (cursor < end) {
    const date = new Date(cursor);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayEnd = dayStart + DAY_MS;
    const segmentEnd = Math.min(dayEnd, end);
    const day = new Date(dayStart).getDay();
    const dayKey = toDateKey(dayStart);
    const isWeekend = day === 0 || day === 6;
    const isHoliday = COMPANY_HOLIDAYS.includes(dayKey);

    if (!isWeekend && !isHoliday) {
      includedHours += (segmentEnd - cursor) / HOUR_MS;
    }

    cursor = segmentEnd;
  }

  return floorTwoDecimals(includedHours / 24);
}

function toDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toInputDateTime(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  const hours = `${d.getHours()}`.padStart(2, '0');
  const minutes = `${d.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}
