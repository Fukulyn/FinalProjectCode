import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials are missing. Please set up your environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://your-project.supabase.co',
  supabaseKey || 'your-anon-key'
);