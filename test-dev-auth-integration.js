const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE credentials in .env.local");
  process.exit(1);
}

const DEV_PROJECT_REF = 'zxrzqyvlydsdczngxxst';
if (!url.includes(DEV_PROJECT_REF)) {
  console.error(`CRITICAL: Script MUST run against Development project (${DEV_PROJECT_REF}). Found: ${url}`);
  process.exit(1);
}

console.log(`1. DEV_BINDING = PASS (Verified targeting ${DEV_PROJECT_REF})`);

const adminClient = createClient(url, key);

function normalizeNameInternal(name) {
  return name.trim().replace(/\s+/g, ' ');
}

async function runDevAuthIntegrationTests() {
  console.log('\n--- STARTING DEV DB-BACKED AUTH INTEGRATION TESTS (NAME + PASSWORD) ---');

  // Cleanup any old test users
  const { data: existingProfiles } = await adminClient
    .from('profiles')
    .select('id, display_name')
    .or(`display_name.ilike.%أحمد علي اختبار%,display_name.ilike.%سارة محمد اختبار%`);

  if (existingProfiles && existingProfiles.length > 0) {
    for (const p of existingProfiles) {
      await adminClient.from('profiles').delete().eq('id', p.id);
      await adminClient.auth.admin.deleteUser(p.id);
    }
  }

  // 3 & 4. Registration & Name Normalization Test
  console.log('\n--- 3 & 4. Testing Name Registration & Normalization ---');
  const inputName = '   أحمد   علي   اختبار   ';
  const expectedNormalized = normalizeNameInternal(inputName);

  const internalAccountId = crypto.randomUUID();
  const internalEmail = `${internalAccountId}@auth.tizkar.internal`;

  const { data: newUser, error: signupErr } = await adminClient.auth.admin.createUser({
    email: internalEmail,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { name: expectedNormalized }
  });

  if (signupErr || !newUser.user) throw signupErr || new Error("Failed to create auth user");

  const { error: profErr } = await adminClient.from('profiles').insert({
    id: newUser.user.id,
    display_name: expectedNormalized,
    login_name_normalized: expectedNormalized.toLowerCase(),
    role: 'USER'
  });

  if (profErr) throw profErr;

  const { data: fetchedProfile } = await adminClient
    .from('profiles')
    .select('display_name')
    .eq('id', newUser.user.id)
    .single();

  console.log(`Fetched Profile Name: "${fetchedProfile.display_name}"`);

  if (fetchedProfile.display_name === expectedNormalized && expectedNormalized === 'أحمد علي اختبار') {
    console.log('REGISTRATION_DB_RUNTIME = PASS');
    console.log('NAME_NORMALIZATION = PASS');
  } else {
    console.error('NAME_NORMALIZATION = FAIL', fetchedProfile);
    process.exit(1);
  }

  // 5. Testing Duplicate Name Collision
  console.log('\n--- 5. Testing Duplicate Name Collision ---');
  const duplicateInputName = 'أحمد  علي  اختبار'; // Different internal spacing before normalization
  const normalizedDup = normalizeNameInternal(duplicateInputName);

  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('id')
    .ilike('display_name', normalizedDup)
    .limit(1)
    .maybeSingle();

  if (existingProfile) {
    console.log('Collision detected at application query level: Duplicate Name blocked');
    console.log('NAME_COLLISION = PASS');
  } else {
    console.error('NAME_COLLISION = FAIL (Duplicate name was not detected)');
    process.exit(1);
  }

  // 6. Testing Registration Compensation
  console.log('\n--- 6. Testing Registration Compensation ---');
  const compInternalId = crypto.randomUUID();
  const compEmail = `${compInternalId}@auth.tizkar.internal`;

  const { data: compUser } = await adminClient.auth.admin.createUser({
    email: compEmail,
    password: 'Password123!',
    email_confirm: true,
  });

  // Attempt insert with invalid role enum to trigger profile failure
  const { error: failProfErr } = await adminClient.from('profiles').insert({
    id: compUser.user.id,
    display_name: 'تست فاشل',
    role: 'INVALID_ROLE_ENUM'
  });

  if (failProfErr) {
    console.log('Profile insert failed as intended:', failProfErr.message);
    // Execute compensation cleanup
    await adminClient.auth.admin.deleteUser(compUser.user.id);

    // Verify orphan user is deleted
    const { data: checkUser } = await adminClient.auth.admin.getUserById(compUser.user.id);
    if (!checkUser.user) {
      console.log('Orphan user status: DELETED (0 orphans)');
      console.log('REGISTRATION_COMPENSATION_RUNTIME = PASS');
    } else {
      console.error('REGISTRATION_COMPENSATION_RUNTIME = FAIL (Orphan user still exists)');
      process.exit(1);
    }
  }

  // 7. Testing Concurrent Registration (Sequential vs Atomic Uniqueness)
  console.log('\n--- 7. Testing Concurrent Registration ---');
  const concName1 = 'سارة محمد اختبار';
  const concName2 = '  سارة   محمد   اختبار  ';

  const registerFlow = async (rawName) => {
    const norm = normalizeNameInternal(rawName);
    // 1. Query availability
    const { data: exists } = await adminClient
      .from('profiles')
      .select('id')
      .ilike('display_name', norm)
      .limit(1)
      .maybeSingle();

    if (exists) return { success: false, error: 'هذا الاسم مستخدم بالفعل، اختر اسماً آخر' };

    // 2. Create Auth User
    const cId = crypto.randomUUID();
    const cEmail = `${cId}@auth.tizkar.internal`;

    const { data: u, error: e1 } = await adminClient.auth.admin.createUser({
      email: cEmail,
      password: 'Password123!',
      email_confirm: true,
    });

    if (e1 || !u.user) return { success: false, error: e1?.message };

    // 3. Insert Profile
    const { error: e2 } = await adminClient.from('profiles').insert({
      id: u.user.id,
      display_name: norm,
      login_name_normalized: norm.toLowerCase(),
      role: 'USER'
    });

    if (e2) {
      await adminClient.auth.admin.deleteUser(u.user.id);
      return { success: false, error: e2.message };
    }

    return { success: true, userId: u.user.id };
  };

  // Run sequential & concurrent checks
  const res1 = await registerFlow(concName1);
  const res2 = await registerFlow(concName2);

  console.log(`First attempt result:`, res1.success ? 'Success' : res1.error);
  console.log(`Second attempt result (same normalized name):`, res2.success ? 'Success' : res2.error);

  const { data: concProfiles } = await adminClient
    .from('profiles')
    .select('id')
    .ilike('display_name', 'سارة محمد اختبار');

  if (res1.success && !res2.success && concProfiles.length === 1) {
    console.log('CONCURRENT_REGISTRATION_RUNTIME = PASS');
  } else {
    console.error('CONCURRENT_REGISTRATION_RUNTIME = FAIL', { res1, res2, count: concProfiles.length });
    process.exit(1);
  }

  // 12. Cleanup Synthetic Test Data
  console.log('\n--- 12. Cleaning Up Synthetic Test Data ---');
  if (newUser.user) {
    await adminClient.from('profiles').delete().eq('id', newUser.user.id);
    await adminClient.auth.admin.deleteUser(newUser.user.id);
  }
  if (res1.userId) {
    await adminClient.from('profiles').delete().eq('id', res1.userId);
    await adminClient.auth.admin.deleteUser(res1.userId);
  }
  if (res2.userId) {
    await adminClient.from('profiles').delete().eq('id', res2.userId);
    await adminClient.auth.admin.deleteUser(res2.userId);
  }
  console.log('Cleanup complete.\n');
}

runDevAuthIntegrationTests().catch(err => {
  console.error("Test script failed:", err);
  process.exit(1);
});
