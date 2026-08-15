import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
  console.log("=== INICIANDO PRE-FLIGHT ===");

  // 1. Estado atual dos dois IDs afetados
  const idsAfetados = ['d952135e-ff56-4f55-b604-3482f66be266', '815d2cfd-5afb-4965-a224-b3a7e288b344'];
  const { data: estadoZentrixEPapelaria } = await supabase
    .from('orcamentos')
    .select('id, numero, cliente')
    .in('id', idsAfetados);
  console.log("1. Estado atual Zentrix e Papelaria:", estadoZentrixEPapelaria);

  // 2. Registros com numero vazio ou NULL
  const { data: todos } = await supabase.from('orcamentos').select('id, numero, cliente');
  
  const vaziosOuNull = todos?.filter(o => !o.numero || o.numero.trim() === '');
  console.log("2. Orçamentos com número vazio ou NULL:", vaziosOuNull);

  // 3. Checar duplicidades na coluna numero
  const contagemNumeros: Record<string, string[]> = {};
  todos?.forEach(o => {
    if (o.numero) {
      if (!contagemNumeros[o.numero]) contagemNumeros[o.numero] = [];
      contagemNumeros[o.numero].push(o.id);
    }
  });

  const duplicados = Object.entries(contagemNumeros).filter(([num, ids]) => ids.length > 1);
  console.log("3. Números duplicados no banco atual:", duplicados);

  // 4. Maior número atualmente existente
  const numerosExtraidos = todos?.map(o => parseInt((o.numero || '').replace(/[^0-9]/g, ''), 10)).filter(n => !isNaN(n));
  const max = numerosExtraidos && numerosExtraidos.length > 0 ? Math.max(...numerosExtraidos) : 0;
  console.log("4. Maior número atualmente existente (parse numérico):", max);
}

main();
