# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: funnel.spec.ts >> Funnel E2E >> Complete funnel traversal and telemetry verification
- Location: tests\e2e\funnel.spec.ts:12:7

# Error details

```
TimeoutError: locator.waitFor: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('a:has-text("دخول المحرر")') to be visible

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
  - generic [ref=e24]:
    - generic [ref=e25]: ⚠️
    - heading "حدث خطأ" [level=1] [ref=e26]
    - paragraph [ref=e27]: هذا القالب قيد التطوير وغير متاح للاستخدام
    - link "العودة للقوالب" [ref=e28]:
      - /url: /templates
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { createClient } from '@supabase/supabase-js';
  3   | 
  4   | // Setup Supabase Client for verifications
  5   | const supabase = createClient(
  6   |   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  7   |   process.env.SUPABASE_SERVICE_ROLE_KEY!
  8   | );
  9   | 
  10  | test.describe('Funnel E2E', () => {
  11  |   // Use a predictable cookie/session ID for the test by clearing context and visiting.
  12  |   test('Complete funnel traversal and telemetry verification', async ({ browser }) => {
  13  |     const context = await browser.newContext();
  14  |     const page = await context.newPage();
  15  | 
  16  |     // 1. Landing View
  17  |     await page.goto('/');
  18  |     // Wait for the funnel tracker to fire
  19  |     await page.waitForTimeout(1000); 
  20  | 
  21  |     await page.waitForFunction(() => document.cookie.includes('tizkar_funnel_session'));
  22  |     const cookies = await context.cookies();
  23  |     const sessionCookie = cookies.find(c => c.name === 'tizkar_funnel_session');
  24  |     expect(sessionCookie).toBeDefined();
  25  |     const sessionId = sessionCookie!.value;
  26  | 
  27  |     // Optional: We can mark it synthetic in DB to avoid messing with stats, but test runs against dev DB anyway.
  28  |     // For now we just verify events were generated.
  29  | 
  30  |     // 2. Templates Catalog View
  31  |     await page.click('text=تصفح القوالب');
  32  |     await page.waitForURL('/templates');
  33  |     await page.waitForTimeout(1000);
  34  | 
  35  |     // 3. Template Detail View
  36  |     // The first template has "عرض التفاصيل"
  37  |     await page.locator('text=عرض التفاصيل').first().click();
  38  |     await page.waitForURL(/\/templates\/.+/);
  39  |     await page.waitForTimeout(1000);
  40  | 
  41  |     // 4. Template Selected
  42  |     await page.click('text=استخدم هذا القالب');
  43  |     await page.waitForURL(/\/dashboard\/create/);
  44  | 
  45  |     // 5. Draft Created (Background) -> Click Enter Editor
  46  |     const enterEditorLink = page.locator('a:has-text("دخول المحرر")');
> 47  |     await enterEditorLink.waitFor({ state: 'visible', timeout: 30000 });
      |                           ^ TimeoutError: locator.waitFor: Timeout 30000ms exceeded.
  48  |     await enterEditorLink.click();
  49  |     
  50  |     // Should go to editor
  51  |     await page.waitForURL(/\/editor\/.+/);
  52  |     const editorUrl = page.url();
  53  |     const invitationId = editorUrl.split('/editor/')[1];
  54  |     
  55  |     // 6. Editor Opened
  56  |     await page.waitForTimeout(1000);
  57  | 
  58  |     // 7. Editor Edited (trigger autosave by changing title)
  59  |     await page.fill('input[type="text"]', 'Test Invitation Title Edit');
  60  |     // Wait for autosave to complete (SAVING -> SAVED -> IDLE)
  61  |     await page.waitForSelector('text=حفظ التغييرات', { state: 'attached', timeout: 5000 });
  62  |     await page.waitForTimeout(3000); // give time for telemetry
  63  | 
  64  |     // 8. Package Viewed (Click Continue)
  65  |     await page.click('text=حفظ ومتابعة');
  66  |     await page.waitForURL(/\/dashboard\/plans\/.+/);
  67  |     await page.waitForTimeout(1000);
  68  | 
  69  |     // 9. Package Selected (Select PLUS)
  70  |     await page.locator('button:has-text("اختيار الباقة")').nth(0).click(); // Basic or Plus
  71  | 
  72  |     // 10. Payment Order Created
  73  |     await page.waitForURL(/\/dashboard\/payment\/.+/);
  74  |     const paymentUrl = page.url();
  75  |     const orderId = paymentUrl.split('/payment/')[1].split('?')[0];
  76  |     await page.waitForTimeout(1000);
  77  | 
  78  |     // 11. WhatsApp Clicked
  79  |     await page.click('text=الدفع عبر واتساب');
  80  |     await page.waitForTimeout(1000);
  81  | 
  82  |     // 12. Payment Confirmed (Simulate Admin Action)
  83  |     const { error: paymentError } = await supabase.from('orders').update({ status: 'PAID', paid_at: new Date().toISOString() }).eq('id', orderId);
  84  |     expect(paymentError).toBeNull();
  85  |     
  86  |     // Simulate the server action logic for payment confirmed since we updated directly in DB,
  87  |     // Wait, the true server action `adminConfirmManualPayment` is what emits the event!
  88  |     // Since we are mocking admin, let's call the action or simulate it. 
  89  |     // We will just let the test continue and verify the events created so far.
  90  | 
  91  |     // Let's go back to editor to publish
  92  |     await page.goto(`/editor/${invitationId}`);
  93  |     await page.waitForTimeout(1000);
  94  | 
  95  |     // 13. Publish Attempted
  96  |     await page.click('text=نشر الدعوة');
  97  |     await page.waitForTimeout(3000);
  98  | 
  99  |     // 14. Published
  100 |     // It should navigate back to dashboard or show success.
  101 | 
  102 |     // ----------------------------------------------------
  103 |     // VERIFY TELEMETRY EVENTS IN DB
  104 |     // ----------------------------------------------------
  105 |     const { data: events, error: fetchError } = await supabase
  106 |       .from('product_funnel_events')
  107 |       .select('event_name')
  108 |       .eq('session_id', sessionId)
  109 |       .order('created_at', { ascending: true });
  110 |       
  111 |     expect(fetchError).toBeNull();
  112 |     const eventNames = events!.map(e => e.event_name);
  113 | 
  114 |     // The order might vary slightly due to async, but we expect all these to be present
  115 |     expect(eventNames).toContain('FUNNEL_LANDING_VIEW');
  116 |     expect(eventNames).toContain('FUNNEL_TEMPLATE_CATALOG_VIEW');
  117 |     expect(eventNames).toContain('FUNNEL_TEMPLATE_DETAIL_VIEW');
  118 |     expect(eventNames).toContain('FUNNEL_TEMPLATE_SELECTED');
  119 |     expect(eventNames).toContain('FUNNEL_DRAFT_CREATED');
  120 |     expect(eventNames).toContain('FUNNEL_EDITOR_OPENED');
  121 |     expect(eventNames).toContain('FUNNEL_EDITOR_EDITED');
  122 |     expect(eventNames).toContain('FUNNEL_PACKAGE_VIEWED');
  123 |     expect(eventNames).toContain('FUNNEL_PACKAGE_SELECTED');
  124 |     expect(eventNames).toContain('FUNNEL_PAYMENT_ORDER_CREATED');
  125 |     expect(eventNames).toContain('FUNNEL_WHATSAPP_CLICKED');
  126 |     expect(eventNames).toContain('FUNNEL_PUBLISH_ATTEMPTED');
  127 |     expect(eventNames).toContain('FUNNEL_PUBLISHED');
  128 |     
  129 |   });
  130 | });
  131 | 
```