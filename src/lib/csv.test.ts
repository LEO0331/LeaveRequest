import { describe, expect, it } from 'vitest';
import { csvTemplate, importErrorsToCsv, parseCsv, requestsToCsv } from './csv';
import { LeaveRequest } from '../types';

describe('csv helpers', () => {
  it('parses valid rows and reports invalid rows', () => {
    const content = [
      'id,userId,leaveType,startDate,endDate,reason,status,createdAt,updatedAt',
      'r-1,u-1,Vacation,2026-04-10T08:00:00.000Z,2026-04-11T08:00:00.000Z,Trip,Submitted,2026-03-01T00:00:00.000Z,2026-03-01T00:00:00.000Z',
      'r-2,unknown,Sick,2026-04-10T08:00:00.000Z,2026-04-11T08:00:00.000Z,Sick leave,Submitted,2026-03-01T00:00:00.000Z,2026-03-01T00:00:00.000Z',
      'r-3,u-1,Vacation,invalid-date,2026-04-11T08:00:00.000Z,Bad date,Submitted,2026-03-01T00:00:00.000Z,2026-03-01T00:00:00.000Z'
    ].join('\n');

    const result = parseCsv(content);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe('r-1');
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].rowNumber).toBe(3);
    expect(result.errors[1].reason).toContain('Invalid startDate');
  });

  it('reports missing required headers', () => {
    const content = ['id,userId,leaveType,startDate,endDate', 'r-1,u-1,Vacation,2026-04-10,2026-04-11'].join('\n');
    const result = parseCsv(content);

    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('Missing required headers');
  });

  it('exports import errors as csv', () => {
    const csv = importErrorsToCsv([
      { rowNumber: 2, reason: 'Unknown userId: bad', row: 'raw,line' }
    ]);

    expect(csv).toContain('rowNumber,reason,rowData');
    expect(csv).toContain('2,Unknown userId: bad,"raw,line"');
  });

  it('sanitizes formula-like values in csv export', () => {
    const rows: LeaveRequest[] = [
      {
        id: 'r-1',
        userId: 'u-1',
        userName: 'Alice Chen',
        client: 'Acme Corp',
        leaveType: 'Vacation',
        startDate: '2026-04-10T08:00:00.000Z',
        endDate: '2026-04-11T08:00:00.000Z',
        reason: '=cmd',
        durationDays: 1,
        status: 'Submitted',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
        history: []
      }
    ];

    const csv = requestsToCsv(rows);
    expect(csv).toContain("'=cmd");
  });

  it('generates a usable template with headers and one sample row', () => {
    const template = csvTemplate();
    const lines = template.split('\n');
    expect(lines[0]).toContain('id,userId,leaveType,startDate,endDate,reason,status,createdAt,updatedAt');
    expect(lines).toHaveLength(2);
  });

  it('falls back to Submitted when import status is unknown', () => {
    const content = [
      'id,userId,leaveType,startDate,endDate,reason,status,createdAt,updatedAt',
      'r-10,u-1,Vacation,2026-04-10T08:00:00.000Z,2026-04-11T08:00:00.000Z,Trip,UnknownStatus,2026-03-01T00:00:00.000Z,2026-03-01T00:00:00.000Z'
    ].join('\n');

    const result = parseCsv(content);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].status).toBe('Submitted');
  });

  it('sanitizes dangerous values in error csv export', () => {
    const csv = importErrorsToCsv([
      { rowNumber: 4, reason: '=BAD()', row: '+row,data' }
    ]);

    expect(csv).toContain("'=BAD()");
    expect(csv).toContain("'+row,data");
  });
});
