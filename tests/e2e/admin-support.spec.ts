import { test, expect } from '@playwright/test';
import { generateTestId } from './helpers/utils';
import { loginAsAdmin } from './helpers/utils';

test.describe.serial('Admin Support CRM E2E', () => {
  let testId: string;
  
  test.beforeAll(() => {
    testId = generateTestId();
  });

  test('Admin can manage support cases', async ({ page }) => {
    // 1. Admin Login
    await loginAsAdmin(page);

    // 2. Navigate to Support list
    await page.goto('/admin/operations/support');
    await expect(page.locator('h1')).toHaveText('الدعم الفني (Support Cases)');

    // 3. Create synthetic case
    await page.getByRole('link', { name: 'إنشاء تذكرة جديدة' }).click();
    await expect(page).toHaveURL(/\/admin\/operations\/support\/new/);
    
    const subject = `E2E Test Case ${testId}`;
    await page.fill('input[type="text"]', subject);
    await page.selectOption('select', { label: 'PAYMENT' }); // select category
    
    // Fill initial note
    await page.fill('textarea', 'This is an initial E2E note.');
    
    await page.getByRole('button', { name: 'إنشاء التذكرة' }).click();
    
    // Should redirect to detail view
    await expect(page).toHaveURL(/\/admin\/operations\/support\/[a-f0-9\-]+/);
    
    // 4. Verify Detail View & Add Note
    await expect(page.locator('h1')).toContainText(subject);
    await expect(page.locator('text=This is an initial E2E note.')).toBeVisible();

    await page.fill('textarea', 'Adding a secondary note for E2E.');
    await page.getByRole('button', { name: 'إضافة الملاحظة' }).click();
    
    await expect(page.locator('text=Adding a secondary note for E2E.')).toBeVisible();

    // 5. Change Priority & Status
    await page.selectOption('select', { label: 'URGENT' });
    await expect(page.locator('h1')).toContainText('URGENT');

    await page.selectOption('select', { label: 'RESOLVED' });
    
    // 6. Navigate back to list, search for it
    await page.goto('/admin/operations/support');
    await page.fill('input[name="search"]', testId);
    await page.getByRole('button', { name: 'تصفية' }).click();

    // Should find the case
    await expect(page.locator(`text=${subject}`)).toBeVisible();
    
    // Filter by status
    await page.selectOption('select[name="status"]', 'RESOLVED');
    await page.getByRole('button', { name: 'تصفية' }).click();
    await expect(page.locator(`text=${subject}`)).toBeVisible();

    // Reopen it
    await page.getByRole('link', { name: 'عرض' }).first().click();
    await page.selectOption('select', { label: 'OPEN' });
    
    // Let's go back and search by status OPEN
    await page.goto('/admin/operations/support');
    await page.fill('input[name="search"]', testId);
    await page.selectOption('select[name="status"]', 'OPEN');
    await page.getByRole('button', { name: 'تصفية' }).click();
    
    await expect(page.locator(`text=${subject}`)).toBeVisible();
  });
});
