import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for our tables
export interface Snapshot {
  id: string
  scrape_date: string
  month: string
  total_records: number
  created_at: string
}

export interface Record {
  id: string
  snapshot_id: string
  casenum: string
  user_id: string | null
  visa_type: string | null
  visa_entry: string | null
  consulate: string | null
  major: string | null
  status: string | null
  check_date: string | null
  complete_date: string | null
  waiting_days: number | null
  details_link: string | null
  has_notes: boolean
  note: string | null
  month: string
  created_at: string
}

export interface Change {
  id: string
  casenum: string
  snapshot_id_old: string | null
  snapshot_id_new: string
  change_type: string
  field_name: string | null
  old_value: string | null
  new_value: string | null
  detected_at: string
}
