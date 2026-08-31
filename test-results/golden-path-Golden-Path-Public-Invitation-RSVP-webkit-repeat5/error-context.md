# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: golden-path.spec.ts >> Golden Path >> Public Invitation & RSVP
- Location: tests\e2e\golden-path.spec.ts:195:18

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
- heading "عريس E2E-1788215845782-94" [level=1]
- text: "&"
- heading "عروس E2E-1788215845782-94" [level=1]
- paragraph: “بكل حب نتشرف بدعوتكم لمشاركتنا فرحتنا”
- text: 2026-10-20 الثلاثاء العشرون من أكتوبر 19:00 الساعة السابعة مساءً
- heading "متبقي على فرحتنا" [level=3]
- text: 49 أيام 17 ساعة 19 دقيقة 42 ثانية 📍
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
      |                                                               ^ Error: expect(locator).toBeVisible() failed
```