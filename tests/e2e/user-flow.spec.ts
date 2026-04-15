import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'leave-requests-v1';

function toDateTimeLocal(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function nextBusinessDay(start: Date): Date {
  const cursor = new Date(start);
  while (cursor.getDay() === 0 || cursor.getDay() === 6) {
    cursor.setDate(cursor.getDate() + 1);
  }
  return cursor;
}

function buildFutureWindow(): { start: string; end: string } {
  const base = new Date();
  base.setDate(base.getDate() + 5);
  base.setSeconds(0, 0);

  const start = nextBusinessDay(base);
  start.setHours(9, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const businessEnd = nextBusinessDay(end);
  businessEnd.setHours(18, 0, 0, 0);

  return {
    start: toDateTimeLocal(start),
    end: toDateTimeLocal(businessEnd)
  };
}

async function openDashboard(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Enter Dashboard/i }).click();
  await expect(page.getByRole('heading', { name: /Leave Operations Studio/i })).toBeVisible();
}

async function createRequest(
  page: import('@playwright/test').Page,
  options: { reason: string; leaveType?: 'Sick' | 'Vacation' | 'Personal' | 'Bereavement' }
): Promise<void> {
  const leaveType = options.leaveType ?? 'Sick';
  const window = buildFutureWindow();

  await page.getByRole('button', { name: /Add New Leave Request/i }).click();
  const dialog = page.getByRole('dialog', { name: /Add Leave Request/i });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('User').click();
  await page.getByRole('option', { name: 'Alice Chen' }).click();

  await dialog.getByLabel('Leave Type').click();
  await page.getByRole('option', { name: leaveType }).click();

  await dialog.getByLabel('Start Date').fill(window.start);
  await dialog.getByLabel('End Date').fill(window.end);
  await dialog.getByLabel('Reason').fill(options.reason);

  await dialog.getByRole('button', { name: /Submit Request/i }).click();
  await expect(page.getByText(/Leave request submitted\./i)).toBeVisible();
}

async function filterByReason(page: import('@playwright/test').Page, reason: string): Promise<void> {
  await page.getByLabel('Global Search').fill(reason);
  await expect(page.locator('tbody tr')).toContainText(reason);
}

async function closeDrawer(page: import('@playwright/test').Page): Promise<void> {
  const closeButton = page.getByRole('button', { name: /Close request details/i });
  if (await closeButton.count()) {
    await closeButton.click();
  } else {
    const backdrop = page.locator('.MuiDrawer-root .MuiBackdrop-root').first();
    if (await backdrop.count()) {
      await backdrop.click({ force: true });
    } else {
      await page.keyboard.press('Escape');
    }
  }
  await expect(page.getByText(/Request Chronicle/i)).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key: string) => {
    window.localStorage.setItem(
      key,
      JSON.stringify([
        {
          id: 'seed-1',
          userId: 'u-2',
          userName: 'Ben Lin',
          client: 'Acme Corp',
          leaveType: 'Personal',
          startDate: '2030-01-10T09:00:00.000Z',
          endDate: '2030-01-11T09:00:00.000Z',
          reason: 'seed request',
          durationDays: 1,
          status: 'Approved',
          createdAt: '2030-01-01T00:00:00.000Z',
          updatedAt: '2030-01-01T00:00:00.000Z',
          history: [
            { action: 'Created', at: '2030-01-01T00:00:00.000Z', actorRole: 'Employee' },
            { action: 'Approved', at: '2030-01-01T00:00:00.000Z', actorRole: 'Manager' }
          ]
        }
      ])
    );
  }, STORAGE_KEY);
});

test.describe('Leave management user flows', () => {
  test('home to dashboard flow is reachable', async ({ page }) => {
    await openDashboard(page);
    await page.getByRole('button', { name: /^Home$/i }).click();
    await expect(page.getByText(/Approvals that feel less like admin/i)).toBeVisible();
  });

  test('employee can create and cancel a request', async ({ page }) => {
    const reason = `e2e-cancel-${Date.now()}`;

    await openDashboard(page);
    await createRequest(page, { reason, leaveType: 'Sick' });
    await filterByReason(page, reason);

    await expect(page.getByText(new RegExp(`Reason: ${reason}`))).toBeVisible();

    await page.getByRole('button', { name: /Cancel Request/i }).click();
    await page.getByRole('button', { name: /Confirm Cancel/i }).click();

    await expect(page.getByText(/Leave request cancelled\./i)).toBeVisible();
    await expect(page.locator('tbody tr', { hasText: reason }).first()).toContainText('Cancelled');
  });

  test('manager can approve then delete a submitted request', async ({ page }) => {
    const reason = `e2e-manager-${Date.now()}`;

    await openDashboard(page);
    await createRequest(page, { reason, leaveType: 'Vacation' });
    await filterByReason(page, reason);
    await closeDrawer(page);

    await page.getByLabel('Role').click();
    await page.getByRole('option', { name: 'Manager' }).click();

    await page.locator('tbody tr', { hasText: reason }).first().click();
    await expect(page.getByText(new RegExp(`Reason: ${reason}`))).toBeVisible();

    await page.getByRole('button', { name: /Approve Request/i }).click();
    await page.getByRole('button', { name: /Confirm Approve/i }).click();

    await expect(page.getByText(/Leave request approved\./i)).toBeVisible();
    await expect(page.locator('tbody tr', { hasText: reason }).first()).toContainText('Approved');

    await page.getByRole('button', { name: /Delete Request/i }).click();
    await page.getByRole('button', { name: /Confirm Delete/i }).click();

    await expect(page.getByText(/Leave request deleted\./i)).toBeVisible();
    await expect(page.locator('tbody tr', { hasText: reason })).toHaveCount(0);
  });
});
