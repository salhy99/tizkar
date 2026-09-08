import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !email || !password) {
  console.error('FATAL: Missing required environment variables for seeding admin user.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seedAdmin() {
  console.log(`=== SEEDING SYNTHETIC E2E ADMIN USER ===`);
  console.log(`Target Supabase URL: ${supabaseUrl}`);
  
  // 1. List users to check if user already exists
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('FATAL: Failed to list auth users:', listError.message);
    process.exit(1);
  }

  let user = usersData.users.find(u => u.email === email);

  if (!user) {
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'E2E Admin' }
    });

    if (createError) {
      console.error('FATAL: Failed to create E2E admin user:', createError.message);
      process.exit(1);
    }
    user = createData.user;
    console.log('Successfully created E2E Admin Auth user via Auth API.');
  } else {
    // Update password to ensure it matches current E2E_ADMIN_PASSWORD
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { 
      password, 
      email_confirm: true 
    });
    if (updateError) {
      console.error('FATAL: Failed to update existing admin user password:', updateError.message);
      process.exit(1);
    }
    console.log('Updated existing E2E Admin Auth user password.');
  }

  // 2. Ensure profile exists and has role = ADMIN
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      display_name: 'E2E Admin',
      role: 'ADMIN',
      updated_at: new Date().toISOString()
    });

  if (profileError) {
    console.error('FATAL: Failed to upsert admin profile:', profileError.message);
    process.exit(1);
  }

  console.log('Successfully set user role to ADMIN in profiles table.');
  console.log('=== SEEDING SUCCESSFUL ===');
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('FATAL: Unexpected error during admin seed:', err);
  process.exit(1);
});
