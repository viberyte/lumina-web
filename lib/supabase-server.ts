import { createClient } from '@supabase/supabase-js';

// Edge-safe client (no Node APIs, no cookies)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ovlnxzbkvbgcnguqvxhk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bG54emJrdmJnY25ndXF2eGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0NjcyMTYsImV4cCI6MjA1MjA0MzIxNn0.QGI930SqHEuZIg888-kmJA_6k1YRR8aQts2vYB_r-Bk';

export const supabaseServer = createClient(supabaseUrl, supabaseKey);
