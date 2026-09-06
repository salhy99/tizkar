const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('product_funnel_events')
    .select('*')
    .eq('is_synthetic', false)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Error fetching funnel events:', error);
  } else {
    console.log('Recent Real Events:', JSON.stringify(data, null, 2));
    if (data.length > 0) {
      console.log('FIRST_VALID_REAL_EVENT candidate:', data[data.length-1].created_at);
    }
  }
}
main().catch(console.error);
