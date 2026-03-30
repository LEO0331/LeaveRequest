export const DAY_MS = 24 * 60 * 60 * 1000;

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

  const rawDays = (end - start) / DAY_MS;
  return floorTwoDecimals(rawDays);
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
