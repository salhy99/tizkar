# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: golden-path.spec.ts >> Golden Path >> Anonymous Create & Autosave
- Location: tests\e2e\golden-path.spec.ts:19:7

# Error details

```
Error: page.content: Unable to retrieve content because the page is navigating and changing the content.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { generateTestId, cleanupTestInvitations, loginAsAdmin } from './helpers/utils';
  3   | import path from 'path';
  4   | import fs from 'fs';
  5   | 
  6   | test.describe.serial('Golden Path', () => {
  7   |   let testId: string;
  8   |   let editorUrl: string;
  9   |   let publicSlug: string;
  10  | 
  11  |   test.beforeAll(async () => {
  12  |     testId = generateTestId();
  13  |   });
  14  | 
  15  |   test.afterAll(async () => {
  16  |     await cleanupTestInvitations(testId);
  17  |   });
  18  | 
  19  |   test('Anonymous Create & Autosave', async ({ page }) => {
  20  |     await page.goto('/templates');
  21  |     
  22  |     // Choose Layali
  23  |     await page.locator('a').filter({ hasText: 'ليالي' }).first().click();
  24  |     await page.getByRole('button', { name: 'استخدم هذا القالب' }).click();
  25  | 
  26  |     // Wait for either the editor URL or the "دخول المحرر" button
  27  |     try {
  28  |       await page.waitForURL(/\/editor\/.+/, { timeout: 60000 });
  29  |       console.log('Redirected to editor!');
  30  |     } catch (e) {
  31  |       console.log('Did not redirect to editor, waiting for دخول المحرر');
  32  |       const enterEditorBtn = page.getByText('دخول المحرر');
  33  |       try {
  34  |         await enterEditorBtn.waitFor({ state: 'visible', timeout: 5000 });
  35  |         await enterEditorBtn.click();
  36  |       } catch (err) {
> 37  |         console.log("PAGE CONTENT: ", await page.content());
      |                                                  ^ Error: page.content: Unable to retrieve content because the page is navigating and changing the content.
  38  |         throw err;
  39  |       }
  40  |       await expect(page).toHaveURL(/\/editor\/.+/);
  41  |     }
  42  |     editorUrl = page.url();
  43  | 
  44  |     // Expand accordion if needed (shadcn accordion might be closed)
  45  |     await page.getByRole('button', { name: 'معلومات المناسبة' }).click();
  46  | 
  47  |     // Fill details
  48  |     await page.getByPlaceholder('مثال: أحمد محمد').fill('عريس ' + testId);
  49  |     await page.getByPlaceholder('مثال: زهراء علي').fill('عروس ' + testId);
  50  |     
  51  |     // Wait for autosave indicator
  52  |     await expect(page.getByText('تم الحفظ')).toBeVisible({ timeout: 10000 });
  53  | 
  54  |     // Reload page to verify persistence
  55  |     await page.reload();
  56  |     await page.getByRole('button', { name: 'معلومات المناسبة' }).click();
  57  |     await expect(page.getByPlaceholder('مثال: أحمد محمد')).toHaveValue('عريس ' + testId);
  58  |   });
  59  | 
  60  |   test('Storage Upload & Preview', async ({ page }) => {
  61  |     await page.goto(editorUrl);
  62  |     
  63  |     // Open gallery accordion
  64  |     await page.getByRole('button', { name: 'معرض الصور' }).click();
  65  | 
  66  |     // Upload image
  67  |     const fileChooserPromise = page.waitForEvent('filechooser');
  68  |     await page.getByText('+ إضافة صور').first().click();
  69  |     const fileChooser = await fileChooserPromise;
  70  |     
  71  |     await fileChooser.setFiles({
  72  |       name: 'test-image.png',
  73  |       mimeType: 'image/png',
  74  |       buffer: fs.readFileSync(path.join(__dirname, 'fixtures/test-image.png'))
  75  |     });
  76  |     
  77  |     // Check if the upload succeeds (queue item shows success)
  78  |     await expect(page.getByText('✓ تم').first()).toBeVisible({ timeout: 15000 });
  79  |   });
  80  | 
  81  |   test('Payment Order & Admin Confirmation & Publish', async ({ page, context }) => {
  82  |     await page.goto(editorUrl);
  83  |     
  84  |     // Go to publish / payment
  85  |     await page.getByRole('button', { name: 'نشر الدعوة' }).click();
  86  |     
  87  |     // Select a plan
  88  |     await page.getByRole('button', { name: 'اختيار الباقة' }).first().click();
  89  |     
  90  |     // Now on payment page
  91  |     await expect(page).toHaveURL(/\/dashboard\/payment\/.+/);
  92  |     
  93  |     // Click manual transfer
  94  |     await page.getByRole('button', { name: 'تأكيد التحويل وإنهاء الطلب' }).click();
  95  |     
  96  |     // Should see pending status
  97  |     await expect(page.getByText('قيد المراجعة')).toBeVisible();
  98  |     
  99  |     // Admin Flow
  100 |     const adminPage = await context.newPage();
  101 |     await loginAsAdmin(adminPage);
  102 |     
  103 |     await adminPage.goto('/admin/orders');
  104 |     // Find our specific testId title
  105 |     await adminPage.locator('tr').filter({ hasText: testId }).getByRole('button', { name: 'تأكيد' }).click();
  106 |     
  107 |     await adminPage.close();
  108 | 
  109 |     // Back to owner page
  110 |     await page.reload();
  111 |     // Paid state
  112 |     await expect(page.getByText('مؤكد')).toBeVisible();
  113 | 
  114 |     // Go to dashboard to publish
  115 |     await page.goto(editorUrl);
  116 |     await page.getByRole('button', { name: 'نشر الدعوة' }).click();
  117 |     
  118 |     // Since paid, it should now publish
  119 |     await expect(page).toHaveURL(/\/editor\/.+\/share/);
  120 |     
  121 |     // Get public URL
  122 |     const publicUrlInput = page.locator('input[readonly]').first(); // Wait, the UI uses span for public url now
  123 |     // Actually, ShareCenter has: span with dir-ltr
  124 |     const publicUrlSpan = page.locator('span.dir-ltr');
  125 |     const fullUrl = await publicUrlSpan.innerText();
  126 |     publicSlug = fullUrl.split('/').pop() || '';
  127 |     expect(publicSlug).toBeTruthy();
  128 |   });
  129 | 
  130 |   test('Public Invitation & RSVP', async ({ browser }) => {
  131 |     const publicContext = await browser.newContext();
  132 |     const publicPage = await publicContext.newPage();
  133 |     
  134 |     await publicPage.goto(`/${publicSlug}`);
  135 |     await expect(publicPage.getByText(testId)).toBeVisible();
  136 |     
  137 |     // Submit RSVP
```