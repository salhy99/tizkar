const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const devUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const devKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const devClient = createClient(devUrl, devKey);

async function checkDevState() {
  console.log("Checking Development Database State...");
  
  const { data: sample } = await devClient.from('profiles').select('*').limit(1);
  const sampleKeys = sample && sample[0] ? Object.keys(sample[0]) : [];

  console.log('DEV profiles keys:', sampleKeys);
  console.log('DEV_SCHEMA_HAS_USERNAME =', sampleKeys.includes('username') ? 'YES' : 'NO');
}

checkDevState().catch(console.error);
