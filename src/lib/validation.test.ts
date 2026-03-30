import { describe, expect, it, vi } from 'vitest';
import { LeaveRequest, LeaveRequestDraft } from '../types';
import { hasOverlap, validateDraft } from './validation';

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
    durationDays: 2,
    status: 'Active',
    createdAt: '2026-03-01T00:00:00.000Z'
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
    createdAt: '2026-03-02T00:00:00.000Z'
  }
];

describe('validation helpers', () => {
  it('detects overlap for active records', () => {
    expect(hasOverlap(baseDraft, existing)).toBe(true);
  });

  it('ignores overlap with cancelled records', () => {
    const draft: LeaveRequestDraft = {
      ...baseDraft,
      startDate: '2026-04-20T01:00',
      endDate: '2026-04-20T10:00'
    };

    expect(hasOverlap(draft, existing)).toBe(false);
  });

  it('ignores overlap check for the same record in edit mode', () => {
    const draft: LeaveRequestDraft = {
      ...baseDraft,
      id: 'r-1',
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

  it('returns no errors for a valid draft', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-01T00:00:00.000Z').getTime());

    const errors = validateDraft(
      {
        ...baseDraft,
        startDate: '2026-04-15T08:00',
        endDate: '2026-04-17T08:00'
      },
      existing
    );

    expect(errors).toEqual({});

    nowSpy.mockRestore();
  });
});
