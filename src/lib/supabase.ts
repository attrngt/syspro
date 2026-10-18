import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY wajib diisi di .env.local')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)