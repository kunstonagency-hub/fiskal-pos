import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wjqmqqhxffeoklmeyeyo.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_2aP_wQDsTpUed7WwKEw2HQ_S9eEt_dV'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)