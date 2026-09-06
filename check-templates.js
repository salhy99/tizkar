const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('templates')
    .select('slug, name')
    .in('slug', ['noor', 'atheer']);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Templates found:', JSON.stringify(data, null, 2));
    console.log('Total:', data.length);
  }
}
main().catch(console.error);
