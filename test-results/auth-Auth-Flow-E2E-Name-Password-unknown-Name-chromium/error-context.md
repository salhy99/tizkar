# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Auth Flow E2E (Name + Password) >> unknown Name
- Location: tests\e2e\auth.spec.ts:43:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - link "تِذكار" [ref=e5] [cursor=pointer]:
          - /url: /
        - heading "تسجيل الدخول" [level=1] [ref=e6]
      - alert [ref=e7]: الخدمة غير متاحة حالياً. الرجاء المحاولة لاحقاً.
      - generic [ref=e8]:
        - generic [ref=e9]:
          - text: الاسم
          - textbox "الاسم" [ref=e10]:
            - /placeholder: أدخل اسمك
            - text: مستخدم مجهول chromium chromium
        - generic [ref=e11]:
          - text: كلمة المرور
          - generic [ref=e12]:
            - textbox "كلمة المرور" [ref=e13]:
              - /placeholder: ••••••••
              - text: anypass123
            - button "إظهار كلمة المرور" [ref=e14]
        - button "نسيت كلمة المرور؟" [ref=e19]
        - button "تسجيل الدخول" [ref=e20]
        - link "ليس لديك حساب؟ إنشاء حساب جديد" [ref=e22] [cursor=pointer]:
          - /url: /register
  - alert [ref=e23]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Auth Flow E2E (Name + Password)', () => {
  4  |   test('register flow UI validation', async ({ page }) => {
  5  |     await page.goto('/register');
  6  |     await expect(page.locator('h1')).toHaveText('إنشاء حساب جديد');
  7  |     await expect(page.locator('label[for="name"]')).toHaveText('الاسم');
  8  |     await expect(page.locator('input#name')).toBeVisible();
  9  |     await expect(page.locator('input#password')).toBeVisible();
  10 |     await expect(page.locator('input#confirmPassword')).toBeVisible();
  11 |   });
  12 | 
  13 |   test('login flow — wrong password', async ({ page, browserName }, testInfo) => {
  14 |     await page.goto('/login');
  15 |     await expect(page.locator('h1')).toHaveText('تسجيل الدخول');
  16 |     
  17 |     const uniqueName = `أحمد علي ${browserName} ${testInfo.project.name}`;
  18 |     
  19 |     const nameInput = page.locator('#name');
  20 |     const passwordInput = page.locator('#password');
  21 |     
  22 |     await nameInput.click();
  23 |     await nameInput.fill(uniqueName);
  24 |     await passwordInput.click();
  25 |     await passwordInput.fill('wrongpass');
  26 |     
  27 |     await expect(nameInput).toHaveValue(uniqueName);
  28 |     await expect(passwordInput).toHaveValue('wrongpass');
  29 |     
  30 |     await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  31 |     
  32 |     const errorAlert = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
  33 |     await expect(errorAlert).toBeVisible({ timeout: 30000 });
  34 |     
  35 |     const alertText = await errorAlert.textContent();
  36 |     const validErrors = [
  37 |       'الاسم أو كلمة المرور غير صحيحة',
  38 |       'تم إجراء عدة محاولات تسجيل دخول. حاول مرة أخرى بعد قليل.',
  39 |     ];
  40 |     expect(validErrors.some(e => alertText?.includes(e))).toBe(true);
  41 |   });
  42 | 
  43 |   test('unknown Name', async ({ page, browserName }, testInfo) => {
  44 |     await page.goto('/login');
  45 |     
  46 |     const uniqueName = `مستخدم مجهول ${browserName} ${testInfo.project.name}`;
  47 |     
  48 |     const nameInput = page.locator('#name');
  49 |     const passwordInput = page.locator('#password');
  50 |     
  51 |     await nameInput.click();
  52 |     await nameInput.fill(uniqueName);
  53 |     await passwordInput.click();
  54 |     await passwordInput.fill('anypass123');
  55 |     
  56 |     await expect(nameInput).toHaveValue(uniqueName);
  57 |     await expect(passwordInput).toHaveValue('anypass123');
  58 |     
  59 |     await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  60 |     
  61 |     const errorAlert = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
  62 |     await expect(errorAlert).toBeVisible({ timeout: 30000 });
  63 |     
  64 |     const alertText = await errorAlert.textContent();
  65 |     const validErrors = [
  66 |       'الاسم أو كلمة المرور غير صحيحة',
  67 |       'تم إجراء عدة محاولات تسجيل دخول. حاول مرة أخرى بعد قليل.',
  68 |     ];
> 69 |     expect(validErrors.some(e => alertText?.includes(e))).toBe(true);
     |                                                           ^ Error: expect(received).toBe(expected) // Object.is equality
  70 |   });
  71 | 
  72 |   test('password visibility toggle', async ({ page }) => {
  73 |     await page.goto('/login');
  74 |     const passInput = page.locator('#password');
  75 |     await expect(passInput).toHaveAttribute('type', 'password');
  76 |     
  77 |     await page.click('button[aria-label="إظهار كلمة المرور"]');
  78 |     await expect(passInput).toHaveAttribute('type', 'text');
  79 |     
  80 |     await page.click('button[aria-label="إخفاء كلمة المرور"]');
  81 |     await expect(passInput).toHaveAttribute('type', 'password');
  82 |   });
  83 |   
  84 |   test('protected redirect', async ({ page }) => {
  85 |     await page.goto('/dashboard');
  86 |     await expect(page).toHaveURL(/.*\/login/);
  87 |   });
  88 | 
  89 |   test('admin access denial for unauthenticated user', async ({ page }) => {
  90 |     await page.goto('/admin');
  91 |     await expect(page).toHaveURL(/.*\/login/);
  92 |   });
  93 | });
  94 | 
```