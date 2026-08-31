import { test, expect } from '@playwright/test';
import { generateTestId, cleanupTestInvitations } from './helpers/utils';
import path from 'path';
import fs from 'fs';

test.describe.serial('Golden Path', () => {
  let testId: string;
  let editorUrl: string;
  let publicSlug: string;

  let sharedContext: import('@playwright/test').BrowserContext;
  let sharedPage: import('@playwright/test').Page;

  test.beforeAll(async ({ browser }) => {
    testId = generateTestId();
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
  });

  test.afterAll(async () => {
    await cleanupTestInvitations(testId);
    await sharedContext.close();
  });

  test('Anonymous Create & Autosave', async () => {
    const page = sharedPage;
    await page.goto('/templates');
    
    // Choose Layali
    await page.locator('a').filter({ hasText: 'ليالي' }).first().click();
    await page.getByRole('button', { name: 'استخدم هذا القالب' }).click();

    // Wait for either the editor URL or the "دخول المحرر" button
    try {
      await page.waitForURL(/\/editor\/.+/, { timeout: 60000 });
      console.log('Redirected to editor!');
    } catch {
      console.log('Did not redirect to editor, waiting for دخول المحرر');
      const enterEditorBtn = page.getByText('دخول المحرر');
      try {
        await enterEditorBtn.waitFor({ state: 'visible', timeout: 5000 });
        await enterEditorBtn.click();
      } catch (err) {
        console.log("PAGE CONTENT: ", await page.content());
        throw err;
      }
      await expect(page).toHaveURL(/\/editor\/.+/);
    }
    const parsedUrl = new URL(page.url());
    editorUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;

    // Expand accordion if needed (shadcn accordion might be closed)
    const groomInput = page.getByPlaceholder('مثال: أحمد محمد');
    await page.getByRole('button', { name: 'معلومات المناسبة' }).click();
    try {
      await expect(groomInput).toBeVisible({ timeout: 5000 });
    } catch {
      // Retry click in case of hydration swallow
      await page.getByRole('button', { name: 'معلومات المناسبة' }).click();
    }

    // Fill details
    await page.getByPlaceholder('مثال: أحمد محمد').fill('عريس ' + testId);
    await page.getByPlaceholder('مثال: زهراء علي').fill('عروس ' + testId);
    await page.locator('input[type="date"]').fill('2026-10-20');
    await page.locator('input[type="time"]').fill('19:00');
    
    // Wait for autosave indicator
    await expect(page.getByText('تم الحفظ')).toBeAttached({ timeout: 10000 });

    // Reload page to verify persistence
    await page.reload();
    await page.getByRole('button', { name: 'معلومات المناسبة' }).click();
    try {
      await expect(groomInput).toBeVisible({ timeout: 5000 });
    } catch {
      await page.getByRole('button', { name: 'معلومات المناسبة' }).click();
    }
    await expect(page.getByPlaceholder('مثال: أحمد محمد')).toHaveValue('عريس ' + testId);
  });

  test('Storage Upload & Preview', async () => {
    const page = sharedPage;
    await page.goto(editorUrl);
    
    // Open gallery accordion
    await page.getByRole('button', { name: 'معرض الصور' }).click();

    // Upload image
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('+ إضافة صور').first().click();
    const fileChooser = await fileChooserPromise;
    
    await fileChooser.setFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: fs.readFileSync(path.join(__dirname, 'fixtures/test-image.png'))
    });
    
    // Check if the upload succeeds (queue item shows success)
    await expect(page.getByText('✓ تم').first()).toBeVisible({ timeout: 15000 });
  });

  test('Payment Order & Admin Confirmation & Publish', async () => {
    const page = sharedPage;
    await page.goto(editorUrl);
    
    // Go to publish / payment
    await page.getByRole('button', { name: 'اختيار الباقة' }).first().click();
    await page.waitForURL(/\/dashboard\/plans\/.+/);
    
    // Select a plan
    await page.getByRole('button', { name: 'ترقية' }).first().click();
    
    // Now on payment page
    await expect(page).toHaveURL(/\/dashboard\/payment\/.+/);
    // Order is already PENDING_PAYMENT upon selecting a plan.
    // Proceed directly to admin confirmation flow.
    
    // Admin Flow (Bypassed via Service Role since Admin uses OTP)
    const { createClient } = await import('@supabase/supabase-js');
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Find the pending order for this invitation
    const { data: order } = await adminClient
      .from('orders')
      .select('id')
      .eq('status', 'PENDING_PAYMENT')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (order) {
      await adminClient.from('orders').update({ 
        status: 'PAID',
        paid_at: new Date().toISOString()
      }).eq('id', order.id);
    }

    // Back to owner page
    await page.reload();
    // It should have redirected to the editor because it's PAID
    await expect(page).toHaveURL(/\/editor\/.+/);
    
    // Paid state indicator in the editor sidebar
    await page.getByRole('button', { name: 'الباقة الحالية' }).click();
    await expect(page.getByText('مفعل')).toBeVisible();

    // Publish
    await page.getByRole('button', { name: 'نشر الدعوة الآن' }).click();
    
    // Since paid, it should now publish
    await expect(page).toHaveURL(/\/editor\/.+\/share/);
    
    // Get public URL
    // Actually, ShareCenter has: span with dir-ltr
    const publicUrlSpan = page.locator('span.dir-ltr');
    const fullUrl = await publicUrlSpan.innerText();
    publicSlug = fullUrl.trim().split('/').filter(Boolean).pop() || '';
    expect(publicSlug).toBeTruthy();
  });

  test('Public Invitation & RSVP', async ({ browser }) => {
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();
    
    await publicPage.goto(`/${publicSlug}`);
    try {
      await expect(publicPage.getByText('عريس ' + testId).first()).toBeVisible({ timeout: 10000 });
    } catch (e) {
      console.log('PUBLIC PAGE URL:', publicPage.url());
      console.log('PUBLIC PAGE CONTENT:', await publicPage.content());
      throw e;
    }
    
    // Submit RSVP
    await publicPage.getByPlaceholder('مثال: أحمد محمد').fill('ضيف ' + testId);
    // guest_count input
    await publicPage.locator('input[type="number"]').fill('2');
    
    // Wait for Next.js hydration before clicking (WebKit flake fix)
    await publicPage.waitForSelector('#rsvp[data-hydrated="true"]', { timeout: 15000 });
    
    await publicPage.getByRole('button', { name: 'تأكيد الرد' }).click({ force: true });
    
    await expect(publicPage.getByText('شكراً لك')).toBeVisible({ timeout: 15000 });
    await publicContext.close();
  });

  test('Owner RSVP Dashboard', async () => {
    const page = sharedPage;
    await page.goto(editorUrl + '/guests');
    await expect(page).toHaveURL(/\/editor\/.+\/guests/);
    // Guest list is locked on Basic plan, but metrics are visible
    // await expect(page.getByText('ضيف ' + testId)).toBeVisible();
    await expect(page.getByText('2')).toBeVisible(); // guest count
  });

  test('Share Center & OG / Story', async () => {
    const page = sharedPage;
    await page.goto(editorUrl + '/share');
    await expect(page.getByText('منشورة ✓')).toBeVisible();
    
    // Story API Check (Gate check since we are on Basic plan)
    const storyRes = await page.request.get(`/api/invitations/${publicSlug}/story`);
    expect(storyRes.status()).toBe(401); 
    
    // Check that the feature is locked in the UI
    await expect(page.getByText('هذه الميزة متاحة ضمن باقة Plus.')).toBeVisible();

    // OG Check
    const ogRes = await page.request.get(`/${publicSlug}/opengraph-image`);
    expect(ogRes.status()).toBe(200);
    expect(ogRes.headers()['content-type']).toBe('image/png');
  });
});
