export type LeaveType = 'Personal' | 'Sick' | 'Vacation' | 'Bereavement';
export type LeaveStatus = 'Submitted' | 'Approved' | 'Rejected' | 'Cancelled';
export type ActorRole = 'Employee' | 'Manager';

export interface User {
  id: string;
  name: string;
  client: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  client: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  durationDays: number;
  status: LeaveStatus;
  createdAt: string;
  updatedAt: string;
  history: LeaveAuditEntry[];
}

export interface LeaveAuditEntry {
  action: 'Created' | 'Edited' | 'Approved' | 'Rejected' | 'Cancelled' | 'Deleted' | 'Imported';
  at: string;
  actorRole: ActorRole;
  note?: string;
}

export interface LeaveRequestDraft {
  id?: string;
  userId: string;
  leaveType: LeaveType | '';
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ValidationErrors {
  overlap?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  duration?: string;
  leaveType?: string;
  userId?: string;
  balance?: string;
}
