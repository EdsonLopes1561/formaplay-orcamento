import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jllnonveblpzdcefeegw.supabase.co';
const supabaseAnonKey = 'sb_publishable_ZNPjal45YzwH29VdWmq5PA_zZWcF7eU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('--- TESTANDO RPC PUBLICO ANON ---');
  
  const res = await supabase.rpc('buscar_acompanhamento_pedido', { p_token: 'fake-token-123' });
  console.log('Status:', res.status);
  console.log('RPC Error:', res.error?.message || 'Sucesso (Pode retornar array vazio)');
  console.log('Data:', res.data);
}

runTests();
