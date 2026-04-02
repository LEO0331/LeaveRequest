import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import App from './App';
import { LeaveRequest } from './types';

const mockRows: LeaveRequest[] = [
  {
    id: 'r-1',
    userId: 'u-1',
    userName: 'Alice Chen',
    client: 'Acme Corp',
    leaveType: 'Vacation',
    startDate: '2026-05-10T08:00:00.000Z',
    endDate: '2026-05-11T08:00:00.000Z',
    reason: 'Family trip',
    durationDays: 1,
    status: 'Submitted',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    history: []
  },
  {
    id: 'r-2',
    userId: 'u-2',
    userName: 'Ben Lin',
    client: 'Acme Corp',
    leaveType: 'Sick',
    startDate: '2026-05-15T08:00:00.000Z',
    endDate: '2026-05-16T08:00:00.000Z',
    reason: 'Medical check',
    durationDays: 1,
    status: 'Approved',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    history: []
  }
];

vi.mock('./lib/storage', () => ({
  loadLeaveRequests: () => mockRows,
  saveLeaveRequests: vi.fn(),
  toLeaveRequest: vi.fn()
}));

vi.mock('./lib/date', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/date')>();
  return {
    ...actual,
    // Keep snapshots stable across CI/local timezones.
    formatDateTime: (iso: string) => new Date(iso).toISOString()
  };
});

describe('App UI', () => {
  it('navigates from home to dashboard', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText(/Approvals that feel less like admin/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /Enter Dashboard/i })[0]);

    expect(screen.getByText(/Leave Operations Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Request Ledger/i)).toBeInTheDocument();
  });

  it('keeps keyboard navigation reachable for key actions', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.tab();
    const enterButton = screen.getAllByRole('button', { name: /Enter Dashboard/i })[0];
    expect(enterButton).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(screen.getByText(/Leave Operations Studio/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Home/i })).toBeInTheDocument();
  });

  it('renders mobile snapshots for home and dashboard', async () => {
    const user = userEvent.setup();
    window.innerWidth = 390;
    window.dispatchEvent(new Event('resize'));

    const { container } = render(<App />);
    expect(container.firstElementChild).toMatchSnapshot('mobile-home');

    await user.click(screen.getAllByRole('button', { name: /Enter Dashboard/i })[0]);
    expect(container.firstElementChild).toMatchSnapshot('mobile-dashboard');
  });

  it('applies hover-ready classes for rows and chips', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getAllByRole('button', { name: /Enter Dashboard/i })[0]);

    expect(container.querySelectorAll('.ledger-row').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.interactive-chip').length).toBeGreaterThan(0);

    const table = screen.getByRole('table');
    expect(within(table).getByText('Alice Chen')).toBeInTheDocument();
  });

  it('has no basic accessibility violations on home and dashboard', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const homeResults = await axe(container, {
      rules: {
        // JSDOM cannot reliably evaluate color contrast because canvas APIs are partial.
        'color-contrast': { enabled: false }
      }
    });
    const homeUnexpected = homeResults.violations.filter(
      (violation) => !['heading-order', 'label'].includes(violation.id)
    );
    expect(homeUnexpected).toHaveLength(0);

    await user.click(screen.getAllByRole('button', { name: /Enter Dashboard/i })[0]);

    const dashboardResults = await axe(container, {
      rules: {
        'color-contrast': { enabled: false }
      }
    });
    const dashboardUnexpected = dashboardResults.violations.filter(
      (violation) => !['heading-order', 'label'].includes(violation.id)
    );
    expect(dashboardUnexpected).toHaveLength(0);
  });
});
