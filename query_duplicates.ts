import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('orcamentos')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

main();
