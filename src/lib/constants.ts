import { LeaveType, User } from '../types';

export const STORAGE_KEY = 'leave-requests-v1';

export const LEAVE_TYPES: LeaveType[] = ['Personal', 'Sick', 'Vacation', 'Bereavement'];

export const USERS: User[] = [
  { id: 'u-1', name: 'Alice Chen', client: 'Acme Corp' },
  { id: 'u-2', name: 'Ben Lin', client: 'Acme Corp' },
  { id: 'u-3', name: 'Carla Wang', client: 'Nimbus Ltd' },
  { id: 'u-4', name: 'David Tsai', client: 'Nimbus Ltd' },
  { id: 'u-5', name: 'Ella Huang', client: 'Vertex Co' },
  { id: 'u-6', name: 'Frank Hsu', client: 'Vertex Co' },
  { id: 'u-7', name: 'Grace Liu', client: 'Orion Group' },
  { id: 'u-8', name: 'Henry Lee', client: 'Orion Group' },
  { id: 'u-9', name: 'Irene Kuo', client: 'BlueSky Inc' },
  { id: 'u-10', name: 'Jack Wu', client: 'BlueSky Inc' }
];

export const LEAVE_QUOTAS: Record<LeaveType, number> = {
  Personal: 7,
  Sick: 10,
  Vacation: 15,
  Bereavement: 5
};

export const COMPANY_HOLIDAYS = ['2026-01-01', '2026-02-16', '2026-04-03', '2026-12-25'];
