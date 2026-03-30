import { LEAVE_TYPES, USERS } from './constants';
import { calculateDurationDays } from './date';
import { LeaveRequest } from '../types';

const CSV_HEADERS = [
  'id',
  'userId',
  'leaveType',
  'startDate',
  'endDate',
  'reason',
  'status',
  'createdAt',
  'updatedAt'
] as const;

function escapeCsv(value: string): string {
  const safe = value.replace(/"/g, '""');
  return /[",\n]/.test(safe) ? `"${safe}"` : safe;
}

export function requestsToCsv(rows: LeaveRequest[]): string {
  const lines = [CSV_HEADERS.join(',')];

  rows.forEach((row) => {
    const record = [
      row.id,
      row.userId,
      row.leaveType,
      row.startDate,
      row.endDate,
      row.reason,
      row.status,
      row.createdAt,
      row.updatedAt
    ].map((value) => escapeCsv(String(value)));

    lines.push(record.join(','));
  });

  return lines.join('\n');
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  result.push(current);
  return result;
}

export function parseCsv(content: string): LeaveRequest[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);
  const indexOf = (name: string): number => headers.indexOf(name);

  return lines.slice(1).flatMap((line) => {
    const cols = splitCsvLine(line);
    const userId = cols[indexOf('userId')];
    const leaveType = cols[indexOf('leaveType')] as LeaveRequest['leaveType'];
    const startDate = cols[indexOf('startDate')];
    const endDate = cols[indexOf('endDate')];
    const reason = (cols[indexOf('reason')] ?? '').slice(0, 50);
    const createdAt = cols[indexOf('createdAt')] ?? new Date().toISOString();
    const updatedAt = cols[indexOf('updatedAt')] ?? createdAt;
    const statusRaw = cols[indexOf('status')] as LeaveRequest['status'];
    const id = cols[indexOf('id')] || crypto.randomUUID();

    if (!USERS.some((user) => user.id === userId)) {
      return [];
    }

    if (!LEAVE_TYPES.includes(leaveType)) {
      return [];
    }

    const user = USERS.find((entry) => entry.id === userId);
    if (!user) {
      return [];
    }

    const status: LeaveRequest['status'] = ['Submitted', 'Approved', 'Rejected', 'Cancelled'].includes(statusRaw)
      ? statusRaw
      : 'Submitted';

    return [
      {
        id,
        userId,
        userName: user.name,
        client: user.client,
        leaveType,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        reason,
        durationDays: calculateDurationDays(startDate, endDate),
        status,
        createdAt,
        updatedAt,
        history: [
          {
            action: 'Imported',
            at: new Date().toISOString(),
            actorRole: 'Manager'
          }
        ]
      }
    ];
  });
}
