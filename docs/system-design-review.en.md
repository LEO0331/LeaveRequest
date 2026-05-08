# Leave Management System Design Review (English)

## 1) Scope and System Context
This is a single-page React + TypeScript application for leave request operations with two roles (`Employee`, `Manager`).

Functional scope:
- Create/edit leave requests
- Approve/reject/cancel/delete workflows with role gating
- Search/filter/sort/paginate request lists
- CSV import/export (+ row-level import error report)
- PDF export with active filter summary
- Local persistence with browser `localStorage`

Non-functional emphasis:
- Fast local interaction without backend round-trips
- Strong client-side validation
- Maintainable UI split into focused components

## 2) Architecture Overview
### Runtime topology
- Client-only web app (no API server in runtime path)
- Persistence: browser `localStorage`
- Build/deploy: Vite + GitHub Actions + GitHub Pages

### Module decomposition
- `src/App.tsx`: orchestration layer/state owner
- `src/components/*`: presentation and interaction widgets
- `src/lib/storage.ts`: load/save/seed + normalization
- `src/lib/validation.ts`: business validation rules
- `src/lib/date.ts`: duration and datetime transforms
- `src/lib/csv.ts`: CSV parse/serialize/sanitization
- `src/lib/pdf.ts`: lazy-loaded PDF generation
- `src/lib/app-layer.ts`: view-model utilities (sorting, dialogs, summary, history append)

### Dataflow (write path)
1. User action opens form/dialog in `App.tsx`
2. `validateDraft(...)` checks constraints
3. Data normalized with `toLeaveRequest(...)`
4. In-memory array updated (`setRequests`)
5. Persisted to `localStorage` via `saveLeaveRequests(...)`
6. Feedback shown using success/error snackbars

### Dataflow (read/query path)
1. Raw request array in state
2. Derived with `useMemo`: filter -> sort -> page slice
3. Rendered by `RequestTable`
4. Row selection drives `DetailsDrawer`

## 3) Key Design Decisions and Tradeoffs
### Decision A: Client-only architecture (no backend)
Why chosen:
- Minimal deployment/operations complexity
- Very low latency UX
- Faster iteration for product validation

Tradeoffs:
- No cross-device consistency
- No centralized access control/auditing
- Storage size/reliability constraints from browser

Alternative:
- API + DB backend (Postgres, DynamoDB, etc.)
When better:
- Multi-user concurrency, compliance, org-wide reporting

### Decision B: Single source of truth in `App.tsx`
Why chosen:
- Predictable flow and easy state tracing
- Avoids over-engineering global state libraries

Tradeoffs:
- Large top-level component can grow in complexity
- More prop passing across component boundaries

Alternative:
- Global store (`Redux Toolkit`, `Zustand`) or domain contexts
When better:
- Multiple pages/shared cross-cutting state, heavy real-time updates

### Decision C: Utility-library boundary (`src/lib/*`)
Why chosen:
- Isolates domain logic from rendering concerns
- Enables direct unit testing of logic modules

Tradeoffs:
- Some duplicated transforms between modules can emerge over time

Alternative:
- Full domain-service layer (DDD style)
When better:
- Complex workflow lifecycles and high team scale

## 4) Data Structures: Why These Choices, Alternatives, and Tradeoffs

### 4.1 `LeaveRequest[]` as primary collection
Current:
- In-memory array used for filtering, sorting, pagination, rendering

Why chosen:
- Natural for ordered table rendering
- Straightforward immutable updates
- Works well with `.filter/.map/.slice/.sort`

Tradeoffs:
- O(n) lookup by id
- Repeated scans for validation and aggregates

Alternatives:
1. `Map<string, LeaveRequest>` + separate ordered id list
- Pros: O(1) lookup/update by id
- Cons: extra complexity for sort/filter/pagination ordering

2. Normalized structure `{ byId, allIds }`
- Pros: scalable update patterns
- Cons: more boilerplate in a small app

### 4.2 `Map` for grouping and CSV upsert
Current:
- Group summary: `Map<client, count>`
- CSV import merge: `Map<id, LeaveRequest>`

Why chosen:
- O(1) average key update
- Avoids nested loops for upsert/grouping

Alternatives:
1. Plain object dictionary
- Pros: simpler syntax
- Cons: weaker key semantics, prototype pitfalls

2. Array reduce + `find`
- Pros: no additional structure
- Cons: O(n^2) risk in upsert scenarios

### 4.3 Discriminated unions for roles/status/actions
Current:
- String unions in `types.ts` for `ActorRole`, `LeaveStatus`, `LeaveType`, `ActionType`

Why chosen:
- Compile-time safety for workflow states
- Exhaustiveness guidance in condition branches

Alternatives:
1. TypeScript `enum`
- Pros: explicit symbolic namespace
- Cons: runtime artifact overhead and less ergonomic string interoperability

2. Raw strings everywhere
- Pros: minimal typing friction
- Cons: typo-prone and weaker refactor safety

### 4.4 `LeaveAuditEntry[]` append-only history
Current:
- Per-request timeline entries appended with action, actor, timestamp, optional note

Why chosen:
- Simple auditability and explanation trail
- Local immutable append semantics

Tradeoffs:
- History growth increases record payload size

Alternatives:
1. Separate global event log keyed by request id
- Pros: better long-term analytics/event querying
- Cons: join complexity for details view

2. Last-action-only metadata
- Pros: compact storage
- Cons: loses forensic traceability

### 4.5 Date representation as ISO string
Current:
- Store date/time fields as ISO strings

Why chosen:
- Serialization-safe for `localStorage` and CSV/PDF
- Timezone-aware when parsed by `Date`

Tradeoffs:
- Parsing overhead on repeated operations
- Local display variability due to locale/timezone

Alternatives:
1. Epoch milliseconds
- Pros: faster numeric compare
- Cons: less human-readable in exports/debugging

2. Date-only domain type (`YYYY-MM-DD`) + time blocks
- Pros: clearer business-day semantics
- Cons: less flexible for partial-day requests

## 5) Validation and Consistency Strategy
Current approach:
- Synchronous validation in `validateDraft(...)`
- Overlap check excludes `Cancelled`/`Rejected`
- Balance check uses active statuses (`Submitted`/`Approved`)
- Duration uses business-day logic excluding weekends + configured holidays

Why this is good:
- Deterministic and immediate feedback
- Centralized rule logic independent from UI controls

Tradeoff:
- Client-only integrity: data can still be tampered with in browser storage

Alternative:
- Server-enforced validation and signed audit trail

## 6) Performance and Scalability Characteristics
Current characteristics:
- Seed size is large (10k records), but table is paginated
- Heavy transforms are memoized (`useMemo`)
- PDF libs are lazy-loaded to reduce initial bundle impact

Bottlenecks if scaled further:
- Re-filter/sort complexity O(n log n) per dependency change
- Full-array recalculations for some aggregates

Alternatives for scale:
1. Indexed precomputed views (status/user/date)
2. Windowed virtual table rendering
3. Backend query offloading

## 7) Security and Reliability Notes
Implemented controls:
- CSV formula-injection sanitization on export
- Import file type + size guardrails
- Role-based UI action gating

Gaps (by design of client-only model):
- Role checks are not authoritative security boundaries
- Local data can be edited outside app UI

## 8) Deep-Dive Questions and Prepared Answers
### Q1: Why not use a database now?
A: Product scope is local workflow/demo-first. Client-only architecture minimizes ops cost and accelerates iteration. For multi-user consistency/compliance, backend is the next architectural step.

### Q2: Why array instead of normalized map state?
A: Primary workload is table rendering + sort/filter/pagination, where ordered arrays are direct and readable. Map-based normalization helps write-heavy or very large datasets, but adds complexity here.

### Q3: How do you prevent concurrent update conflicts?
A: Current design does not address cross-client concurrency because persistence is local per browser. A backend migration would add optimistic concurrency control/version checks.

### Q4: Why append audit history in each record?
A: Request detail UX needs local per-record timeline with minimal joins. If analytics/event replay becomes a requirement, move to a global event store.

### Q5: Where are integrity boundaries?
A: Validation boundaries are `validateDraft` and import parsing rules. Security boundaries are weak in client-only mode; true enforcement needs server-side policy checks.

### Q6: What are the first refactors for scale?
A:
1. Extract request domain service layer from `App.tsx`
2. Introduce indexed query helpers for common filters
3. Add virtualization for table rows
4. Move persistence to API + DB with server-side validation

### Q7: Why lazy-load PDF libraries?
A: PDF export is secondary action; loading `jspdf` stack on demand improves initial load path and Lighthouse outcomes.

### Q8: Why use `Map` for CSV import merge?
A: Upsert by id becomes linear (`O(n + m)`) instead of nested scan (`O(n*m)`), while keeping output convertible back to array for rendering.

## 9) Recommended Next Architecture Milestones
1. Introduce backend API with authoritative role and validation checks
2. Store audit events server-side with immutable append
3. Replace local search/filter with queryable endpoint for large datasets
4. Add observability (structured logs + metrics) for export/import failures
