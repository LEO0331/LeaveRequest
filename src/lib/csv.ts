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

export interface CsvImportError {
  rowNumber: number;
  reason: string;
  row: string;
}

export interface CsvParseResult {
  rows: LeaveRequest[];
  errors: CsvImportError[];
}

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

export function importErrorsToCsv(errors: CsvImportError[]): string {
  const lines = ['rowNumber,reason,rowData'];

  errors.forEach((error) => {
    lines.push(
      [String(error.rowNumber), escapeCsv(error.reason), escapeCsv(error.row)].join(',')
    );
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

export function parseCsv(content: string): CsvParseResult {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return { rows: [], errors: [] };
  }

  const headers = splitCsvLine(lines[0]);
  const indexOf = (name: string): number => headers.indexOf(name);
  const requiredHeaders = ['userId', 'leaveType', 'startDate', 'endDate', 'reason'];

  const missingHeaders = requiredHeaders.filter((header) => indexOf(header) < 0);
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          reason: `Missing required headers: ${missingHeaders.join(', ')}`,
          row: lines[0]
        }
      ]
    };
  }

  const rows: LeaveRequest[] = [];
  const errors: CsvImportError[] = [];

  lines.slice(1).forEach((line, rowIndex) => {
    const cols = splitCsvLine(line);
    const rowNumber = rowIndex + 2;

    const userId = cols[indexOf('userId')]?.trim();
    const leaveType = cols[indexOf('leaveType')]?.trim() as LeaveRequest['leaveType'];
    const startDateRaw = cols[indexOf('startDate')]?.trim();
    const endDateRaw = cols[indexOf('endDate')]?.trim();
    const reason = (cols[indexOf('reason')] ?? '').trim().slice(0, 50);
    const createdAt = cols[indexOf('createdAt')]?.trim() ?? new Date().toISOString();
    const updatedAt = cols[indexOf('updatedAt')]?.trim() ?? createdAt;
    const statusRaw = cols[indexOf('status')]?.trim() as LeaveRequest['status'];
    const id = cols[indexOf('id')]?.trim() || crypto.randomUUID();

    if (!userId || !USERS.some((user) => user.id === userId)) {
      errors.push({ rowNumber, reason: `Unknown userId: ${userId ?? '(empty)'}`, row: line });
      return;
    }

    if (!leaveType || !LEAVE_TYPES.includes(leaveType)) {
      errors.push({ rowNumber, reason: `Unknown leaveType: ${leaveType ?? '(empty)'}`, row: line });
      return;
    }

    if (!startDateRaw || Number.isNaN(new Date(startDateRaw).getTime())) {
      errors.push({ rowNumber, reason: 'Invalid startDate', row: line });
      return;
    }

    if (!endDateRaw || Number.isNaN(new Date(endDateRaw).getTime())) {
      errors.push({ rowNumber, reason: 'Invalid endDate', row: line });
      return;
    }

    if (!reason) {
      errors.push({ rowNumber, reason: 'Reason is required', row: line });
      return;
    }

    const user = USERS.find((entry) => entry.id === userId);
    if (!user) {
      errors.push({ rowNumber, reason: `Unknown userId: ${userId}`, row: line });
      return;
    }

    const status: LeaveRequest['status'] = ['Submitted', 'Approved', 'Rejected', 'Cancelled'].includes(statusRaw)
      ? statusRaw
      : 'Submitted';

    rows.push({
      id,
      userId,
      userName: user.name,
      client: user.client,
      leaveType,
      startDate: new Date(startDateRaw).toISOString(),
      endDate: new Date(endDateRaw).toISOString(),
      reason,
      durationDays: calculateDurationDays(startDateRaw, endDateRaw),
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
    });
  });

  return { rows, errors };
}
