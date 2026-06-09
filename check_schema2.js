import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
  const { data, error } = await supabase.from('materials').select('*').limit(1)
  if (!data || data.length === 0) { console.log('no material'); return }
  const matId = data[0].id
  
  const longDesc = 'A'.repeat(300)
  const { data: d2, error: e2 } = await supabase.from('learning_targets').insert({
    material_id: matId,
    code: 'TESTLONG',
    description: longDesc
  })
  console.log("Insert result error:", e2)
  if(!e2) {
    await supabase.from('learning_targets').delete().eq('code', 'TESTLONG')
  }
}
check()
