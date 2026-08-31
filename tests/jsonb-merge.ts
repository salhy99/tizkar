import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('--- JSONB Merge Semantics Test ---')
  const existing = { title: "Old", gallery: ["A", "B"] }
  const incoming = { title: "New", gallery: [] }

  const res = await supabase.rpc('test_jsonb_merge', { p_existing: existing, p_incoming: incoming })
  console.log(res)
}

run().catch(console.error)
