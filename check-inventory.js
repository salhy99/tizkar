const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { count: totalAuth } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: admins } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['ADMIN', 'SUPER_ADMIN']);
  const { count: no_username } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).is('username', null);
  
  const { count: with_invites } = await supabase.from('invitations').select('user_id', { count: 'exact', head: true });
  // the above counts total invitations, not unique users, but it's an approximation, or we can just fetch all and count unique sets
  const { data: invData } = await supabase.from('invitations').select('user_id');
  const uniqueUsersWithInvites = new Set(invData?.map(i => i.user_id)).size;

  const { data: ordData } = await supabase.from('orders').select('user_id');
  const uniqueUsersWithOrders = new Set(ordData?.map(o => o.user_id)).size;

  console.log('--- USER INVENTORY ---');
  console.log('TOTAL_PROFILES:', totalAuth);
  console.log('ADMINS:', admins);
  console.log('PROFILES_WITHOUT_USERNAME:', no_username);

  console.log('--- OWNERSHIP INVENTORY ---');
  console.log('USERS_OWNING_INVITATIONS:', uniqueUsersWithInvites);
  console.log('USERS_WITH_ORDERS:', uniqueUsersWithOrders);
}
main().catch(console.error);
