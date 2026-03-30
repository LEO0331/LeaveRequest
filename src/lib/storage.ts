import { faker } from '@faker-js/faker';
import { LEAVE_TYPES, STORAGE_KEY, USERS } from './constants';
import { calculateDurationDays } from './date';
import { LeaveAuditEntry, LeaveRequest, LeaveRequestDraft, LeaveStatus } from '../types';

function createSeedData(count = 10000): LeaveRequest[] {
  faker.seed(20260330);
  const now = Date.now();

  return Array.from({ length: count }).map(() => {
    const user = faker.helpers.arrayElement(USERS);
    const leaveType = faker.helpers.arrayElement(LEAVE_TYPES);
    const startOffsetDays = faker.number.int({ min: 1, max: 180 });
    const startHourOffset = faker.number.int({ min: 0, max: 20 });
    const durationHours = faker.number.int({ min: 8, max: 240 });

    const startDate = new Date(now + (startOffsetDays * 24 + startHourOffset) * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
    const reason = faker.lorem.sentence({ min: 3, max: 8 }).slice(0, 50).trim();

    const status: LeaveStatus = faker.helpers.arrayElement(['Submitted', 'Approved', 'Rejected']);
    const createdAt = new Date().toISOString();

    const history: LeaveAuditEntry[] = [
      {
        action: 'Created',
        at: createdAt,
        actorRole: 'Employee'
      }
    ];

    if (status === 'Approved') {
      history.push({ action: 'Approved', at: createdAt, actorRole: 'Manager' });
    }

    if (status === 'Rejected') {
      history.push({ action: 'Rejected', at: createdAt, actorRole: 'Manager' });
    }

    return {
      id: faker.string.uuid(),
      userId: user.id,
      userName: user.name,
      client: user.client,
      leaveType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      reason,
      durationDays: calculateDurationDays(startDate.toISOString(), endDate.toISOString()),
      status,
      createdAt,
      updatedAt: createdAt,
      history
    };
  });
}

export function loadLeaveRequests(): LeaveRequest[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const seed = createSeedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    const parsed = JSON.parse(raw) as LeaveRequest[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seed = createSeedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }

    return parsed.map((item) => {
      const createdAt = item.createdAt ?? new Date().toISOString();
      return {
        ...item,
        status: item.status ?? 'Submitted',
        updatedAt: item.updatedAt ?? createdAt,
        history:
          item.history && item.history.length > 0
            ? item.history
            : [
                {
                  action: 'Imported',
                  at: createdAt,
                  actorRole: 'Manager'
                }
              ]
      };
    });
  } catch {
    const seed = createSeedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

export function saveLeaveRequests(requests: LeaveRequest[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

export function toLeaveRequest(
  draft: LeaveRequestDraft,
  nowIso: string,
  actorRole: 'Employee' | 'Manager'
): LeaveRequest {
  const user = USERS.find((entry) => entry.id === draft.userId);

  if (!user) {
    throw new Error('Selected user was not found.');
  }

  return {
    id: draft.id ?? crypto.randomUUID(),
    userId: user.id,
    userName: user.name,
    client: user.client,
    leaveType: draft.leaveType as LeaveRequest['leaveType'],
    startDate: new Date(draft.startDate).toISOString(),
    endDate: new Date(draft.endDate).toISOString(),
    reason: draft.reason.trim(),
    durationDays: calculateDurationDays(draft.startDate, draft.endDate),
    status: 'Submitted',
    createdAt: nowIso,
    updatedAt: nowIso,
    history: [
      {
        action: 'Created',
        at: nowIso,
        actorRole
      }
    ]
  };
}
