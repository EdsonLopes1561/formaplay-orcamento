import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

// UUID v4 regex (básico mas suficiente para rejeitar lixo antes de consultar o banco)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SECURE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const err = (status: number, msg: string) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: SECURE_HEADERS });

export default async function handler(req: Request) {
  // 1. Somente POST
  if (req.method !== 'POST') {
    return err(405, 'Método não permitido.');
  }

  // 2. Inicializar Supabase Admin (padrão do projeto)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[documentos-download] Variáveis de ambiente do Supabase ausentes.');
    return err(500, 'Erro interno de configuração.');
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Ler e validar body
  let body: { token_publico?: unknown; documento_id?: unknown };
  try {
    const raw = await req.text();
    if (raw.length > 2048) {
      return err(400, 'Requisição inválida.');
    }
    body = JSON.parse(raw);
  } catch {
    return err(400, 'Requisição inválida.');
  }

  const { token_publico, documento_id } = body;

  if (!token_publico || typeof token_publico !== 'string' || token_publico.trim().length < 8) {
    return err(400, 'Requisição inválida.');
  }

  if (!documento_id || typeof documento_id !== 'string' || !UUID_REGEX.test(documento_id.trim())) {
    return err(400, 'Requisição inválida.');
  }

  const tokenSanitizado = token_publico.trim();
  const documentoId = documento_id.trim();

  // 4. Validar a cadeia completa no banco:
  //    documento → orcamento → token_publico coincide e visivel_cliente = true
  //    Nunca aceitar storage_path vindo do frontend.
  const { data: resultado, error: dbError } = await supabaseAdmin
    .from('documentos_pedido')
    .select(`
      id,
      storage_path,
      nome_arquivo,
      mime_type,
      visivel_cliente,
      orcamentos!inner (
        token_publico
      )
    `)
    .eq('id', documentoId)
    .eq('visivel_cliente', true)
    .eq('orcamentos.token_publico', tokenSanitizado)
    .single();

  if (dbError || !resultado) {
    // Resposta genérica — sem diferenciar "token errado" de "invisível" de "não existe"
    // para evitar enumeração
    console.log(`[documentos-download] Acesso negado: doc_id_prefix=${documentoId.substring(0, 8)}`);
    return err(404, 'Documento não encontrado ou indisponível.');
  }

  // 5. Segurança extra: confirmar visivel_cliente no objeto retornado
  //    (mesmo que o filtro já garantiu, validamos defensivamente)
  if (!resultado.visivel_cliente) {
    return err(404, 'Documento não encontrado ou indisponível.');
  }

  const storagePath: string = resultado.storage_path;
  const nomeArquivo: string = resultado.nome_arquivo;

  // 6. Gerar Signed URL temporária de 60 segundos
  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from('documentos-pedidos')
    .createSignedUrl(storagePath, 60, {
      download: nomeArquivo, // força download com nome amigável no navegador
    });

  if (signedError || !signedData?.signedUrl) {
    console.error('[documentos-download] Erro ao gerar signed URL.');
    return err(500, 'Não foi possível gerar o link de download. Tente novamente.');
  }

  // 7. Resposta de sucesso — sem expor storage_path, orcamento_id, created_by etc.
  return new Response(
    JSON.stringify({
      url: signedData.signedUrl,
      expires_in: 60,
      nome_arquivo: nomeArquivo,
    }),
    { status: 200, headers: SECURE_HEADERS }
  );
}
