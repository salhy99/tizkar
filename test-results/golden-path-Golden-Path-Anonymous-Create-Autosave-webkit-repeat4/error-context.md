# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: golden-path.spec.ts >> Golden Path >> Anonymous Create & Autosave
- Location: tests\e2e\golden-path.spec.ts:25:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'استخدم هذا القالب' })
    - locator resolved to <button tabindex="0" type="button" data-slot="button" class="group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:bor…>استخدم هذا القالب</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7]
    - generic [ref=e13]:
      - button "Open issues overlay" [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: "0"
          - generic [ref=e17]: "1"
        - generic [ref=e18]: Issue
      - button "Collapse issues badge" [ref=e19]
  - alert [ref=e22]
  - main [ref=e23]:
    - generic [ref=e24]:
      - link [ref=e26]:
        - /url: /templates
        - button "→ العودة للقوالب" [ref=e27]
      - generic [ref=e28]:
        - generic [ref=e34]:
          - generic [ref=e35]:
            - generic [ref=e36]: بسم الله الرحمن الرحيم
            - heading "أحمد & زهراء" [level=1] [ref=e37]
            - paragraph [ref=e39]: بكل حب نتشرف بدعوتكم لمشاركتنا فرحتنا
          - generic [ref=e40]:
            - generic [ref=e41]: 20 أكتوبر 2026
            - generic [ref=e42]: 7:00 مساءً
          - generic [ref=e43]:
            - generic [ref=e44]: قاعة النخيل
            - generic [ref=e45]: العراق - بغداد
        - generic [ref=e46]:
          - generic [ref=e47]:
            - generic [ref=e48]: زفاف
            - heading "ليالي" [level=1] [ref=e49]
            - paragraph [ref=e50]: قالب كلاسيكي أنيق
          - generic [ref=e51]: ٢٥٬٠٠٠ د.ع
          - generic [ref=e52]:
            - heading "المميزات المدعومة في هذا القالب:" [level=3] [ref=e53]
            - list [ref=e54]:
              - listitem [ref=e55]:
                - generic [ref=e56]: ✓
                - text: تصميم متجاوب لجميع الأجهزة
              - listitem [ref=e57]:
                - generic [ref=e58]: ✓
                - text: تخصيص الألوان والنصوص
              - listitem [ref=e59]:
                - generic [ref=e60]: ✓
                - text: موسيقى خلفية
              - listitem [ref=e61]:
                - generic [ref=e62]: ✓
                - text: تأكيد الحضور (RSVP)
          - generic [ref=e63]:
            - button "استخدم هذا القالب" [ref=e64]
            - button "جرّب القالب (معاينة مجانية)" [ref=e65]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { generateTestId, cleanupTestInvitations } from './helpers/utils';
  3   | import path from 'path';
  4   | import fs from 'fs';
  5   | 
  6   | test.describe.serial('Golden Path', () => {
  7   |   let testId: string;
  8   |   let editorUrl: string;
  9   |   let publicSlug: string;
  10  | 
  11  |   let sharedContext: import('@playwright/test').BrowserContext;
  12  |   let sharedPage: import('@playwright/test').Page;
  13  | 
  14  |   test.beforeAll(async ({ browser }) => {
  15  |     testId = generateTestId();
  16  |     sharedContext = await browser.newContext();
  17  |     sharedPage = await sharedContext.newPage();
  18  |   });
  19  | 
  20  |   test.afterAll(async () => {
  21  |     await cleanupTestInvitations(testId);
  22  |     await sharedContext.close();
  23  |   });
  24  | 
  25  |   test('Anonymous Create & Autosave', async () => {
  26  |     const page = sharedPage;
  27  |     await page.goto('/templates');
  28  |     
  29  |     // Choose Layali
  30  |     await page.locator('a').filter({ hasText: 'ليالي' }).first().click();
> 31  |     await page.getByRole('button', { name: 'استخدم هذا القالب' }).click();
      |                                                                   ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  32  | 
  33  |     // Wait for either the editor URL or the "دخول المحرر" button
  34  |     try {
  35  |       await page.waitForURL(/\/editor\/.+/, { timeout: 60000 });
  36  |       console.log('Redirected to editor!');
  37  |     } catch {
  38  |       console.log('Did not redirect to editor, waiting for دخول المحرر');
  39  |       const enterEditorBtn = page.getByText('دخول المحرر');
  40  |       try {
  41  |         await enterEditorBtn.waitFor({ state: 'visible', timeout: 5000 });
  42  |         await enterEditorBtn.click();
  43  |       } catch (err) {
  44  |         console.log("PAGE CONTENT: ", await page.content());
  45  |         throw err;
  46  |       }
  47  |       await expect(page).toHaveURL(/\/editor\/.+/);
  48  |     }
  49  |     const parsedUrl = new URL(page.url());
  50  |     editorUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
  51  | 
  52  |     // Expand accordion if needed (shadcn accordion might be closed)
  53  |     const groomInput = page.getByPlaceholder('مثال: أحمد محمد');
  54  |     await page.getByRole('button', { name: 'معلومات المناسبة' }).click();
  55  |     try {
  56  |       await expect(groomInput).toBeVisible({ timeout: 5000 });
  57  |     } catch {
  58  |       // Retry click in case of hydration swallow
  59  |       await page.getByRole('button', { name: 'معلومات المناسبة' }).click();
  60  |     }
  61  | 
  62  |     // Fill details
  63  |     await page.getByPlaceholder('مثال: أحمد محمد').fill('عريس ' + testId);
  64  |     await page.getByPlaceholder('مثال: زهراء علي').fill('عروس ' + testId);
  65  |     await page.locator('input[type="date"]').fill('2026-10-20');
  66  |     await page.locator('input[type="date"]').blur();
  67  |     await page.locator('input[type="time"]').fill('19:00');
  68  |     await page.locator('input[type="time"]').blur();
  69  |     
  70  |     // Wait for autosave indicator
  71  |     await expect(page.getByText('تم الحفظ')).toBeAttached({ timeout: 10000 });
  72  | 
  73  |     // Reload page to verify persistence
  74  |     await page.reload();
  75  |     await page.getByRole('button', { name: 'معلومات المناسبة' }).click();
  76  |     try {
  77  |       await expect(groomInput).toBeVisible({ timeout: 5000 });
  78  |     } catch {
  79  |       await page.getByRole('button', { name: 'معلومات المناسبة' }).click();
  80  |     }
  81  |     await expect(page.getByPlaceholder('مثال: أحمد محمد')).toHaveValue('عريس ' + testId);
  82  |   });
  83  | 
  84  |   test('Storage Upload & Preview', async () => {
  85  |     const page = sharedPage;
  86  |     await page.goto(editorUrl);
  87  |     
  88  |     // Open gallery accordion
  89  |     await page.getByRole('button', { name: 'معرض الصور' }).click();
  90  | 
  91  |     // Upload image
  92  |     const fileChooserPromise = page.waitForEvent('filechooser');
  93  |     await page.getByText('+ إضافة صور').first().click();
  94  |     const fileChooser = await fileChooserPromise;
  95  |     
  96  |     await fileChooser.setFiles({
  97  |       name: 'test-image.png',
  98  |       mimeType: 'image/png',
  99  |       buffer: fs.readFileSync(path.join(__dirname, 'fixtures/test-image.png'))
  100 |     });
  101 |     
  102 |     // Check if the upload succeeds (queue item shows success)
  103 |     await expect(page.getByText('✓ تم').first()).toBeVisible({ timeout: 15000 });
  104 |   });
  105 | 
  106 |   test('Payment Order & Admin Confirmation & Publish', async () => {
  107 |     const page = sharedPage;
  108 |     await page.goto(editorUrl);
  109 |     
  110 |     // Go to publish / payment
  111 |     await page.getByRole('button', { name: 'اختيار الباقة' }).first().click();
  112 |     await page.waitForURL(/\/dashboard\/plans\/.+/);
  113 |     
  114 |     // Select a plan
  115 |     await page.getByRole('button', { name: 'ترقية' }).first().click();
  116 |     
  117 |     // Now on payment page
  118 |     await expect(page).toHaveURL(/\/dashboard\/payment\/.+/);
  119 |     // Order is already PENDING_PAYMENT upon selecting a plan.
  120 |     // Proceed directly to admin confirmation flow.
  121 |     
  122 |     // Admin Flow (Bypassed via Service Role since Admin uses OTP)
  123 |     const { createClient } = await import('@supabase/supabase-js');
  124 |     const adminClient = createClient(
  125 |       process.env.NEXT_PUBLIC_SUPABASE_URL!,
  126 |       process.env.SUPABASE_SERVICE_ROLE_KEY!
  127 |     );
  128 |     
  129 |     // Find the pending order for this invitation
  130 |     const { data: order } = await adminClient
  131 |       .from('orders')
```