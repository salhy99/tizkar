# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: media-auth.spec.ts >> /api/media HTTP Authorization >> Legacy Auth owner access (ALLOW)
- Location: tests\e2e\media-auth.spec.ts:151:7

# Error details

```
Error: OTP request row was not created in time.
```

# Test source

```ts
  94  |     const res = await request.get(`/api/media?path=${user.id}/${invB.id}/${MOCK_UUID}.mp3`, { maxRedirects: 0 });
  95  |     expect(res.status()).toBe(302);
  96  |   });
  97  | 
  98  |   test('Draft guest access (DENY)', async ({ request }) => {
  99  |     const res = await request.get(`/api/media?path=${user.id}/${invA.id}/${MOCK_UUID}.jpg`);
  100 |     expect(res.status()).toBe(404); // Using 404 to avoid leaking existence
  101 |   });
  102 | 
  103 |   test('Draft owner access (ALLOW)', async ({ request }) => {
  104 |     const crypto = await import('crypto');
  105 |     const rawToken = crypto.randomBytes(32).toString('base64url');
  106 |     const token = `tzk_${rawToken}`;
  107 |     const hashed = crypto.createHash('sha256').update(token).digest('hex');
  108 |     await adminClient.from('invitations').update({ edit_token_hash: hashed }).eq('id', invA.id);
  109 | 
  110 |     const res = await request.get(`/api/media?path=${user.id}/${invA.id}/${MOCK_UUID}.jpg`, {
  111 |       headers: {
  112 |         Cookie: `tzk_editor_session_${invA.id}=${token}`
  113 |       },
  114 |       maxRedirects: 0
  115 |     });
  116 |     expect(res.status()).toBe(302);
  117 |   });
  118 | 
  119 |   test('Foreign editor access (DENY)', async ({ request }) => {
  120 |     const crypto = await import('crypto');
  121 |     const rawToken = crypto.randomBytes(32).toString('base64url');
  122 |     const token = `tzk_${rawToken}`;
  123 |     const hashed = crypto.createHash('sha256').update(token).digest('hex');
  124 |     await adminClient.from('invitations').update({ edit_token_hash: hashed }).eq('id', invA.id); // Valid session for A
  125 | 
  126 |     // Try to access B's media using A's session cookie
  127 |     const res = await request.get(`/api/media?path=${user.id}/${invB.id}/${MOCK_UUID}_orphan.png`, {
  128 |       headers: {
  129 |         Cookie: `tzk_editor_session_${invA.id}=${token}`
  130 |       },
  131 |       maxRedirects: 0
  132 |     });
  133 |     expect(res.status()).toBe(404);
  134 |   });
  135 | 
  136 |   test('Orphan public access (DENY)', async ({ request }) => {
  137 |     const res = await request.get(`/api/media?path=${user.id}/${invB.id}/${MOCK_UUID}_orphan.png`);
  138 |     expect(res.status()).toBe(404);
  139 |   });
  140 | 
  141 |   test('Expired public access (DENY)', async ({ request }) => {
  142 |     const res = await request.get(`/api/media?path=${user.id}/${invC.id}/${MOCK_UUID}.jpg`);
  143 |     expect(res.status()).toBe(404);
  144 |   });
  145 | 
  146 |   test('Malformed paths (DENY)', async ({ request }) => {
  147 |     const res1 = await request.get(`/api/media?path=invalid/path`);
  148 |     expect(res1.status()).toBe(404);
  149 | 
  150 |     const res2 = await request.get(`/api/media?path=../${user.id}/${invB.id}/${MOCK_UUID}.jpg`);
  151 |     expect(res2.status()).toBe(404);
  152 |   });
  153 | 
  154 |   test('Legacy Auth owner access (ALLOW)', async ({ page }) => {
  155 |     const testPhone = '+9647701111111';
  156 |     
  157 |     // Pre-create the user to avoid `signUp` email rate limits in the Next.js API route
  158 |     const dummyEmail = '9647701111111@tidkar.local';
  159 |     const dummyPassword = process.env.SUPABASE_DUMMY_PASSWORD || 'tidkar-dev-pass-2026';
  160 |     await adminClient.auth.admin.createUser({
  161 |       email: dummyEmail,
  162 |       password: dummyPassword,
  163 |       email_confirm: true
  164 |     });
  165 |     // Ensure profile exists
  166 |     const { data: userRecord } = await adminClient.auth.admin.listUsers();
  167 |     const createdUser = userRecord?.users.find(u => u.email === dummyEmail);
  168 |     if (createdUser) {
  169 |       await adminClient.from('profiles').upsert({ id: createdUser.id, phone: testPhone, display_name: 'E2E Test User' });
  170 |     }
  171 | 
  172 |     // Bypass cooldown rate limiting for the fixed phone number
  173 |     await adminClient.from('otp_requests').delete().eq('phone', '9647701111111');
  174 | 
  175 |     // Navigate to login
  176 |     await page.goto('/login');
  177 |     
  178 |     // Perform login with a fixed test phone
  179 |     await page.getByPlaceholder('مثال: +9647701234567').fill(testPhone);
  180 |     await page.locator('button[type="submit"]').click();
  181 |     
  182 |     // Wait for the OTP request to be created by polling the DB
  183 |     let otpCreated = false;
  184 |     for (let i = 0; i < 10; i++) {
  185 |       const { data } = await adminClient.from('otp_requests').select('id').eq('phone', '9647701111111').eq('status', 'PENDING').maybeSingle();
  186 |       if (data) {
  187 |         otpCreated = true;
  188 |         break;
  189 |       }
  190 |       await page.waitForTimeout(500);
  191 |     }
  192 |     
  193 |     if (!otpCreated) {
> 194 |       await page.screenshot({ path: 'login-error.png' });
      |             ^ Error: OTP request row was not created in time.
  195 |       const { data: allReqs } = await adminClient.from('otp_requests').select('*').eq('phone', '9647701111111');
  196 |       console.log('OTP requests in DB:', allReqs);
  197 |       throw new Error("OTP request row was not created in time.");
  198 |     }
  199 | 
  200 |     const crypto = await import('crypto');
  201 |     const secret = process.env.OTP_HASH_SECRET || 'tidkar-dev-secret-2026';
  202 |     const mockHash = crypto.createHmac('sha256', secret).update('123456').digest('hex');
  203 |     await adminClient.from('otp_requests').update({ otp_hash: mockHash }).eq('phone', '9647701111111').eq('status', 'PENDING');
  204 | 
  205 |     // Verify OTP
  206 |     await page.getByPlaceholder('123456').fill('123456');
  207 |     await page.locator('button[type="submit"]').click();
  208 |     
  209 |     // Wait for redirect to dashboard
  210 |     await expect(page).toHaveURL(/\/dashboard/);
  211 |     
  212 |     // Get the auth user from the database directly by finding the most recent profile
  213 |     const { data: profiles } = await adminClient.from('profiles').select('id').eq('phone', testPhone).single();
  214 |     const legacyUserId = profiles?.id;
  215 |     expect(legacyUserId).toBeTruthy();
  216 | 
  217 |     // Create an invitation owned by this new legacy user
  218 |     const { data: legacyInv } = await adminClient.from('invitations').insert({
  219 |       user_id: legacyUserId,
  220 |       title: 'Legacy Auth Inv',
  221 |       status: 'DRAFT',
  222 |       slug: `legacy-${Date.now()}`
  223 |     }).select().single();
  224 | 
  225 |     // Add a version and dummy file
  226 |     await adminClient.from('invitation_versions').insert({
  227 |       invitation_id: legacyInv.id,
  228 |       is_published: false,
  229 |       invitation_data: { coverImage: `${legacyUserId}/${legacyInv.id}/${MOCK_UUID}.jpg` }
  230 |     });
  231 |     await adminClient.storage.from('invitations_assets').upload(`${legacyUserId}/${legacyInv.id}/${MOCK_UUID}.jpg`, 'dummy content', { contentType: 'image/jpeg', upsert: true });
  232 | 
  233 |     // NOW use the page's request context which has the cookies attached!
  234 |     const res = await page.request.get(`/api/media?path=${legacyUserId}/${legacyInv.id}/${MOCK_UUID}.jpg`, {
  235 |       maxRedirects: 0
  236 |     });
  237 |     
  238 |     expect(res.status()).toBe(302);
  239 |     
  240 |     // Cleanup
  241 |     await adminClient.storage.from('invitations_assets').remove([`${legacyUserId}/${legacyInv.id}/${MOCK_UUID}.jpg`]);
  242 |     await adminClient.from('invitations').delete().eq('id', legacyInv.id);
  243 |   });
  244 | });
  245 | 
```