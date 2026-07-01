import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar Token de Administrador
  const token = req.headers['x-push-admin-token'];
  const expectedToken = process.env.PUSH_ADMIN_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { subscription, user_agent, device_label } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
    return res.status(400).json({ error: 'Incomplete subscription data' });
  }

  if (!supabaseUrl || !supabaseServiceRole) {
    return res.status(500).json({ error: 'Supabase server environment configuration is missing' });
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);
    
    // Tenta atualizar ou inserir a inscrição no banco
    const { data, error } = await supabaseClient
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: user_agent || null,
          device_label: device_label || null,
          ativo: true,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'endpoint' }
      )
      .select();

    if (error) {
      console.error('[API Subscribe] Error upserting subscription:', error);
      return res.status(500).json({ error: error.message });
    }

    // Se um device_label foi fornecido, desativa outras inscrições ativas com o mesmo nome de aparelho e endpoint diferente
    if (device_label && typeof device_label === 'string' && device_label.trim() !== '') {
      try {
        const { error: deactivateError } = await supabaseClient
          .from('push_subscriptions')
          .update({ ativo: false })
          .eq('device_label', device_label.trim())
          .neq('endpoint', subscription.endpoint);

        if (deactivateError) {
          console.error('[API Subscribe] Error deactivating duplicate device labels:', deactivateError);
        }
      } catch (deactErr) {
        console.error('[API Subscribe] Exception deactivating duplicates:', deactErr);
      }
    }

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('[API Subscribe] Internal error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
