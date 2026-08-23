const url = 'https://jllnonveblpzdcefeegw.supabase.co/rest/v1/orcamentos?select=cidade,cliente_cidade,estado,cliente_uf,total';
const key = 'sb_publishable_ZNPjal45YzwH29VdWmq5PA_zZWcF7eU';

async function run() {
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  
  if (!res.ok) {
    console.error('Failed to fetch:', res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  
  const rawDataMap = new Map();
  const variationsMap = new Map();
  
  // Re-implement the normalizer logic
  const normalizeRegiaoKey = (raw) => {
    let s = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/[´`']/g, "'");
    s = s.toLowerCase().replace(/\s+/g, ' ').trim();
    return s;
  };

  const getRegiaoRawData = (o) => {
    let rawCidade = String(o?.cidade || o?.cliente_cidade || '').trim();
    let rawEstado = String(o?.estado || o?.cliente_uf || '').trim().toUpperCase();

    if (rawCidade && rawCidade.toLowerCase() !== 'undefined' && rawCidade !== 'null') {
      rawCidade = rawCidade.replace(/[\/\-]+\s*$/, '').trim();
      
      const ufMatch = rawCidade.match(/[\/\-]\s*([A-Za-z]{2})$/);
      if (ufMatch) {
        rawCidade = rawCidade.replace(/[\/\-]\s*([A-Za-z]{2})$/, '').trim();
        if (!rawEstado) rawEstado = ufMatch[1].toUpperCase();
      }
    } else {
      return { raw: 'Não informado', key: 'nao informado' };
    }
    
    let key = normalizeRegiaoKey(rawCidade);
    if (rawEstado && rawEstado.length >= 2) {
      key = `${key}|${rawEstado.slice(0,2).toLowerCase()}`;
    }
    
    let display = rawCidade.replace(/\s+/g, ' ').trim();
    if (rawEstado && rawEstado.length >= 2) {
      display = `${display}/${rawEstado.slice(0,2).toUpperCase()}`;
    }
    
    return { raw: display, key };
  };

  data.forEach(o => {
    // 1. Raw DB fields
    const rawVal = JSON.stringify({c: o.cidade, cc: o.cliente_cidade, e: o.estado, cuf: o.cliente_uf});
    if (!variationsMap.has(rawVal)) {
      variationsMap.set(rawVal, { count: 0, total: 0 });
    }
    variationsMap.get(rawVal).count++;
    variationsMap.get(rawVal).total += (Number(o.total) || 0);

    // 2. Computed key
    const reg = getRegiaoRawData(o);
    if (!rawDataMap.has(reg.key)) {
      rawDataMap.set(reg.key, { variations: new Set(), count: 0, total: 0 });
    }
    rawDataMap.get(reg.key).variations.add(reg.raw);
    rawDataMap.get(reg.key).count++;
    rawDataMap.get(reg.key).total += (Number(o.total) || 0);
  });

  console.log("=== DB Combinations ===");
  for (const [k, v] of variationsMap.entries()) {
    console.log(`Fields: ${k} -> Count: ${v.count}, Total: ${v.total}`);
  }

  console.log("\n=== Resulting Keys (Top Regioes Logic) ===");
  for (const [k, v] of rawDataMap.entries()) {
    console.log(`Key: '${k}'`);
    console.log(`  Variations (display): ${Array.from(v.variations).join(', ')}`);
    console.log(`  Count: ${v.count}`);
    console.log(`  Total: ${v.total}`);
  }
}

run();
