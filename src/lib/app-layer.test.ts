import { describe, expect, it } from 'vitest';
import {
  actionDialogCopy,
  buildPdfSummary,
  sortRequests,
  statusColor,
  timestampSuffix
} from './app-layer';
import { LeaveRequest } from '../types';

const baseRequest: LeaveRequest = {
  id: 'r-1',
  userId: 'u-1',
  userName: 'Alice Chen',
  client: 'Acme Corp',
  leaveType: 'Vacation',
  startDate: '2026-04-10T08:00:00.000Z',
  endDate: '2026-04-11T08:00:00.000Z',
  reason: 'Trip',
  durationDays: 1,
  status: 'Submitted',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
  history: []
};

describe('app layer helpers', () => {
  it('sorts requests by numeric and string fields', () => {
    const rows: LeaveRequest[] = [
      { ...baseRequest, id: 'r-1', userName: 'Ben', durationDays: 2 },
      { ...baseRequest, id: 'r-2', userName: 'Alice', durationDays: 1 }
    ];

    const byUser = sortRequests(rows, 'userName', 'asc');
    expect(byUser.map((row) => row.userName)).toEqual(['Alice', 'Ben']);

    const byDurationDesc = sortRequests(rows, 'durationDays', 'desc');
    expect(byDurationDesc.map((row) => row.durationDays)).toEqual([2, 1]);
  });

  it('builds pdf summary from filters', () => {
    const summary = buildPdfSummary({
      actingRole: 'Manager',
      globalSearch: '  urgent  ',
      userFilter: 'u-1',
      statusFilter: 'Approved',
      startFromFilter: '2026-04-01T00:00',
      endToFilter: '2026-04-30T23:59',
      sortField: 'startDate',
      sortDirection: 'asc'
    });

    expect(summary.role).toBe('Manager');
    expect(summary.search).toBe('urgent');
    expect(summary.user).toBe('Alice Chen');
    expect(summary.status).toBe('Approved');
    expect(summary.sort).toBe('startDate (asc)');
  });

  it('returns correct status chip colors', () => {
    expect(statusColor('Submitted')).toBe('warning');
    expect(statusColor('Approved')).toBe('success');
    expect(statusColor('Rejected')).toBe('error');
    expect(statusColor('Cancelled')).toBe('default');
  });

  it('returns action dialog copy for each action', () => {
    expect(actionDialogCopy('approve').title).toContain('Approve');
    expect(actionDialogCopy('reject').confirm).toContain('Reject');
    expect(actionDialogCopy('cancel').body).toContain('cancelled');
    expect(actionDialogCopy('delete').title).toContain('Delete');
    expect(actionDialogCopy(null).confirm).toContain('Delete');
  });

  it('formats timestamp suffix for filenames', () => {
    const suffix = timestampSuffix(new Date('2026-04-01T10:20:30.000Z'));
    expect(suffix).toBe('2026-04-01T10-20-30');
  });
});
