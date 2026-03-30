# Leave Management System

Interactive Leave Management System built with React, TypeScript, and MUI to manage, approve, validate, and load-test employee leave requests.

## Features

- 10,000+ seeded leave requests (Faker) persisted in browser local storage.
- Role-aware workflow (`Employee` / `Manager`) with statuses:
  - `Submitted`
  - `Approved`
  - `Rejected`
  - `Cancelled`
- Audit trail per request, including create/edit/approve/reject/cancel/import events.
- Dashboard table with:
  - Global keyword search
  - User/date/status filtering
  - Column sorting
  - Optional grouping summary by client
- Request details drawer actions:
  - Edit request
  - Approve request (Manager)
  - Reject request (Manager)
  - Cancel request (Employee)
  - Delete request (Manager)
- Leave balance tracking by leave type quota:
  - Personal: 7 days
  - Sick: 10 days
  - Vacation: 15 days
  - Bereavement: 5 days
- Balance-aware validation blocks requests that exceed remaining quota.
- Business-day duration calculation excludes weekends and configured company holidays.
- CSV import/export for bulk operations:
  - Export filtered rows to CSV
  - Import CSV (upsert by `id`) from Manager role

## Validation Rules

Validation runs on submit/save and blocks if:

- Request overlaps with another active period for the same user.
- Start date is in the past.
- End date is before start date.
- Reason is empty.
- Calculated duration is zero/negative.
- Leave type or user is missing.
- Requested duration exceeds remaining leave balance.

## Tech Stack

- React + Vite
- TypeScript
- MUI (Material UI)
- Faker (`@faker-js/faker`)
- Vitest (unit tests)

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## Unit Tests

Tests are included for:

- Date utilities in [src/lib/date.test.ts](/Users/Leo/Documents/LeaveRequest/src/lib/date.test.ts)
  - floor-to-2-decimal behavior
  - business-day duration behavior (weekends/holidays excluded)
- Validation logic in [src/lib/validation.test.ts](/Users/Leo/Documents/LeaveRequest/src/lib/validation.test.ts)
  - overlap detection behavior
  - cancelled overlap exclusion
  - required field/date rules
  - leave balance limit enforcement
  - used-balance aggregation logic

## CSV Format

Import/export CSV columns:

- `id`
- `userId`
- `leaveType`
- `startDate`
- `endDate`
- `reason`
- `status`
- `createdAt`
- `updatedAt`

Notes:

- Unknown users/leave types are skipped during import.
- Imported rows are appended or updated by `id`.

## Deployment (GitHub Pages)

Workflow file:

- [.github/workflows/deploy.yml](/Users/Leo/Documents/LeaveRequest/.github/workflows/deploy.yml)

On push to `main` (or manual trigger), the workflow:

1. Runs `npm ci`
2. Runs `npm test`
3. Runs `npm run build`
4. Deploys `dist/` to GitHub Pages

### Required GitHub Setting

- Set Pages source to **GitHub Actions** in repository settings.

## Notes

- Local storage key: `leave-requests-v1`.
- Company holidays are configured in [src/lib/constants.ts](/Users/Leo/Documents/LeaveRequest/src/lib/constants.ts).
