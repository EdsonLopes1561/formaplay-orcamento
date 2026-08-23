import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jllnonveblpzdcefeegw.supabase.co';
const supabaseAnonKey = 'sb_publishable_ZNPjal45YzwH29VdWmq5PA_zZWcF7eU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('--- TESTANDO ANON: ORCAMENTOS ---');
  
  const resInsert = await supabase.from('orcamentos').insert({ numero: 'TESTE-000', cliente: 'Teste', produto: 'Jogo Teste' });
  console.log('INSERT:', resInsert.error?.message || 'Sucesso');
}

runTests();
