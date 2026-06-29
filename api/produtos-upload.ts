import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: Request) {
  const commonHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido.' }), { status: 405, headers: commonHeaders });
    }

    const adminToken = req.headers.get('x-admin-token')?.trim();
    const secret = process.env.FORMAPLAY_ADMIN_SECRET?.trim();

    if (!adminToken || adminToken !== secret) {
      return new Response(JSON.stringify({ error: 'Acesso negado. Token administrativo inválido.' }), { status: 401, headers: commonHeaders });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Configuração de banco de dados ausente no servidor.' }), { status: 500, headers: commonHeaders });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const sku = formData.get('sku');

    if (!file || !(file instanceof Blob)) {
      return new Response(JSON.stringify({ error: 'Nenhum arquivo enviado.' }), { status: 400, headers: commonHeaders });
    }

    if (!sku || typeof sku !== 'string') {
      return new Response(JSON.stringify({ error: 'SKU é obrigatório para estruturar a pasta da imagem.' }), { status: 400, headers: commonHeaders });
    }

    const sanitizedSku = sku.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
    if (!sanitizedSku) {
      return new Response(JSON.stringify({ error: 'SKU inválido.' }), { status: 400, headers: commonHeaders });
    }

    const mimeType = file.type;
    const validMimes: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };

    if (!validMimes[mimeType]) {
      return new Response(JSON.stringify({ error: 'Tipo de arquivo não suportado. Envie apenas JPG, PNG ou WEBP.' }), { status: 400, headers: commonHeaders });
    }

    const MAX_SIZE = 3 * 1024 * 1024; // 3 MB
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'O arquivo excede o limite máximo de 3 MB.' }), { status: 400, headers: commonHeaders });
    }

    const ext = validMimes[mimeType];
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filePath = `produtos/${sanitizedSku}/${timestamp}-${randomId}.${ext}`;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.error('Erro no upload para o Supabase Storage:', uploadError);
      throw new Error('Falha ao processar o upload no servidor de armazenamento.');
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return new Response(JSON.stringify({ imageUrl: urlData.publicUrl }), { status: 200, headers: commonHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Erro interno do servidor.' }), { status: 400, headers: commonHeaders });
  }
}
