import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Environment variables missing!\n',
    'VITE_SUPABASE_URL:', supabaseUrl ? '✓ ada' : '✗ TIDAK ADA',
    '\nVITE_SUPABASE_PUBLISHABLE_KEY:', supabaseAnonKey ? '✓ ada' : '✗ TIDAK ADA',
    '\nPastikan variabel ini sudah dikonfigurasi di Vercel Dashboard → Settings → Environment Variables'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'e-raport-app',
    },
  },
})
