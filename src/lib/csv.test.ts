import { describe, expect, it } from 'vitest';
import { importErrorsToCsv, parseCsv } from './csv';

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
});
