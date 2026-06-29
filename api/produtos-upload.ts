import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const timeoutPromise = (ms: number, message: string) => 
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms));

export default async function handler(req: Request) {
  const commonHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido.', code: 'METHOD_NOT_ALLOWED' }), { status: 405, headers: commonHeaders });
    }

    const adminToken = req.headers.get('x-admin-token')?.trim();
    const secret = process.env.FORMAPLAY_ADMIN_SECRET?.trim();

    if (!adminToken || adminToken !== secret) {
      return new Response(JSON.stringify({ error: 'Acesso negado. Token administrativo inválido.', code: 'UNAUTHORIZED' }), { status: 401, headers: commonHeaders });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Configuração de upload ausente.', code: 'UPLOAD_CONFIG_MISSING' }), { status: 500, headers: commonHeaders });
    }

    const t0 = performance.now();
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Falha ao ler o corpo da requisição JSON.', code: 'INVALID_BODY' }), { status: 400, headers: commonHeaders });
    }
    const t1 = performance.now();

    const { sku, contentType, size } = body;

    if (!sku || typeof sku !== 'string') {
      return new Response(JSON.stringify({ error: 'SKU é obrigatório para estruturar a pasta da imagem.', code: 'INVALID_BODY' }), { status: 400, headers: commonHeaders });
    }

    const sanitizedSku = sku.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
    if (!sanitizedSku) {
      return new Response(JSON.stringify({ error: 'SKU inválido.', code: 'INVALID_BODY' }), { status: 400, headers: commonHeaders });
    }

    const validMimes: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };

    if (!validMimes[contentType]) {
      return new Response(JSON.stringify({ error: 'Tipo de arquivo não suportado. Envie apenas JPG, PNG ou WEBP.', code: 'INVALID_FILE' }), { status: 400, headers: commonHeaders });
    }

    const MAX_SIZE = 3 * 1024 * 1024; // 3 MB
    if (size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'O arquivo excede o limite máximo de 3 MB.', code: 'INVALID_FILE' }), { status: 400, headers: commonHeaders });
    }

    const ext = validMimes[contentType];
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filePath = `produtos/${sanitizedSku}/${timestamp}-${randomId}.${ext}`;

    const t2 = performance.now();
    console.log(`[Upload] request received - method: POST, contentType: ${contentType}, size: ${size}, sku: ${sanitizedSku}, hasSupabaseUrl: ${!!supabaseUrl}, hasServiceRoleKey: ${!!serviceRoleKey}`);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const t3 = performance.now();
    
    // Create signed upload URL with 15s timeout protection
    const signedDataPromise = supabase.storage
      .from('product-images')
      .createSignedUploadUrl(filePath);
      
    const { data: signedData, error: signedError } = await Promise.race([
      signedDataPromise,
      timeoutPromise(15000, 'Tempo excedido ao preparar upload.')
    ]) as any;

    const t4 = performance.now();
    console.log(`[Diagnostic] createSignedUploadUrl time: ${(t4 - t3).toFixed(2)} ms`);

    if (signedError || !signedData) {
      console.log(`[Diagnostic] Supabase error code: SIGNED_URL_FAILED`);
      return new Response(JSON.stringify({ error: 'Falha ao gerar autorização de upload.', code: 'SIGNED_URL_FAILED' }), { status: 500, headers: commonHeaders });
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return new Response(JSON.stringify({ 
      path: filePath,
      token: signedData.token,
      publicUrl: urlData.publicUrl 
    }), { status: 200, headers: commonHeaders });

  } catch (error: any) {
    if (error.message === 'Tempo excedido ao preparar upload.') {
      return new Response(JSON.stringify({ error: error.message, code: 'SIGNED_URL_TIMEOUT' }), { status: 504, headers: commonHeaders });
    }
    return new Response(JSON.stringify({ error: error.message || 'Erro interno do servidor.', code: 'INTERNAL_ERROR' }), { status: 400, headers: commonHeaders });
  }
}
