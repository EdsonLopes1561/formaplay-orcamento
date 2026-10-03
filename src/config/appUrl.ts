/**
 * Configuração centralizada da URL oficial da aplicação.
 * 
 * Garante que links de acompanhamento, mensagens de WhatsApp e outros links
 * compartilhados com clientes utilizem sempre o domínio oficial orcamento.formaplayjogos.com.br,
 * mesmo se o operador estiver acessando via formaplay-orcamento.vercel.app ou localhost.
 */

export const OFFICIAL_APP_URL = 'https://orcamento.formaplayjogos.com.br';

export const getAppBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_APP_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return OFFICIAL_APP_URL;
};

export const getPublicOrderTrackingUrl = (token: string): string => {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/acompanhar-pedido/${token}`;
};
