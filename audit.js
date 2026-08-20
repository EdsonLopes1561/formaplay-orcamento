import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jllnonveblpzdcefeegw.supabase.co',
  'sb_publishable_ZNPjal45YzwH29VdWmq5PA_zZWcF7eU'
);

async function analyze() {
  const { data: orcamentos, error: orcErr } = await supabase.from('orcamentos').select('*');
  const { data: solicitacoes, error: solErr } = await supabase.from('solicitacoes_orcamento').select('*');

  if (orcErr) console.error('Orc Err', orcErr);
  if (solErr) console.error('Sol Err', solErr);

  console.log('--- STATUS DOS ORÇAMENTOS ---');
  const statuses = new Set();
  const statusCounts = {};
  orcamentos.forEach(o => {
    const s = o.status || 'Aberto (default)';
    statuses.add(s);
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  console.log(statusCounts);

  console.log('\n--- VÍNCULOS ---');
  let vinculadosPorEmail = 0;
  let vinculadosPorDoc = 0;
  
  orcamentos.forEach(o => {
    if (solicitacoes.some(s => s.email === o.email || s.email === o.cliente_email)) {
      vinculadosPorEmail++;
    }
    if (solicitacoes.some(s => s.cnpj === o.cliente_documento || s.cpf === o.cliente_documento)) {
      vinculadosPorDoc++;
    }
  });
  console.log(`Orçamentos totais: ${orcamentos.length}`);
  console.log(`Solicitações totais: ${solicitacoes.length}`);
  console.log(`Orçamentos vinculados (por email): ${vinculadosPorEmail}`);
  console.log(`Orçamentos vinculados (por documento): ${vinculadosPorDoc}`);

  console.log('\n--- DUPLICIDADES DE REGIÃO ---');
  const getRegiaoRaw = (o) => {
    let rawCidade = String(o?.cidade || o?.cliente_cidade || '').trim();
    let rawEstado = String(o?.estado || o?.cliente_uf || '').trim().toUpperCase();
    let cReg = 'Não informado';

    if (rawCidade && rawCidade.toLowerCase() !== 'undefined' && rawCidade !== 'null') {
      rawCidade = rawCidade.replace(/[\/\-]+\s*$/, '').trim();
      const ufMatch = rawCidade.match(/[\/\-]\s*([A-Za-z]{2})$/);
      if (ufMatch) {
        rawCidade = rawCidade.replace(/[\/\-]\s*([A-Za-z]{2})$/, '').trim();
        if (!rawEstado) rawEstado = ufMatch[1].toUpperCase();
      }
      if (rawEstado && rawEstado.length >= 2) {
        cReg = `${rawCidade}/${rawEstado.slice(0,2)}`;
      } else {
        cReg = rawCidade;
      }
    }
    return cReg;
  };

  const normalizeString = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

  const regionsMap = new Map();
  orcamentos.forEach(o => {
    const raw = getRegiaoRaw(o);
    if (raw === 'Não informado') return;
    
    const norm = normalizeString(raw);
    if (!regionsMap.has(norm)) {
      regionsMap.set(norm, new Set());
    }
    regionsMap.get(norm).add(raw);
  });

  let foundDups = false;
  regionsMap.forEach((rawSet, norm) => {
    if (rawSet.size > 1) {
      foundDups = true;
      console.log(`Normalizado: "${norm}" -> Variações encontradas:`, Array.from(rawSet));
    }
  });
  if (!foundDups) console.log('Nenhuma duplicidade estrita encontrada neste momento baseada na normalização.');
}

analyze();
