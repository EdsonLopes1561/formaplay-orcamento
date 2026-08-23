import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jllnonveblpzdcefeegw.supabase.co';
const supabaseAnonKey = 'sb_publishable_ZNPjal45YzwH29VdWmq5PA_zZWcF7eU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('--- TESTANDO ANON: ORCAMENTOS ---');
  
  const resSelect = await supabase.from('orcamentos').select('*').limit(1);
  console.log('SELECT:', resSelect.error?.message || 'Sucesso (Vazio ou não)');

  const resInsert = await supabase.from('orcamentos').insert({ numero: 'TESTE-000', cliente: 'Teste', jogo_escolhido: 'Jogo Teste' });
  console.log('INSERT:', resInsert.error?.message || 'Sucesso');

  const resUpdate = await supabase.from('orcamentos').update({ cliente: 'Teste' }).eq('numero', 'TESTE-000');
  console.log('UPDATE:', resUpdate.error?.message || 'Sucesso');

  const resDelete = await supabase.from('orcamentos').delete().eq('numero', 'TESTE-000');
  console.log('DELETE:', resDelete.error?.message || 'Sucesso');

  console.log('\n--- TESTANDO ANON: SOLICITACOES_ORCAMENTO ---');

  const resSelect2 = await supabase.from('solicitacoes_orcamento').select('*').limit(1);
  console.log('SELECT:', resSelect2.error?.message || 'Sucesso');

  const payload = {
    nome_razao: 'TESTE SEGURANCA ANON',
    telefone: '999999999',
    jogo_escolhido: 'Desafio Kids',
    quantidade: 1,
    status: 'Pendente'
  };

  const resInsert2 = await supabase.from('solicitacoes_orcamento').insert(payload);
  console.log('INSERT:', resInsert2.error?.message || 'Sucesso');

  const resUpdate2 = await supabase.from('solicitacoes_orcamento').update({ nome_razao: 'Teste' }).eq('nome_razao', 'TESTE SEGURANCA ANON');
  console.log('UPDATE:', resUpdate2.error?.message || 'Sucesso');

  const resDelete2 = await supabase.from('solicitacoes_orcamento').delete().eq('nome_razao', 'TESTE SEGURANCA ANON');
  console.log('DELETE:', resDelete2.error?.message || 'Sucesso');
}

runTests();
