import { createClient } from '@supabase/supabase-js';

const BUCKET = 'documentos-pedidos';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

// Testa endpoint GET /api/documentos-download → deve retornar 405
async function testGetMethod() {
  const resp = await fetch('http://localhost:3000/api/documentos-download', {
    method: 'GET',
  });
  const body = await resp.json();
  console.log('[Teste 1] GET → deve ser 405:', resp.status === 405 ? '✅ PASS' : `❌ FAIL (${resp.status})`, JSON.stringify(body));
}

// Testa POST sem body
async function testPostNoBody() {
  const resp = await fetch('http://localhost:3000/api/documentos-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const body = await resp.json();
  console.log('[Teste 2] POST sem campos → deve ser 400:', resp.status === 400 ? '✅ PASS' : `❌ FAIL (${resp.status})`, JSON.stringify(body));
}

// Testa POST com token ausente
async function testMissingToken() {
  const resp = await fetch('http://localhost:3000/api/documentos-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documento_id: '00000000-0000-4000-a000-000000000000' }),
  });
  const body = await resp.json();
  console.log('[Teste 3] Token ausente → deve ser 400:', resp.status === 400 ? '✅ PASS' : `❌ FAIL (${resp.status})`, JSON.stringify(body));
}

// Testa POST com documento_id inválido (não-UUID)
async function testInvalidUuid() {
  const resp = await fetch('http://localhost:3000/api/documentos-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_publico: 'token-qualquer', documento_id: 'nao-e-uuid' }),
  });
  const body = await resp.json();
  console.log('[Teste 4] UUID inválido → deve ser 400:', resp.status === 400 ? '✅ PASS' : `❌ FAIL (${resp.status})`, JSON.stringify(body));
}

// Testa POST com UUID válido porém inexistente no banco
async function testInexistentUuid() {
  const resp = await fetch('http://localhost:3000/api/documentos-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token_publico: 'token-invalido-qualquer',
      documento_id: '00000000-0000-4000-8000-000000000000',
    }),
  });
  const body = await resp.json();
  console.log('[Teste 5] UUID inexistente + token inválido → deve ser 404:', resp.status === 404 ? '✅ PASS' : `❌ FAIL (${resp.status})`, JSON.stringify(body));
}

// Testa que a resposta nunca vaza storage_path
async function testNaoExposePath() {
  const resp = await fetch('http://localhost:3000/api/documentos-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token_publico: 'token-invalido',
      documento_id: '00000000-0000-4000-8000-000000000001',
    }),
  });
  const body = await resp.json();
  const temPath = JSON.stringify(body).includes('storage_path');
  console.log('[Teste 6] Resposta não deve vazar storage_path:', !temPath ? '✅ PASS' : '❌ FAIL', JSON.stringify(body));
}

async function runAll() {
  console.log('\n=== Testes da API /api/documentos-download ===');
  console.log('⚠️  Certifique-se que o servidor local está rodando (npm run dev).\n');
  await testGetMethod();
  await testPostNoBody();
  await testMissingToken();
  await testInvalidUuid();
  await testInexistentUuid();
  await testNaoExposePath();
  console.log('\n=== Testes concluídos ===');
}

runAll().catch(err => {
  console.error('Erro ao rodar testes:', err.message);
  console.log('(Se o servidor não estiver rodando, inicie com `npm run dev` e re-execute este script.)');
});
