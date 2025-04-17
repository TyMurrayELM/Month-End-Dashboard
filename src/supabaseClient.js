import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://raznbichxhzhbpzpraci.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhem5iaWNoeGh6aGJwenByYWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MDQwMzgsImV4cCI6MjA2MDQ4MDAzOH0.KQ7sS7WP_rleYr5ww31nxfbC2f_crAxC8N5ThKNvPX0';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;