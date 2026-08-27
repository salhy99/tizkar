import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function seedAdmin() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  const { error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (userError) {
    if (userError.code === 'email_exists' || userError.message.includes('already registered')) {
      console.log('Admin already registered');
    } else {
      console.error('Error creating admin user:', userError);
      process.exit(1);
    }
  } else {
    console.log('Admin created successfully.');
  }

  // Find user by email to ensure we have the right ID
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('List error:', listError);
    process.exit(1);
  }

  const adminUser = users.users.find(u => u.email === email);
  if (!adminUser) {
    console.error('Admin not found after creation.');
    process.exit(1);
  }

  // Ensure role is admin
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: adminUser.id, role: 'ADMIN' });

  if (profileError) {
    console.error('Error updating profile role:', profileError);
    process.exit(1);
  }
  
  console.log('Admin seeded properly!');
}

seedAdmin();
