import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
  console.log("=== EXECUTANDO UPDATES ===");

  // Update Zentrix
  const { data: zentrixData, error: zentrixErr } = await supabase
    .from('orcamentos')
    .update({ numero: '#0024' })
    .eq('id', 'd952135e-ff56-4f55-b604-3482f66be266')
    .select('id, numero, cliente');
  
  if (zentrixErr) console.error("Erro ao atualizar Zentrix:", zentrixErr);
  else console.log("Zentrix atualizado:", zentrixData);

  // Update Papelaria
  const { data: papelariaData, error: papelariaErr } = await supabase
    .from('orcamentos')
    .update({ numero: '#0025' })
    .eq('id', '815d2cfd-5afb-4965-a224-b3a7e288b344')
    .select('id, numero, cliente');
  
  if (papelariaErr) console.error("Erro ao atualizar Papelaria:", papelariaErr);
  else console.log("Papelaria atualizado:", papelariaData);
}

main();
