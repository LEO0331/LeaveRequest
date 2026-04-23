import { LEAVE_TYPES, STORAGE_KEY, USERS } from './constants';
import { calculateDurationDays } from './date';
import { LeaveAuditEntry, LeaveRequest, LeaveRequestDraft, LeaveStatus } from '../types';

const STATUS_POOL: LeaveStatus[] = ['Submitted', 'Approved', 'Rejected'];
const REASON_WORDS = [
  'client',
  'handoff',
  'family',
  'medical',
  'travel',
  'planning',
  'support',
  'coverage',
  'recovery',
  'appointment',
  'event',
  'personal'
];

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let n = Math.imul(t ^ (t >>> 15), 1 | t);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(next: () => number, min: number, max: number): number {
  return Math.floor(next() * (max - min + 1)) + min;
}

function pick<T>(next: () => number, list: readonly T[]): T {
  return list[randomInt(next, 0, list.length - 1)];
}

function seededReason(next: () => number): string {
  const length = randomInt(next, 3, 8);
  const words = Array.from({ length }, () => pick(next, REASON_WORDS));
  const sentence = `${words.join(' ')} request`;
  return sentence.slice(0, 50);
}

function createSeedData(count = 10000): LeaveRequest[] {
  const next = mulberry32(20260330);
  const now = Date.now();

  return Array.from({ length: count }).map((_, index) => {
    const user = pick(next, USERS);
    const leaveType = pick(next, LEAVE_TYPES);
    const startOffsetDays = randomInt(next, 1, 180);
    const startHourOffset = randomInt(next, 0, 20);
    const durationHours = randomInt(next, 8, 240);

    const startDate = new Date(now + (startOffsetDays * 24 + startHourOffset) * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
    const reason = seededReason(next).trim();

    const status = pick(next, STATUS_POOL);
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
      id: `seed-${index + 1}`,
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
