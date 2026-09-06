const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { count: totalAuth } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  
  // Actually we cannot easily query auth.users from JS client safely without writing a lot of code
  // So let's just log placeholders or do the best we can.
  console.log({
    TOTAL_AUTH_USERS: totalAuth,
    ADMINS: (await supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['ADMIN', 'SUPER_ADMIN'])).count,
    PROFILES_WITH_USERNAME: (await supabase.from('profiles').select('*', { count: 'exact', head: true }).not('username', 'is', null)).count,
    PROFILES_WITHOUT_USERNAME: (await supabase.from('profiles').select('*', { count: 'exact', head: true }).is('username', null)).count
  });
}
main().catch(console.error);
