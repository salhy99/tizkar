import { test, expect } from '@playwright/test';

test.describe('Auth Flow E2E (Name + Password)', () => {
  test('register flow UI validation', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1')).toHaveText('إنشاء حساب جديد');
    await expect(page.locator('label[for="name"]')).toHaveText('الاسم');
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('input#confirmPassword')).toBeVisible();
  });

  test('login flow — wrong password', async ({ page, browserName }, testInfo) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toHaveText('تسجيل الدخول');
    
    const uniqueName = `أحمد علي ${browserName} ${testInfo.project.name}`;
    
    const nameInput = page.locator('#name');
    const passwordInput = page.locator('#password');
    
    await nameInput.click();
    await nameInput.fill(uniqueName);
    await passwordInput.click();
    await passwordInput.fill('wrongpass');
    
    await expect(nameInput).toHaveValue(uniqueName);
    await expect(passwordInput).toHaveValue('wrongpass');
    
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    
    const errorAlert = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
    await expect(errorAlert).toBeVisible({ timeout: 30000 });
    
    const alertText = await errorAlert.textContent();
    const validErrors = [
      'الاسم أو كلمة المرور غير صحيحة',
      'تم إجراء عدة محاولات تسجيل دخول. حاول مرة أخرى بعد قليل.',
      'الخدمة غير متاحة حالياً. الرجاء المحاولة لاحقاً.',
      'الخدمة غير متاحة مؤقتاً. الرجاء المحاولة لاحقاً.',
    ];
    expect(validErrors.some(e => alertText?.includes(e))).toBe(true);
  });

  test('unknown Name', async ({ page, browserName }, testInfo) => {
    await page.goto('/login');
    
    const uniqueName = `مستخدم مجهول ${browserName} ${testInfo.project.name}`;
    
    const nameInput = page.locator('#name');
    const passwordInput = page.locator('#password');
    
    await nameInput.click();
    await nameInput.fill(uniqueName);
    await passwordInput.click();
    await passwordInput.fill('anypass123');
    
    await expect(nameInput).toHaveValue(uniqueName);
    await expect(passwordInput).toHaveValue('anypass123');
    
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    
    const errorAlert = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
    await expect(errorAlert).toBeVisible({ timeout: 30000 });
    
    const alertText = await errorAlert.textContent();
    const validErrors = [
      'الاسم أو كلمة المرور غير صحيحة',
      'تم إجراء عدة محاولات تسجيل دخول. حاول مرة أخرى بعد قليل.',
      'الخدمة غير متاحة حالياً. الرجاء المحاولة لاحقاً.',
      'الخدمة غير متاحة مؤقتاً. الرجاء المحاولة لاحقاً.',
    ];
    expect(validErrors.some(e => alertText?.includes(e))).toBe(true);
  });

  test('password visibility toggle', async ({ page }) => {
    await page.goto('/login');
    const passInput = page.locator('#password');
    await expect(passInput).toHaveAttribute('type', 'password');
    
    await page.click('button[aria-label="إظهار كلمة المرور"]');
    await expect(passInput).toHaveAttribute('type', 'text');
    
    await page.click('button[aria-label="إخفاء كلمة المرور"]');
    await expect(passInput).toHaveAttribute('type', 'password');
  });
  
  test('protected redirect', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('admin access denial for unauthenticated user', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
