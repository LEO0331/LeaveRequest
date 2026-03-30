import { describe, expect, it, vi } from 'vitest';
import { LeaveRequest, LeaveRequestDraft } from '../types';
import { getUsedLeaveDays, hasOverlap, validateDraft } from './validation';

const baseDraft: LeaveRequestDraft = {
  userId: 'u-1',
  leaveType: 'Vacation',
  startDate: '2026-04-10T08:00',
  endDate: '2026-04-12T08:00',
  reason: 'Family trip'
};

const existing: LeaveRequest[] = [
  {
    id: 'r-1',
    userId: 'u-1',
    userName: 'Alice Chen',
    client: 'Acme Corp',
    leaveType: 'Personal',
    startDate: '2026-04-11T00:00:00.000Z',
    endDate: '2026-04-13T00:00:00.000Z',
    reason: 'Personal errand',
    durationDays: 1,
    status: 'Submitted',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    history: []
  },
  {
    id: 'r-2',
    userId: 'u-1',
    userName: 'Alice Chen',
    client: 'Acme Corp',
    leaveType: 'Sick',
    startDate: '2026-04-20T00:00:00.000Z',
    endDate: '2026-04-21T00:00:00.000Z',
    reason: 'Doctor visit',
    durationDays: 1,
    status: 'Cancelled',
    createdAt: '2026-03-02T00:00:00.000Z',
    updatedAt: '2026-03-02T00:00:00.000Z',
    history: []
  }
];

describe('validation helpers', () => {
  it('detects overlap for active records', () => {
    expect(hasOverlap(baseDraft, existing)).toBe(true);
  });

  it('ignores overlap with cancelled records', () => {
    const draft: LeaveRequestDraft = {
      ...baseDraft,
      leaveType: 'Sick',
      startDate: '2026-04-20T01:00',
      endDate: '2026-04-20T10:00'
    };

    expect(hasOverlap(draft, existing)).toBe(false);
  });

  it('ignores overlap check for the same record in edit mode', () => {
    const draft: LeaveRequestDraft = {
      ...baseDraft,
      id: 'r-1',
      leaveType: 'Personal',
      startDate: '2026-04-11T01:00',
      endDate: '2026-04-12T01:00'
    };

    expect(hasOverlap(draft, existing, 'r-1')).toBe(false);
  });

  it('returns required field and date errors', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-10T00:00:00.000Z').getTime());

    const errors = validateDraft(
      {
        userId: '',
        leaveType: '',
        startDate: '2026-04-09T08:00',
        endDate: '2026-04-09T07:00',
        reason: ''
      },
      existing
    );

    expect(errors.userId).toBeTruthy();
    expect(errors.leaveType).toBeTruthy();
    expect(errors.startDate).toBeTruthy();
    expect(errors.endDate).toBeTruthy();
    expect(errors.duration).toBeTruthy();
    expect(errors.reason).toBeTruthy();

    nowSpy.mockRestore();
  });

  it('blocks requests when balance is insufficient', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-01T00:00:00.000Z').getTime());

    const manyVacationRequests: LeaveRequest[] = [
      ...existing,
      {
        id: 'v-1',
        userId: 'u-1',
        userName: 'Alice Chen',
        client: 'Acme Corp',
        leaveType: 'Vacation',
        startDate: '2026-05-01T00:00:00.000Z',
        endDate: '2026-05-21T00:00:00.000Z',
        reason: 'Long trip',
        durationDays: 14,
        status: 'Approved',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
        history: []
      }
    ];

    const errors = validateDraft(
      {
        ...baseDraft,
        leaveType: 'Vacation',
        startDate: '2026-05-25T08:00',
        endDate: '2026-05-27T08:00'
      },
      manyVacationRequests
    );

    expect(errors.balance).toBeTruthy();

    nowSpy.mockRestore();
  });

  it('returns no errors for a valid draft', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-01T00:00:00.000Z').getTime());

    const errors = validateDraft(
      {
        ...baseDraft,
        leaveType: 'Vacation',
        startDate: '2026-04-15T08:00',
        endDate: '2026-04-17T08:00'
      },
      existing
    );

    expect(errors).toEqual({});

    nowSpy.mockRestore();
  });

  it('computes used days from submitted and approved only', () => {
    const rows: LeaveRequest[] = [
      {
        ...existing[0],
        leaveType: 'Vacation',
        durationDays: 2,
        status: 'Submitted'
      },
      {
        ...existing[0],
        id: 'x2',
        leaveType: 'Vacation',
        durationDays: 3,
        status: 'Approved'
      },
      {
        ...existing[0],
        id: 'x3',
        leaveType: 'Vacation',
        durationDays: 4,
        status: 'Cancelled'
      }
    ];

    expect(getUsedLeaveDays(rows, 'u-1', 'Vacation')).toBe(5);
  });
});
