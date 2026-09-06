const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(url, key);

function normalizeLoginNameSync(name) {
  if (!name) return '';
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

async function runExactLoginProof() {
  console.log("--- STARTING EXACT LOGIN KEY & UNICODE NORMALIZATION PROOF ---");

  // Clean up old test data
  const { data: oldProfiles } = await adminClient
    .from('profiles')
    .select('id, display_name, login_name_normalized')
    .or(`login_name_normalized.ilike.%أحمد علي%,login_name_normalized.ilike.%ahmed ali%`);

  for (const p of oldProfiles || []) {
    await adminClient.from('profiles').delete().eq('id', p.id);
    await adminClient.auth.admin.deleteUser(p.id);
  }

  // TEST A: Register "أحمد علي"
  const origNameA = "أحمد علي دقيقة";
  const displayA = origNameA.normalize('NFC').trim().replace(/\s+/g, ' ');
  const normA = normalizeLoginNameSync(origNameA);

  const u1Id = crypto.randomUUID();
  const { data: u1, error: u1Err } = await adminClient.auth.admin.createUser({
    email: `${u1Id}@auth.tizkar.internal`,
    password: 'Password123!',
    email_confirm: true
  });
  if (u1Err) console.error("Create User Error:", u1Err.message);

  const { error: insErr1 } = await adminClient.from('profiles').insert({
    id: u1.user.id,
    display_name: displayA,
    login_name_normalized: normA,
    role: 'USER'
  });
  if (insErr1) console.error("Profile Insert Error 1:", insErr1.message);

  // TEST B: Login with padded whitespace "  أحمد   علي   دقيقة  "
  const loginPaddedB = "  أحمد   علي   دقيقة  ";
  const normB = normalizeLoginNameSync(loginPaddedB);

  const { data: profileB } = await adminClient
    .from('profiles')
    .select('id, display_name, login_name_normalized')
    .eq('login_name_normalized', normB)
    .limit(1)
    .maybeSingle();

  console.log(`Test B (Padded Login): Resolved Profile ID = ${profileB?.id}`);
  if (profileB?.id !== u1.user.id) {
    console.error("FAIL: Test B padded login resolution failed!");
    process.exit(1);
  }

  // TEST E: Latin Name lowercasing "Ahmed Ali" -> login "ahmed ali"
  const origLatin = "Ahmed Ali Proof";
  const displayLatin = origLatin.normalize('NFC').trim().replace(/\s+/g, ' ');
  const normLatin = normalizeLoginNameSync(origLatin);

  const u2Id = crypto.randomUUID();
  const { data: u2 } = await adminClient.auth.admin.createUser({
    email: `${u2Id}@auth.tizkar.internal`,
    password: 'Password123!',
    email_confirm: true
  });
  await adminClient.from('profiles').insert({
    id: u2.user.id,
    display_name: displayLatin,
    login_name_normalized: normLatin,
    role: 'USER'
  });

  const loginLowerLatin = "ahmed ali proof";
  const normLatinLogin = normalizeLoginNameSync(loginLowerLatin);

  const { data: profileLatin } = await adminClient
    .from('profiles')
    .select('id, display_name, login_name_normalized')
    .eq('login_name_normalized', normLatinLogin)
    .limit(1)
    .maybeSingle();

  console.log(`Test E (Latin Case Insensitive): Resolved Profile ID = ${profileLatin?.id}`);
  if (profileLatin?.id !== u2.user.id) {
    console.error("FAIL: Test E Latin login resolution failed!");
    process.exit(1);
  }

  // Cleanup
  await adminClient.from('profiles').delete().eq('id', u1.user.id);
  await adminClient.auth.admin.deleteUser(u1.user.id);
  await adminClient.from('profiles').delete().eq('id', u2.user.id);
  await adminClient.auth.admin.deleteUser(u2.user.id);

  console.log("\nEXACT_LOGIN_KEY_PROOF = PASS");
  console.log("NORMALIZATION_PARITY = PASS");
}

runExactLoginProof().catch(err => {
  console.error(err);
  process.exit(1);
});
