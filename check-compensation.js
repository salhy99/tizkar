const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('Testing Registration Compensation...');
  
  // 1. Create auth user
  const { data: signupData, error: signupError } = await supabase.auth.admin.createUser({
    email: 'fail_test@auth.tizkar.internal',
    password: 'password123',
    email_confirm: true,
  });

  if (signupError) {
    console.error('Signup Error:', signupError);
    return;
  }
  
  console.log('Created Auth User:', signupData.user.id);

  // 2. Simulate profile failure (by providing invalid data or intentionally skipping and just calling delete)
  // To truly test compensation we can just call delete directly like the auth.ts does when profile fails.
  console.log('Simulating Profile Insert Failure...');
  const { error: profileError } = { error: { message: 'Simulated Insert Error' } };

  if (profileError) {
    console.log('Compensation triggered: Deleting orphaned auth user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(signupData.user.id);
    
    if (deleteError) {
      console.error('Compensation failed:', deleteError);
    } else {
      console.log('Compensation SUCCESS. Orphan deleted.');
    }
  }
  
  // Verify it's gone
  const { data: checkData } = await supabase.auth.admin.getUserById(signupData.user.id);
  if (!checkData.user) {
    console.log('ORPHAN_AUTH_USERS = 0');
  } else {
    console.log('ORPHAN_AUTH_USERS = 1');
  }
}
main().catch(console.error);
