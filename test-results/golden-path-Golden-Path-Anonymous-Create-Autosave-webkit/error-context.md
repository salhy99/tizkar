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
  - waiting for getByText('دخول المحرر')
    - locator resolved to <a href="/editor/ab58acfd-c9af-4d45-9e17-0ec30268e97a" class="block w-full text-center bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition-colors mt-6">دخول المحرر</a>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - performing click action
    - click action done
    - waiting for scheduled navigations to finish

```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - banner [ref=f1e4]:
    - generic [ref=f1e5]:
      - button "← لوحة التحكم" [ref=f1e6]
      - textbox "اسم الدعوة..." [ref=f1e8]: دعوة جديدة
    - generic [ref=f1e9]:
      - generic [ref=f1e10]:
        - button "إحصائيات" [ref=f1e11]
        - button "سجل الحضور" [ref=f1e12]
        - button "معاينة" [ref=f1e13]
      - button "اختيار الباقة" [ref=f1e14]
  - generic [ref=f1e15]:
    - complementary [ref=f1e16]:
      - generic [ref=f1e17]:
        - heading "اكتمال دعوتك" [level=2] [ref=f1e18]
        - generic [ref=f1e19]: 0%
        - paragraph [ref=f1e22]: يرجى إكمال البيانات الأساسية (الأسماء، التاريخ، والوقت)
      - generic [ref=f1e24]:
        - heading [level=3] [ref=f1e26]:
          - button "الباقة الحالية" [ref=f1e27]
        - heading [level=3] [ref=f1e29]:
          - button "معلومات المناسبة" [ref=f1e30]
        - heading [level=3] [ref=f1e32]:
          - button "نص الدعوة" [ref=f1e33]
        - heading [level=3] [ref=f1e35]:
          - button "الأهل" [ref=f1e36]
        - heading [level=3] [ref=f1e38]:
          - button "القاعة والموقع" [ref=f1e39]
        - heading [level=3] [ref=f1e41]:
          - button "برنامج الحفل" [ref=f1e42]
        - heading [level=3] [ref=f1e44]:
          - button "ملاحظات هامة" [ref=f1e45]
        - heading [level=3] [ref=f1e47]:
          - button "الخاتمة والتواصل" [ref=f1e48]
        - heading [level=3] [ref=f1e50]:
          - button "معرض الصور" [ref=f1e51]
        - heading [level=3] [ref=f1e53]:
          - button "الموسيقى" [ref=f1e54]
        - heading [level=3] [ref=f1e56]:
          - button "الأمان والاسترداد" [ref=f1e57]
        - heading [level=3] [ref=f1e59]:
          - button "ميزات قادمة (المراحل القادمة)" [ref=f1e60]
    - main [ref=f1e61]:
      - generic [ref=f1e67]:
        - generic [ref=f1e71]:
          - generic [ref=f1e72]: بسم الله الرحمن الرحيم
          - generic [ref=f1e73]:
            - heading "العريس" [level=1] [ref=f1e74]
            - generic [ref=f1e75]: "&"
            - heading "العروس" [level=1] [ref=f1e76]
          - paragraph [ref=f1e78]: “بكل حب نتشرف بدعوتكم لمشاركتنا فرحتنا”
        - generic [ref=f1e80]:
          - generic [ref=f1e81]: 2026-10-20
          - generic [ref=f1e82]: الثلاثاء العشرون من أكتوبر
          - generic [ref=f1e84]: 19:00
          - generic [ref=f1e85]: الساعة السابعة مساءً
        - generic [ref=f1e86]:
          - generic [ref=f1e87]: 📍
          - heading "قاعة النخيل" [level=2] [ref=f1e88]
          - paragraph [ref=f1e89]: العراق - بغداد
        - generic:
          - generic: معاينة قسم تأكيد الحضور
          - heading "هل ستشاركنا فرحتنا؟" [level=3]
          - generic:
            - generic: الاسم الكريم
            - generic:
              - generic: سأحضر بالتأكيد
              - generic: أعتذر عن الحضور
            - generic: تأكيد الرد
        - generic [ref=f1e90]:
          - heading "وجودكم يزيد فرحتنا" [level=2] [ref=f1e91]
          - generic [ref=f1e92]:
            - generic [ref=f1e93]: صُممت عبر
            - link "زيارة موقع تذكار" [ref=f1e94]:
              - /url: https://tizkar.vercel.app
              - text: تِذكار
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
  31  |     await page.getByRole('button', { name: 'استخدم هذا القالب' }).click();
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
> 42  |         await enterEditorBtn.click();
      |                              ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
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
  132 |       .select('id')
  133 |       .eq('status', 'PENDING_PAYMENT')
  134 |       .order('created_at', { ascending: false })
  135 |       .limit(1)
  136 |       .single();
  137 |       
  138 |     if (order) {
  139 |       await adminClient.from('orders').update({ 
  140 |         status: 'PAID',
  141 |         paid_at: new Date().toISOString()
  142 |       }).eq('id', order.id);
```