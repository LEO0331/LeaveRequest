export type LeaveType = 'Personal' | 'Sick' | 'Vacation' | 'Bereavement';

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
  createdAt: string;
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
}
