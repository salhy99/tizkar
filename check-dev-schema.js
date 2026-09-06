const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url.includes('zxrzqyvlydsdczngxxst')) {
  console.error('FATAL: Not DEV url');
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkDevSchema() {
  console.log('Checking DEV project schema on zxrzqyvlydsdczngxxst...');
  const { data, error } = await supabase.from('profiles').select('username').limit(1);
  if (error) {
    console.log('DEV Schema Check Result: MISSING (username column does not exist yet)');
    console.log('Error details:', error.message);
  } else {
    console.log('DEV Schema Check Result: EXISTS (username column exists)');
  }
}

checkDevSchema().catch(console.error);
