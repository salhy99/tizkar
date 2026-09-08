const { createClient } = require('@supabase/supabase-js');

async function run() {
  const prodUrl = "https://hnjfxdyterpbmkisaiiw.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need to supply this
  const admin = createClient(prodUrl, serviceRoleKey);

  console.log("=== INVENTORY ===");
  const { data: au } = await admin.auth.admin.listUsers();
  const { data: pr } = await admin.from('profiles').select('id, role, login_name_normalized');
  const { data: ii } = await admin.from('invitations').select('id');
  const { data: oo } = await admin.from('orders').select('id');

  const { data: orphans1 } = await admin.from('profiles').select('id').not('id', 'in', `(${au.users.map(u => u.id).join(',')})`);
  const profileIds = pr.map(p => p.id);
  const orphans2 = au.users.filter(u => !profileIds.includes(u.id));

  const names = pr.map(p => p.login_name_normalized).filter(Boolean);
  const duplicates = names.filter((e, i, a) => a.indexOf(e) !== i);

  console.log(`AUTH_USERS: ${au.users.length}`);
  console.log(`PROFILES: ${pr.length}`);
  console.log(`AUTH_IDENTITIES: ${au.users.reduce((acc, u) => acc + (u.identities?.length || 0), 0)}`);
  console.log(`ADMINS: ${pr.filter(p => p.role === 'ADMIN').length}`);
  console.log(`INVITATIONS: ${ii.length}`);
  console.log(`ORDERS: ${oo.length}`);
  console.log(`AUTH_USERS_WITHOUT_PROFILES: ${orphans2.length}`);
  console.log(`PROFILES_WITHOUT_AUTH_USERS: ${orphans1?.length || 0}`);
  console.log(`CANONICAL_DUPLICATE_GROUPS: ${duplicates.length}`);

  console.log("\n=== SCHEMA ===");
  const { data: schemaCheck, error: schemaErr } = await admin.rpc('get_schema_info', { target_table: 'profiles' }); // Fallback: try raw query
  if(schemaErr) {
     const { error: queryErr } = await admin.from('profiles').select('username').limit(1);
     console.log(`USERNAME_COLUMN_ABSENT: ${queryErr && queryErr.message.includes('Could not find the \'username\' column') ? 'YES' : 'NO'}`);
     
     const { error: idxErr } = await admin.from('profiles').select('login_name_normalized').limit(1);
     console.log(`LOGIN_NAME_NORMALIZED_EXISTS: ${!idxErr ? 'YES' : 'NO'}`);
  }
}

run().catch(e => { console.error("Error:", e); process.exit(1); });
