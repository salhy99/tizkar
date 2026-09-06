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
      .from('support_cases')
      .insert({
        title: 'System Test Case',
        description: 'Testing the support CRM migration.',
        priority: 'LOW',
        created_by: adminUser.id
      })
      .select('*')
      .single();

    if (error) {
      console.error('Support CRM Error:', error);
    } else {
      console.log('Support CRM Success:', data);
    }
  } else {
    console.log('No admin found.');
  }
}
main().catch(console.error);
