import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.body;

  if (!id || typeof id !== 'string' || !uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
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

    // 1. Buscar a solicitação correspondente ao ID
    const { data: requestData, error: requestError } = await supabaseClient
      .from('solicitacoes_orcamento')
      .select('*')
      .eq('id', id)
      .single();

    if (requestError || !requestData) {
      console.error('[API Notify] Request not found in DB:', id, requestError);
      return res.status(404).json({ error: 'Request not found in database' });
    }

    // 2. Validar se a solicitação foi criada nos últimos 10 minutos (segurança)
    const createdAtTime = new Date(requestData.created_at).getTime();
    const nowTime = Date.now();
    const tenMinutesMs = 10 * 60 * 1000;

    if (nowTime - createdAtTime > tenMinutesMs) {
      return res.status(400).json({ error: 'Request was created too long ago (expired)' });
    }

    // 3. Validar se já foi notificada (idempotência)
    if (requestData.push_notified_at) {
      return res.status(200).json({ success: true, message: 'Notification already sent (idempotent)' });
    }

    // 4. Buscar assinaturas push ativas
    const { data: subscriptions, error: subsError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('ativo', true);

    if (subsError) {
      console.error('[API Notify] Error fetching active subscriptions:', subsError);
      return res.status(500).json({ error: subsError.message });
    }

    // Deduplicação em memória por device_label (mantém apenas o registro mais recente para cada aparelho)
    let filteredSubscriptions: any[] = [];
    if (subscriptions && subscriptions.length > 0) {
      const groups: Record<string, any[]> = {};
      
      for (const sub of subscriptions) {
        const label = (sub.device_label || '').trim();
        if (label === '') {
          // Se o rótulo do aparelho estiver vazio, mantém diretamente (não agrupa)
          filteredSubscriptions.push(sub);
        } else {
          if (!groups[label]) {
            groups[label] = [];
          }
          groups[label].push(sub);
        }
      }

      // Para cada grupo de aparelho com o mesmo nome, mantém o mais recente
      for (const label of Object.keys(groups)) {
        const list = groups[label];
        if (list.length === 1) {
          filteredSubscriptions.push(list[0]);
        } else {
          // Ordena decrescente pela data mais recente disponível
          list.sort((a, b) => {
            const timeA = new Date(a.updated_at || a.last_seen_at || a.created_at || 0).getTime();
            const timeB = new Date(b.updated_at || b.last_seen_at || b.created_at || 0).getTime();
            return timeB - timeA;
          });
          filteredSubscriptions.push(list[0]);
        }
      }
    }

    // Se não houver aparelhos cadastrados, encerramos silenciosamente
    if (!filteredSubscriptions || filteredSubscriptions.length === 0) {
      // Registrar data de notificação para marcar como processada
      await supabaseClient
        .from('solicitacoes_orcamento')
        .update({ push_notified_at: new Date().toISOString() })
        .eq('id', id);

      return res.status(200).json({ success: true, message: 'No active device subscriptions found' });
    }

    // 5. Montar o resumo da mensagem (Multi-itens)
    let resumoItens = '';
    const items = requestData.itens; // Array de itens salvo na coluna JSONB

    if (Array.isArray(items) && items.length > 0) {
      if (items.length === 1) {
        const singleItem = items[0];
        resumoItens = `${singleItem.quantidade}x ${singleItem.nome}`;
      } else {
        resumoItens = `${items.length} produtos solicitados`;
      }
    } else {
      // Fallback para campos da estrutura antiga
      const qtdFallback = requestData.quantidade || 1;
      const jogoFallback = requestData.jogo_escolhido || 'Desafio Logístico';
      resumoItens = `${qtdFallback}x ${jogoFallback}`;
    }

    const clientName = requestData.nome_razao || 'Cliente não identificado';
    const messageBody = `Cliente: ${clientName} — ${resumoItens}`;

    // 6. Configurar web-push
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const payload = JSON.stringify({
      title: 'Nova solicitação recebida',
      body: messageBody,
      url: '/',
      icon: '/logocircular.png',
      badge: '/logocircular.png'
    });

    // 7. Enviar notificações para todos os dispositivos ativos filtrados
    const sendPromises = filteredSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          payload
        );
      } catch (pushErr: any) {
        console.error(`[API Notify] Push failed for endpoint ${sub.endpoint}:`, pushErr);
        // Se retornar 404 (Not Found) ou 410 (Gone), desativa a inscrição
        if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
          try {
            await supabaseClient
              .from('push_subscriptions')
              .update({ ativo: false })
              .eq('endpoint', sub.endpoint);
          } catch (dbUpdateErr) {
            console.error('[API Notify] Failed to deactivate expired subscription:', dbUpdateErr);
          }
        }
      }
    });

    await Promise.all(sendPromises);

    // 8. Marcar solicitação como notificada no banco
    await supabaseClient
      .from('solicitacoes_orcamento')
      .update({ push_notified_at: new Date().toISOString() })
      .eq('id', id);

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[API Notify] Internal exception:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during notification dispatch' });
  }
}
