const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: adminUser } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['ADMIN', 'SUPER_ADMIN'])
    .limit(1)
    .single();

  if (adminUser) {
    const { data, error } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_user_id: adminUser.id,
        action: 'SYSTEM_TEST',
        entity_type: 'SYSTEM',
        entity_id: adminUser.id,
        metadata: { test: true }
      })
      .select('*')
      .single();

    if (error) {
      console.error('Audit Error:', error);
    } else {
      console.log('Audit Success:', data);
    }
  } else {
    console.log('No admin found.');
  }
}
main().catch(console.error);
