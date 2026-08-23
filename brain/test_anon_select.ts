import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jllnonveblpzdcefeegw.supabase.co';
const supabaseAnonKey = 'sb_publishable_ZNPjal45YzwH29VdWmq5PA_zZWcF7eU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('--- TESTANDO SELECT ANON: orcamentos ---');
  const res1 = await supabase.from('orcamentos').select('*').limit(1);
  console.log('Status HTTP:', res1.status);
  console.log('Error:', res1.error ? { code: res1.error.code, message: res1.error.message } : 'null');
  console.log('Data:', res1.data);
  console.log('Data Length:', res1.data ? res1.data.length : 0);

  console.log('\n--- TESTANDO SELECT ANON: solicitacoes_orcamento ---');
  const res2 = await supabase.from('solicitacoes_orcamento').select('*').limit(1);
  console.log('Status HTTP:', res2.status);
  console.log('Error:', res2.error ? { code: res2.error.code, message: res2.error.message } : 'null');
  console.log('Data:', res2.data);
  console.log('Data Length:', res2.data ? res2.data.length : 0);
}

runTests();
