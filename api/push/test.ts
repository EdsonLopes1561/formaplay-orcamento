import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

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

  const { subscription } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Subscription endpoint is required' });
  }

  if (!supabaseUrl || !supabaseServiceRole) {
    return res.status(500).json({ error: 'Supabase server environment configuration is missing' });
  }

  const vapidSubject = process.env.VAPID_SUBJECT;
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({ error: 'VAPID keys not configured in backend' });
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);
    
    // Verificar se inscrição existe e está ativa no banco
    const { data: dbSub, error: dbError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('endpoint', subscription.endpoint)
      .single();

    if (dbError || !dbSub) {
      return res.status(404).json({ error: 'Subscription not found in database. Please activate notifications first.' });
    }

    if (!dbSub.ativo) {
      return res.status(400).json({ error: 'Subscription is currently inactive in database.' });
    }

    // Configurar web-push
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Payload de teste
    const payload = JSON.stringify({
      title: 'Nova solicitação recebida',
      body: 'Teste real de notificação da FormaPlay.',
      url: '/',
      icon: '/logocircular.png',
      badge: '/logocircular.png'
    });

    // Enviar notificação
    await webpush.sendNotification(
      {
        endpoint: dbSub.endpoint,
        keys: {
          p256dh: dbSub.p256dh,
          auth: dbSub.auth
        }
      },
      payload
    );

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[API Test] Error processing test notification:', err);
    
    // Se o serviço do push da Google/Apple retornar 410/404 (aparelho desinstalou), desativamos
    if (err.statusCode === 404 || err.statusCode === 410) {
      try {
        const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);
        await supabaseClient
          .from('push_subscriptions')
          .update({ ativo: false })
          .eq('endpoint', subscription.endpoint);
      } catch (dbUpdateErr) {
        console.error('[API Test] Failed to deactivate invalid subscription:', dbUpdateErr);
      }
      return res.status(err.statusCode).json({ error: 'Subscription expired or uninstalled. Deactivated in database.' });
    }

    return res.status(500).json({ error: err.message || 'Error delivering push notification' });
  }
}
