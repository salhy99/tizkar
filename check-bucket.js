const dotenv = require('e:/Users/lenovo/Desktop/تذكار/node_modules/dotenv');
dotenv.config({ path: 'e:/Users/lenovo/Desktop/تذكار/.env.local' });
const { createClient } = require('e:/Users/lenovo/Desktop/تذكار/node_modules/@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.storage.getBucket('invitations_assets').then(res => {
  console.log('Bucket Info:', res.data);
}).catch(console.error);
