export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const token = process.env.SUPERFRETE_TOKEN;
  const baseUrl = process.env.SUPERFRETE_BASE_URL || 'https://api.superfrete.com';
  const userAgent = process.env.SUPERFRETE_USER_AGENT || 'FormaPlay Orcamento v1 (contato.formaplay@gmail.com)';
  const originCep = process.env.FORMAPLAY_ORIGIN_CEP || '17209846';

  if (!token) {
    return new Response(JSON.stringify({ error: 'Token não configurado' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await req.json();
    const { cepDestino, volumes } = body;

    if (!cepDestino || !volumes || !Array.isArray(volumes) || volumes.length === 0) {
      return new Response(JSON.stringify({ error: 'Dados inválidos' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Como a SuperFrete não aceita enviar o array de volumes diretamente na mesma requisição
    // de forma consolidada no pacote, faremos as chamadas para cada volume, conforme orientado.
    const promessas = volumes.map(async (vol: any) => {
      const payload = {
        from: { postal_code: originCep },
        to: { postal_code: cepDestino.replace(/\D/g, '') },
        services: "1,2,3",
        options: {
          own_hand: false,
          receipt: false,
          insurance_value: 0,
          use_insurance_value: false
        },
        package: {
          height: vol.altura,
          width: vol.largura,
          length: vol.comprimento,
          weight: vol.peso
        }
      };

      const resp = await fetch(`${baseUrl}/api/v0/calculator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': userAgent,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        throw new Error(`Erro na SuperFrete: ${resp.status}`);
      }
      return resp.json();
    });

    const resultados = await Promise.all(promessas);

    // Agrupar e somar os serviços retornados.
    // resultados é um array de arrays: [ [ { name: "PAC", price: 10, ... } ], [ { name: "PAC", price: 15, ... } ] ]
    const servicosAgrupados: Record<string, any> = {};

    for (const resList of resultados) {
      for (const servico of resList) {
        if (servico.has_error) continue; // Ignora pacotes/serviços que deram erro isolado

        if (!servicosAgrupados[servico.name]) {
          servicosAgrupados[servico.name] = {
            id: servico.id,
            name: servico.name,
            company: servico.company?.name || servico.name,
            price: Number(servico.price) || 0,
            delivery_time: Number(servico.delivery_time) || 0,
            volumes_validos: 1
          };
        } else {
          servicosAgrupados[servico.name].price += Number(servico.price) || 0;
          servicosAgrupados[servico.name].delivery_time = Math.max(
            servicosAgrupados[servico.name].delivery_time,
            Number(servico.delivery_time) || 0
          );
          servicosAgrupados[servico.name].volumes_validos += 1;
        }
      }
    }

    // Filtrar apenas serviços que retornaram sucesso para TODOS os volumes.
    const opcoesFinais = Object.values(servicosAgrupados).filter(
      (s: any) => s.volumes_validos === volumes.length
    );

    return new Response(JSON.stringify(opcoesFinais), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro no /api/frete:', error);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar frete' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
