import { LEAVE_QUOTAS } from './constants';
import { calculateDurationDays } from './date';
import { LeaveRequest, LeaveRequestDraft, ValidationErrors } from '../types';

export function hasOverlap(
  draft: LeaveRequestDraft,
  existing: LeaveRequest[],
  editingId?: string
): boolean {
  if (!draft.userId || !draft.startDate || !draft.endDate) {
    return false;
  }

  const start = new Date(draft.startDate).getTime();
  const end = new Date(draft.endDate).getTime();

  return existing.some((record) => {
    if (record.id === editingId) {
      return false;
    }

    if (record.userId !== draft.userId) {
      return false;
    }

    if (record.status === 'Cancelled' || record.status === 'Rejected') {
      return false;
    }

    const recordStart = new Date(record.startDate).getTime();
    const recordEnd = new Date(record.endDate).getTime();

    return start < recordEnd && end > recordStart;
  });
}

export function validateDraft(
  draft: LeaveRequestDraft,
  existing: LeaveRequest[],
  editingId?: string
): ValidationErrors {
  const errors: ValidationErrors = {};
  const now = Date.now();
  const duration = calculateDurationDays(draft.startDate, draft.endDate);

  if (!draft.userId) {
    errors.userId = 'Please select a user.';
  }

  if (!draft.leaveType) {
    errors.leaveType = 'Please select a leave type.';
  }

  if (!draft.startDate) {
    errors.startDate = 'Start date is required.';
  } else if (new Date(draft.startDate).getTime() < now) {
    errors.startDate = 'Start date cannot be in the past.';
  }

  if (!draft.endDate) {
    errors.endDate = 'End date is required.';
  }

  if (draft.startDate && draft.endDate) {
    if (new Date(draft.endDate).getTime() < new Date(draft.startDate).getTime()) {
      errors.endDate = 'End date cannot be before the start date.';
    }

    if (duration <= 0) {
      errors.duration = 'Calculated duration must be greater than zero.';
    }

    if (hasOverlap(draft, existing, editingId)) {
      errors.overlap = 'This request overlaps with an existing leave period.';
    }
  }

  if (draft.userId && draft.leaveType && duration > 0) {
    const usedDays = getUsedLeaveDays(existing, draft.userId, draft.leaveType, editingId);
    const quota = LEAVE_QUOTAS[draft.leaveType];
    const remaining = quota - usedDays;

    if (duration > remaining) {
      errors.balance = `Insufficient balance. Remaining ${remaining.toFixed(2)} days, requested ${duration.toFixed(2)} days.`;
    }
  }

  if (!draft.reason.trim()) {
    errors.reason = 'Reason cannot be empty.';
  } else if (draft.reason.trim().length > 50) {
    errors.reason = 'Reason must be 50 characters or less.';
  }

  return errors;
}

export function getUsedLeaveDays(
  existing: LeaveRequest[],
  userId: string,
  leaveType: LeaveRequest['leaveType'],
  editingId?: string
): number {
  return existing
    .filter((record) => {
      if (record.id === editingId) {
        return false;
      }

      if (record.userId !== userId || record.leaveType !== leaveType) {
        return false;
      }

      return record.status === 'Submitted' || record.status === 'Approved';
    })
    .reduce((sum, record) => sum + record.durationDays, 0);
}
