export const config = {
  runtime: 'edge',
};

import { createClient } from '@supabase/supabase-js';

const STATUS_COMERCIAIS = [
  'disponivel',
  'baixo_estoque',
  'sob_encomenda',
  'reposicao_em_breve',
  'em_desenvolvimento',
  'indisponivel'
];

export default async function handler(req: Request) {
  try {
    const adminToken = req.headers.get('x-admin-token')?.trim();
    const secret = process.env.FORMAPLAY_ADMIN_SECRET?.trim();

    // Apenas GET pode passar sem token se formos permitir GET público, 
    // mas como o frontend atual usa supabase client, deixaremos esta API estritamente para admin.
    if (!adminToken || adminToken !== secret) {
      return new Response(JSON.stringify({ error: 'Acesso negado. Token administrativo inválido.' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Configuração de banco de dados ausente no servidor.' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify(data), { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        } 
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      validarProduto(body);

      const { data, error } = await supabase
        .from('produtos')
        .insert([body])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') throw new Error('Já existe um produto com este SKU.');
        throw error;
      }
      return new Response(JSON.stringify(data), { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await req.json();
      const { id, ...updates } = body;
      
      if (!id) throw new Error('ID do produto é obrigatório para atualização.');
      if (req.method === 'PUT') validarProduto(updates); // PATCH pode ter update parcial, mas vamos validar o que vier

      const { data, error } = await supabase
        .from('produtos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') throw new Error('Já existe outro produto com este SKU.');
        throw error;
      }
      return new Response(JSON.stringify(data), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido.' }), { 
      status: 405, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('Erro na API de Produtos:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno do servidor.' }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}

function validarProduto(p: any) {
  if (!p.nome || typeof p.nome !== 'string' || !p.nome.trim()) throw new Error('Nome é obrigatório.');
  if (!p.sku || typeof p.sku !== 'string' || !p.sku.trim()) throw new Error('SKU é obrigatório.');
  if (!p.revisao || typeof p.revisao !== 'string' || !p.revisao.trim()) throw new Error('Revisão é obrigatória.');
  if (p.preco_base === undefined || p.preco_base < 0) throw new Error('Preço Base inválido.');
  if (p.peso_kg === undefined || p.peso_kg < 0) throw new Error('Peso inválido.');
  if (p.altura_cm === undefined || p.altura_cm < 0) throw new Error('Altura inválida.');
  if (p.largura_cm === undefined || p.largura_cm < 0) throw new Error('Largura inválida.');
  if (p.comprimento_cm === undefined || p.comprimento_cm < 0) throw new Error('Comprimento inválido.');
  if (p.maximo_unidades_por_volume === undefined || p.maximo_unidades_por_volume < 1) throw new Error('Máximo de unidades por volume deve ser ao menos 1.');
  if (p.status_comercial && !STATUS_COMERCIAIS.includes(p.status_comercial)) {
    throw new Error(`Status Comercial inválido. Deve ser um de: ${STATUS_COMERCIAIS.join(', ')}`);
  }
  if (p.imagem_url && typeof p.imagem_url === 'string') {
    p.imagem_url = p.imagem_url.trim();
  }
}
