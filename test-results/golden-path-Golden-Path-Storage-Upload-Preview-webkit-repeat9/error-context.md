# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: golden-path.spec.ts >> Golden Path >> Storage Upload & Preview
- Location: tests\e2e\golden-path.spec.ts:106:18

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('✓ تم').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('✓ تم').first()

```

```yaml
- banner:
  - button "← لوحة التحكم"
  - textbox "اسم الدعوة...": دعوة جديدة
  - button "إحصائيات"
  - button "سجل الحضور"
  - button "معاينة"
  - button "اختيار الباقة"
- complementary:
  - heading "اكتمال دعوتك" [level=2]
  - text: 100%
  - heading "الباقة الحالية" [level=3]:
    - button "الباقة الحالية"
  - heading "معلومات المناسبة" [level=3]:
    - button "معلومات المناسبة"
  - heading "نص الدعوة" [level=3]:
    - button "نص الدعوة"
  - heading "الأهل" [level=3]:
    - button "الأهل"
  - heading "القاعة والموقع" [level=3]:
    - button "القاعة والموقع"
  - heading "برنامج الحفل" [level=3]:
    - button "برنامج الحفل"
  - heading "ملاحظات هامة" [level=3]:
    - button "ملاحظات هامة"
  - heading "الخاتمة والتواصل" [level=3]:
    - button "الخاتمة والتواصل"
  - heading "معرض الصور" [level=3]:
    - button "معرض الصور" [expanded]
  - region "معرض الصور":
    - text: الصور 1 مستخدمة / 5 مسموحة
    - button "+ إضافة صور"
    - text: يمكنك سحب وإفلات الصور لترتيبها. الصورة الأولى ستكون في بداية المعرض.
    - button "Gallery item":
      - img "Gallery item"
    - button "تعيين كرئيسية"
    - button "×"
    - status
  - heading "الموسيقى" [level=3]:
    - button "الموسيقى"
  - heading "الأمان والاسترداد" [level=3]:
    - button "الأمان والاسترداد"
  - heading "ميزات قادمة (المراحل القادمة)" [level=3]:
    - button "ميزات قادمة (المراحل القادمة)"
- main:
  - text: بسم الله الرحمن الرحيم
  - heading "عريس E2E-1788216519439-1552" [level=1]
  - text: "&"
  - heading "عروس E2E-1788216519439-1552" [level=1]
  - paragraph: “بكل حب نتشرف بدعوتكم لمشاركتنا فرحتنا”
  - text: 2026-10-20 الثلاثاء العشرون من أكتوبر 19:00 الساعة السابعة مساءً
  - heading "متبقي على فرحتنا" [level=3]
  - text: 49 أيام 17 ساعة 09 دقيقة 30 ثانية 📍
  - heading "قاعة النخيل" [level=2]
  - paragraph: العراق - بغداد
  - heading "معرض الصور" [level=2]
  - img "صورة 1"
  - text: معاينة قسم تأكيد الحضور
  - heading "هل ستشاركنا فرحتنا؟" [level=3]
  - text: الاسم الكريم سأحضر بالتأكيد أعتذر عن الحضور تأكيد الرد
  - heading "وجودكم يزيد فرحتنا" [level=2]
  - text: صُممت عبر
  - link "زيارة موقع تذكار":
    - /url: https://tizkar.vercel.app
    - text: تِذكار
- alert
```

# Test source

```ts
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
> 126 |       process.env.SUPABASE_SERVICE_ROLE_KEY!
      |                                                             ^ Error: expect(locator).toBeVisible() failed
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
  143 |     }
  144 | 
  145 |     // Back to owner page
  146 |     await page.reload();
  147 |     // It should have redirected to the editor because it's PAID
  148 |     await expect(page).toHaveURL(/\/editor\/.+/);
  149 |     
  150 |     // Paid state indicator in the editor sidebar
  151 |     await page.getByRole('button', { name: 'الباقة الحالية' }).click();
  152 |     await expect(page.getByText('مفعل')).toBeVisible();
  153 | 
  154 |     // Publish
  155 |     await page.getByRole('button', { name: 'نشر الدعوة الآن' }).click();
  156 |     
  157 |     // Since paid, it should now publish
  158 |     await expect(page).toHaveURL(/\/editor\/.+\/share/);
  159 |     
  160 |     // Get public URL
  161 |     // Actually, ShareCenter has: span with dir-ltr
  162 |     const publicUrlSpan = page.locator('span.dir-ltr');
  163 |     const fullUrl = await publicUrlSpan.innerText();
  164 |     publicSlug = fullUrl.trim().split('/').filter(Boolean).pop() || '';
  165 |     expect(publicSlug).toBeTruthy();
  166 |   });
  167 | 
  168 |   test('Public Invitation & RSVP', async ({ browser }) => {
  169 |     const publicContext = await browser.newContext();
  170 |     const publicPage = await publicContext.newPage();
  171 |     
  172 |     await publicPage.goto(`/${publicSlug}`);
  173 |     try {
  174 |       await expect(publicPage.getByText('عريس ' + testId).first()).toBeVisible({ timeout: 10000 });
  175 |     } catch (e) {
  176 |       console.log('PUBLIC PAGE URL:', publicPage.url());
  177 |       console.log('PUBLIC PAGE CONTENT:', await publicPage.content());
  178 |       throw e;
  179 |     }
  180 |     
  181 |     // Submit RSVP
  182 |     await publicPage.getByPlaceholder('مثال: أحمد محمد').fill('ضيف ' + testId);
  183 |     // guest_count input
  184 |     await publicPage.locator('input[type="number"]').fill('2');
  185 |     
  186 |     // Wait for Next.js hydration before clicking (WebKit flake fix)
  187 |     await publicPage.waitForSelector('#rsvp[data-hydrated="true"]', { timeout: 15000 });
  188 |     
  189 |     await publicPage.waitForTimeout(500);
  190 |     await publicPage.getByRole('button', { name: 'تأكيد الرد' }).click();
  191 |     
  192 |     await expect(publicPage.getByText('شكراً لك')).toBeVisible({ timeout: 15000 });
  193 |     await publicContext.close();
  194 |   });
  195 | 
  196 |   test('Owner RSVP Dashboard', async () => {
  197 |     const page = sharedPage;
  198 |     await page.goto(editorUrl + '/guests');
  199 |     await expect(page).toHaveURL(/\/editor\/.+\/guests/);
  200 |     // Guest list is locked on Basic plan, but metrics are visible
  201 |     // await expect(page.getByText('ضيف ' + testId)).toBeVisible();
  202 |     await expect(page.getByText('2', { exact: true })).toBeVisible(); // guest count
  203 |   });
  204 | 
  205 |   test('Share Center & OG / Story', async () => {
  206 |     const page = sharedPage;
  207 |     await page.goto(editorUrl + '/share');
  208 |     await expect(page.getByText('منشورة ✓')).toBeVisible();
  209 |     
  210 |     // Story API Check (Gate check since we are on Basic plan)
  211 |     const storyRes = await page.request.get(`/api/invitations/${publicSlug}/story`);
  212 |     expect(storyRes.status()).toBe(401); 
  213 |     
  214 |     // Check that the feature is locked in the UI
  215 |     await expect(page.getByText('هذه الميزة متاحة ضمن باقة Plus.')).toBeVisible();
  216 | 
  217 |     // OG Check
  218 |     const ogRes = await page.request.get(`/${publicSlug}/opengraph-image`);
  219 |     expect(ogRes.status()).toBe(200);
  220 |     expect(ogRes.headers()['content-type']).toBe('image/png');
  221 |   });
  222 | });
  223 | 
```