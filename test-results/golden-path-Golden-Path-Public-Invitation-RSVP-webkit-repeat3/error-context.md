# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: golden-path.spec.ts >> Golden Path >> Public Invitation & RSVP
- Location: tests\e2e\golden-path.spec.ts:168:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('شكراً لك')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('شكراً لك')

```

```yaml
- text: بسم الله الرحمن الرحيم
- heading "عريس E2E-1788215675029-5825" [level=1]
- text: "&"
- heading "عروس E2E-1788215675029-5825" [level=1]
- paragraph: “بكل حب نتشرف بدعوتكم لمشاركتنا فرحتنا”
- text: 2026-10-20 الثلاثاء العشرون من أكتوبر 19:00 الساعة السابعة مساءً
- heading "متبقي على فرحتنا" [level=3]
- text: 49 أيام 17 ساعة 23 دقيقة 05 ثانية 📍
- heading "قاعة النخيل" [level=2]
- paragraph: العراق - بغداد
- heading "معرض الصور" [level=2]
- img "صورة 1"
- heading "هل ستشاركنا فرحتنا؟" [level=3]
- text: الاسم الكريم
- 'textbox "مثال: أحمد محمد"'
- text: الحضور
- button "سأحضر بالتأكيد"
- button "أعتذر عن الحضور"
- text: عدد الحضور الإجمالي (بمن فيهم أنت)
- spinbutton: "2"
- text: رسالة تهنئة (اختياري)
- textbox "اكتب أمنياتك أو تهنئتك هنا..."
- button "تأكيد الرد"
- heading "وجودكم يزيد فرحتنا" [level=2]
- text: صُممت عبر
- link "زيارة موقع تذكار":
  - /url: https://tizkar.vercel.app
  - text: تِذكار
- alert
```

# Test source

```ts
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
  189 |     await publicPage.getByRole('button', { name: 'تأكيد الرد' }).click({ force: true });
  190 |     
> 191 |     await expect(publicPage.getByText('شكراً لك')).toBeVisible({ timeout: 15000 });
      |                                                    ^ Error: expect(locator).toBeVisible() failed
  192 |     await publicContext.close();
  193 |   });
  194 | 
  195 |   test('Owner RSVP Dashboard', async () => {
  196 |     const page = sharedPage;
  197 |     await page.goto(editorUrl + '/guests');
  198 |     await expect(page).toHaveURL(/\/editor\/.+\/guests/);
  199 |     // Guest list is locked on Basic plan, but metrics are visible
  200 |     // await expect(page.getByText('ضيف ' + testId)).toBeVisible();
  201 |     await expect(page.getByText('2', { exact: true })).toBeVisible(); // guest count
  202 |   });
  203 | 
  204 |   test('Share Center & OG / Story', async () => {
  205 |     const page = sharedPage;
  206 |     await page.goto(editorUrl + '/share');
  207 |     await expect(page.getByText('منشورة ✓')).toBeVisible();
  208 |     
  209 |     // Story API Check (Gate check since we are on Basic plan)
  210 |     const storyRes = await page.request.get(`/api/invitations/${publicSlug}/story`);
  211 |     expect(storyRes.status()).toBe(401); 
  212 |     
  213 |     // Check that the feature is locked in the UI
  214 |     await expect(page.getByText('هذه الميزة متاحة ضمن باقة Plus.')).toBeVisible();
  215 | 
  216 |     // OG Check
  217 |     const ogRes = await page.request.get(`/${publicSlug}/opengraph-image`);
  218 |     expect(ogRes.status()).toBe(200);
  219 |     expect(ogRes.headers()['content-type']).toBe('image/png');
  220 |   });
  221 | });
  222 | 
```