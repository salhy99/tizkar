const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('Testing Concurrent Registration...');
  
  const createPromise1 = supabase.auth.admin.createUser({
    email: 'ali_test@auth.tizkar.internal',
    password: 'password123',
    email_confirm: true,
  }).then(async res => {
    if (res.data?.user) {
      const { error } = await supabase.from('profiles').insert({ id: res.data.user.id, username: 'Ali', role: 'USER' });
      if (error) {
        await supabase.auth.admin.deleteUser(res.data.user.id);
        return { success: false, error };
      }
      return { success: true };
    }
    return { success: false, error: res.error };
  });

  const createPromise2 = supabase.auth.admin.createUser({
    email: 'ali_test2@auth.tizkar.internal',
    password: 'password123',
    email_confirm: true,
  }).then(async res => {
    if (res.data?.user) {
      const { error } = await supabase.from('profiles').insert({ id: res.data.user.id, username: 'ali', role: 'USER' });
      if (error) {
        await supabase.auth.admin.deleteUser(res.data.user.id);
        return { success: false, error };
      }
      return { success: true };
    }
    return { success: false, error: res.error };
  });

  const results = await Promise.all([createPromise1, createPromise2]);
  
  const successes = results.filter(r => r.success).length;
  const failures = results.filter(r => !r.success).length;
  
  console.log('Successes:', successes);
  console.log('Failures:', failures);
  
  const { count: profilesCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).ilike('username', 'ali');
  console.log('Profiles with lower(username)=ali:', profilesCount);
}
main().catch(console.error);
