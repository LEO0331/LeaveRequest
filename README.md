# Leave Management System

Interactive Leave Management System built with React, TypeScript, and MUI to manage, filter, validate, and load-test employee leave requests.

## Features

- 10,000+ seeded leave requests (Faker) persisted in browser local storage.
- Dashboard table with:
  - Global keyword search
  - User/date filtering
  - Column sorting
  - Optional grouping summary by client
- Request details drawer with actions:
  - Edit request
  - Cancel request (keeps history, marks status as `Cancelled`)
  - Delete request (permanent removal)
- Leave request form with:
  - Start/end datetime pickers
  - Leave type dropdown (`Personal`, `Sick`, `Vacation`, `Bereavement`)
  - User dropdown (~10 users)
  - Reason field limited to 50 characters
  - Dynamic duration calculation with floor-to-2-decimals logic (`4.376 -> 4.37`)
- Save-time validation:
  - Overlap with existing active leave periods
  - Start date in the past
  - End date before start date
  - Empty reason
  - Zero/negative duration
  - Missing leave type/user
- Submission loading state and success notification toast.

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
  - duration calculations
- Validation logic in [src/lib/validation.test.ts](/Users/Leo/Documents/LeaveRequest/src/lib/validation.test.ts)
  - overlap detection
  - cancelled-request overlap exclusion
  - required field/date rules
  - valid draft pass-through

## Deployment (GitHub Pages)

Workflow file:

- [.github/workflows/deploy.yml](/Users/Leo/Documents/LeaveRequest/.github/workflows/deploy.yml)

What it does on push to `main` (or manual trigger):

1. Installs dependencies with `npm ci`
2. Runs unit tests (`npm test`)
3. Builds the app (`npm run build`)
4. Uploads `dist/` and deploys to GitHub Pages

### Required GitHub Settings

- In repository settings, enable GitHub Pages with **GitHub Actions** as the source.

## Notes

- Data is stored in local storage key: `leave-requests-v1`.
- Cancelled requests remain visible in history and are excluded from overlap validation.
