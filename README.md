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
  - Download CSV template for faster onboarding
  - Row-level import validation error report auto-download (`leave-import-errors-*.csv`)
  - Import guardrails: CSV-only extension and max 2MB file size
  - CSV formula-injection hardening for exported values
- PDF export for reporting:
  - Export filtered rows to a paginated PDF report
  - Includes generated timestamp, active filters, sort mode, role, and table rows
  - PDF libraries are lazy-loaded on demand to reduce initial bundle size
- Build output compression:
  - Gzip (`.gz`) and Brotli (`.br`) assets generated via `vite-plugin-compression`
- Cache strategy:
  - Long-cache rules for static assets provided in `public/_headers`
  - HTML pages are set to `must-revalidate`

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
- jsPDF + jspdf-autotable (PDF reports)

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

### End-to-End Test (Playwright)

```bash
npx playwright install chromium
npm run test:e2e
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

## E2E Tests

Playwright E2E coverage now includes:

- Home to dashboard navigation (and return to home)
- Employee creates and cancels a leave request
- Manager approves and deletes a submitted request

Spec file:

- [tests/e2e/user-flow.spec.ts](/Users/Leo/Documents/LeaveRequest/tests/e2e/user-flow.spec.ts)

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
- Import validation issues are exported as a downloadable CSV report.

## Deployment (GitHub Pages)

Workflow file:

- [.github/workflows/deploy.yml](/Users/Leo/Documents/LeaveRequest/.github/workflows/deploy.yml)
- [.github/workflows/lighthouse.yml](/Users/Leo/Documents/LeaveRequest/.github/workflows/lighthouse.yml)

On push to `main` (or manual trigger), the workflow:

1. Runs `npm ci`
2. Runs `npm test`
3. Runs `npm run build`
4. Deploys `dist/` to GitHub Pages

Lighthouse CI (PR + manual trigger):

1. Builds production assets
2. Runs Lighthouse against `http://127.0.0.1:4173/LeaveRequest/`
3. Uploads a temporary public report dashboard URL
4. Writes the URL to the GitHub Action Summary
5. Posts the URL as a PR comment (pull requests only)

### Required GitHub Setting

- Set Pages source to **GitHub Actions** in repository settings.

## Maintainability Notes

- Main dashboard UI is split into focused components:
  - [Toolbar.tsx](/Users/Leo/Documents/LeaveRequest/src/components/Toolbar.tsx)
  - [Filters.tsx](/Users/Leo/Documents/LeaveRequest/src/components/Filters.tsx)
  - [RequestTable.tsx](/Users/Leo/Documents/LeaveRequest/src/components/RequestTable.tsx)
  - [DetailsDrawer.tsx](/Users/Leo/Documents/LeaveRequest/src/components/DetailsDrawer.tsx)

## Notes

- Local storage key: `leave-requests-v1`.
- Company holidays are configured in [src/lib/constants.ts](/Users/Leo/Documents/LeaveRequest/src/lib/constants.ts).
- SEO metadata and social tags are set in [index.html](/Users/Leo/Documents/LeaveRequest/index.html).
- Search crawler rules are set in [public/robots.txt](/Users/Leo/Documents/LeaveRequest/public/robots.txt).
- Privacy/security policy page: [public/privacy-security.html](/Users/Leo/Documents/LeaveRequest/public/privacy-security.html).
