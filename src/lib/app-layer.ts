import { USERS } from './constants';
import { toInputDateTime } from './date';
import { PdfFilterSummary } from './pdf';
import { ActorRole, LeaveRequest, LeaveRequestDraft, LeaveStatus } from '../types';

export type SortField =
  | 'userName'
  | 'client'
  | 'leaveType'
  | 'startDate'
  | 'endDate'
  | 'durationDays'
  | 'status';

export type SortDirection = 'asc' | 'desc';

export type ActionType = 'cancel' | 'delete' | 'approve' | 'reject';

export function sortRequests(items: LeaveRequest[], field: SortField, direction: SortDirection): LeaveRequest[] {
  const sorted = [...items].sort((a, b) => {
    const first = a[field];
    const second = b[field];

    if (typeof first === 'number' && typeof second === 'number') {
      return first - second;
    }

    return String(first).localeCompare(String(second));
  });

  return direction === 'asc' ? sorted : sorted.reverse();
}

export function emptyDraft(): LeaveRequestDraft {
  return {
    userId: '',
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  };
}

export function draftFromRequest(item: LeaveRequest): LeaveRequestDraft {
  return {
    id: item.id,
    userId: item.userId,
    leaveType: item.leaveType,
    startDate: toInputDateTime(item.startDate),
    endDate: toInputDateTime(item.endDate),
    reason: item.reason
  };
}

export function statusColor(status: LeaveStatus): 'default' | 'success' | 'warning' | 'error' {
  if (status === 'Approved') {
    return 'success';
  }

  if (status === 'Submitted') {
    return 'warning';
  }

  if (status === 'Rejected') {
    return 'error';
  }

  return 'default';
}

export function appendHistory(
  record: LeaveRequest,
  action: 'Edited' | 'Approved' | 'Rejected' | 'Cancelled' | 'Deleted' | 'Imported',
  actorRole: ActorRole,
  note?: string
): LeaveRequest {
  return {
    ...record,
    updatedAt: new Date().toISOString(),
    history: [
      ...record.history,
      {
        action,
        at: new Date().toISOString(),
        actorRole,
        note
      }
    ]
  };
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function timestampSuffix(date = new Date()): string {
  return date.toISOString().slice(0, 19).replace(/:/g, '-');
}

export function buildPdfSummary(params: {
  actingRole: ActorRole;
  globalSearch: string;
  userFilter: string;
  statusFilter: 'all' | LeaveStatus;
  startFromFilter: string;
  endToFilter: string;
  sortField: SortField;
  sortDirection: SortDirection;
}): PdfFilterSummary {
  const userName =
    params.userFilter === 'all'
      ? 'All Users'
      : USERS.find((user) => user.id === params.userFilter)?.name ?? params.userFilter;
  const statusName = params.statusFilter === 'all' ? 'All Statuses' : params.statusFilter;

  return {
    role: params.actingRole,
    search: params.globalSearch.trim(),
    user: userName,
    status: statusName,
    startFrom: params.startFromFilter,
    endTo: params.endToFilter,
    sort: `${params.sortField} (${params.sortDirection})`
  };
}

export function actionDialogCopy(actionType: ActionType | null): {
  title: string;
  body: string;
  confirm: string;
} {
  if (actionType === 'approve') {
    return {
      title: 'Approve Leave Request',
      body: 'This will mark the request as approved.',
      confirm: 'Confirm Approve'
    };
  }

  if (actionType === 'reject') {
    return {
      title: 'Reject Leave Request',
      body: 'This will mark the request as rejected.',
      confirm: 'Confirm Reject'
    };
  }

  if (actionType === 'cancel') {
    return {
      title: 'Cancel Leave Request',
      body: 'This will mark the request as cancelled and keep it in history.',
      confirm: 'Confirm Cancel'
    };
  }

  return {
    title: 'Delete Leave Request',
    body: 'This will permanently remove the request from local storage.',
    confirm: 'Confirm Delete'
  };
}
