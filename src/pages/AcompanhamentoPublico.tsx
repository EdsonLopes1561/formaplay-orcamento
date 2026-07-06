import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { FormaPlayBrand } from '../components/FormaPlayBrand';
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Download,
  Truck,
  CreditCard,
  MessageCircle,
  Activity,
  FileDown,
  Send,
  BadgeCheck,
  Receipt,
  PackageCheck,
  ExternalLink
} from 'lucide-react';

interface DadosAcompanhamento {
  numero: string;
  cliente_nome_publico: string;
  produto: string;
  quantidade: number;
  status_acompanhamento: string;
  status_atualizado_em: string;
  observacao_publica_status: string;
  nf_emitida: boolean;
  nf_numero: string;
  nf_emitida_em: string;
  nf_pdf_url: string;
  historico_status?: {
    status: string;
    data_status: string;
    observacao_publica?: string | null;
  }[];
  transportadora?: string | null;
  codigo_rastreio?: string | null;
  link_rastreio?: string | null;
  data_envio?: string | null;
  previsao_entrega?: string | null;
  data_entrega?: string | null;
  observacao_entrega_publica?: string | null;
}

const ETAPAS_TIMELINE = [
  "Solicitação recebida",
  "Orçamento enviado",
  "Aguardando confirmação do cliente",
  "Aguardando pagamento ou autorização",
  "Pagamento/autorização aprovado",
  "Pedido em produção",
  "Nota fiscal emitida",
  "Pedido em fase de entrega",
  "Pedido entregue"
];

export function AcompanhamentoPublico() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosAcompanhamento | null>(null);

  useEffect(() => {
    async function carregarDados() {
      if (!token) {
        setError('Token não fornecido.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: rpcError } = await supabase.rpc('buscar_acompanhamento_pedido', {
          p_token: token
        });

        if (rpcError) throw rpcError;

        if (!data || data.length === 0) {
          setError('Pedido não encontrado ou link inválido.');
        } else {
          setDados(data[0] as DadosAcompanhamento);
        }
      } catch (err: any) {
        console.error('Erro ao buscar pedido:', err);
        setError('Erro ao carregar os dados do pedido. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center text-slate-200">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
        <p className="mt-6 text-slate-400 font-bold uppercase tracking-widest text-sm">Buscando pedido...</p>
      </div>
    );
  }

  if (error || !dados) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center p-4 text-slate-200">
        <div className="bg-blue-950/40 p-8 rounded-3xl border border-blue-900/50 max-w-md w-full text-center shadow-2xl">
          <AlertCircle size={48} className="mx-auto text-rose-500 mb-4 opacity-80" />
          <h2 className="text-xl font-black text-white mb-2">Ops!</h2>
          <p className="text-slate-400 font-medium">{error || 'Pedido não encontrado.'}</p>
          <div className="mt-8 pt-6 border-t border-blue-900/50">
            <p className="text-xs text-slate-500">
              Verifique se o link está correto ou entre em contato com o nosso atendimento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isCancelado = dados.status_acompanhamento === 'Cancelado';
  const etapasAtuais = isCancelado ? [...ETAPAS_TIMELINE, "Cancelado"] : ETAPAS_TIMELINE;
  let currentIndex = etapasAtuais.indexOf(dados.status_acompanhamento || "Solicitação recebida");
  const nfIndex = etapasAtuais.indexOf("Nota fiscal emitida");

  const getStatusColor = (index: number, etapaNome: string) => {
    if (isCancelado) {
      if (index === currentIndex) return 'text-rose-400 bg-rose-500/10 border-rose-500/50 scale-110 shadow-[0_0_20px_rgba(244,63,94,0.3)] z-20';
      return 'text-slate-600 bg-slate-900/50 border-slate-800'; 
    }
    
    if (index === nfIndex && dados.nf_emitida) {
      if (index === currentIndex) return 'text-blue-400 bg-blue-500/20 border-blue-400/50 shadow-[0_0_25px_rgba(59,130,246,0.4)] scale-125 z-20';
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
    }
    
    if (index < currentIndex) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
    
    if (index === currentIndex) {
      if (etapaNome === "Pedido entregue") {
        return 'text-emerald-300 bg-emerald-500/20 border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-125 z-20 ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-[#0a0f1d]';
      }
      return 'text-blue-400 bg-blue-500/20 border-blue-400/50 shadow-[0_0_25px_rgba(59,130,246,0.4)] scale-125 z-20';
    }
    
    return 'text-slate-500 bg-slate-800/30 border-slate-700/50';
  };

  const getIcon = (index: number, etapaNome: string) => {
    let IconComp = CheckCircle2; 

    if (etapaNome === "Solicitação recebida") IconComp = FileDown;
    else if (etapaNome === "Orçamento enviado") IconComp = Send;
    else if (etapaNome === "Aguardando confirmação do cliente") IconComp = Clock;
    else if (etapaNome === "Aguardando pagamento ou autorização") IconComp = CreditCard;
    else if (etapaNome === "Pagamento/autorização aprovado") IconComp = BadgeCheck;
    else if (etapaNome === "Pedido em produção") IconComp = Package;
    else if (etapaNome === "Nota fiscal emitida") IconComp = Receipt;
    else if (etapaNome === "Pedido em fase de entrega") IconComp = Truck;
    else if (etapaNome === "Pedido entregue") IconComp = PackageCheck;
    else if (etapaNome === "Cancelado") IconComp = XCircle;
    
    // Future expansion: "Conferência do pedido" -> ClipboardCheck
    // Future expansion: "Conferência antes da entrega" -> SearchCheck

    return (
      <div className="relative flex items-center justify-center w-full h-full">
        <IconComp size={index === currentIndex ? 24 : 20} className="relative z-10 sm:w-7 sm:h-7" />
        {/* Adiciona um mini check para etapas concluídas se não for a atual nem cancelada */}
        {((index < currentIndex && !isCancelado) || (index === nfIndex && dados.nf_emitida && !isCancelado && index !== currentIndex)) && (
          <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-[#0a0f1d] rounded-full text-emerald-400 p-0.5 sm:p-1 shadow-md border border-emerald-500/30 z-20 transition-transform hover:scale-110">
            <CheckCircle2 size={16} strokeWidth={3} className="sm:w-5 sm:h-5" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,58,138,0.15),rgba(255,255,255,0))] text-slate-200 font-sans selection:bg-emerald-500/30">
      
      <header className="border-b border-blue-900/50 bg-blue-950/30 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-emerald-500/50 bg-white p-0.5 shadow-lg flex-shrink-0">
              <img src="/logocircular.png" alt="FormaPlay" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-black text-white text-lg tracking-tight leading-none"><FormaPlayBrand /></h1>
              <p className="text-[10px] sm:text-xs text-emerald-400 font-bold uppercase tracking-wider mt-0.5">Acompanhamento</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 font-medium">Pedido</p>
            <p className="font-black text-white text-lg">{dados.numero}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {isCancelado && (
          <div className="bg-rose-950/20 border border-rose-900/50 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <h2 className="text-xl font-black text-rose-500 mb-2 flex items-center gap-2">
              <XCircle size={24} />
              Pedido Cancelado
            </h2>
            <p className="text-rose-200/80 font-medium">
              Este pedido foi cancelado e não terá novas atualizações de entrega ou produção.
            </p>
          </div>
        )}
        
        <div className="bg-blue-950/40 rounded-3xl border border-blue-900/50 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
            <Package className="text-emerald-400" />
            Resumo do Pedido
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Cliente</p>
              <p className="font-semibold text-slate-200">{dados.cliente_nome_publico}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Produto</p>
              <p className="font-semibold text-slate-200 truncate" title={dados.produto}>{dados.produto || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Quantidade</p>
              <p className="font-black text-emerald-400 text-lg leading-none">{dados.quantidade}</p>
            </div>
          </div>
        </div>

        {(dados.observacao_publica_status || (dados.nf_emitida && dados.nf_numero)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {dados.observacao_publica_status && (
              <div className="bg-amber-950/20 border border-amber-900/50 rounded-2xl p-5 shadow-lg">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MessageCircle size={14} />
                  Aviso Importante
                </h3>
                <p className="text-sm text-amber-100/90 font-medium">
                  {dados.observacao_publica_status}
                </p>
              </div>
            )}

            {dados.nf_emitida && dados.nf_numero && (
              <div className="bg-blue-950/40 border border-blue-900/50 rounded-2xl p-5 shadow-lg flex flex-col justify-center">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                      <FileText size={14} />
                      Nota Fiscal
                    </h3>
                    <p className="font-bold text-white text-lg">{dados.nf_numero}</p>
                    {dados.nf_emitida_em && (
                      <p className="text-xs text-slate-400 mt-0.5">Emitida em {new Date(dados.nf_emitida_em + 'T12:00:00Z').toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                  {dados.nf_pdf_url && dados.nf_pdf_url.startsWith('http') ? (
                    <a 
                      href={dados.nf_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg transition-all active:scale-95 sm:ml-auto w-fit"
                      title="Baixar DANFE / Nota Fiscal"
                    >
                      <Download size={20} /> Baixar DANFE
                    </a>
                  ) : (
                    <div className="text-sm text-slate-400 font-medium sm:text-right bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/30">
                      Nota fiscal emitida. Link de download ainda não disponível.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Entrega e Rastreamento */}
        {(dados.transportadora || dados.codigo_rastreio || dados.link_rastreio || dados.data_envio || dados.previsao_entrega || dados.data_entrega || dados.observacao_entrega_publica) && (
          <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h2 className="text-xl font-black text-white flex items-center gap-2 mb-6">
              <Truck className="text-indigo-400" />
              Entrega e Rastreamento
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {dados.transportadora && (
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Transportadora</p>
                  <p className="font-semibold text-slate-200">{dados.transportadora}</p>
                </div>
              )}
              
              {dados.codigo_rastreio && (
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Código de Rastreio</p>
                  <p className="font-bold text-white tracking-wide">{dados.codigo_rastreio}</p>
                </div>
              )}
              
              {(dados.codigo_rastreio || dados.link_rastreio) && (
                <div className="sm:text-right md:col-start-3 flex flex-col justify-center">
                  {(dados.link_rastreio && (dados.link_rastreio.startsWith('http://') || dados.link_rastreio.startsWith('https://'))) ? (
                    <a 
                      href={dados.link_rastreio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg transition-all active:scale-95 sm:ml-auto w-fit"
                    >
                      Acompanhar entrega <ExternalLink size={16} />
                    </a>
                  ) : (
                    <div className="text-sm text-slate-400 font-medium bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/30 sm:ml-auto w-fit mt-2 sm:mt-0">
                      Link de rastreio indisponível.
                    </div>
                  )}
                </div>
              )}

              {dados.data_envio && (
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Data de Envio</p>
                  <p className="font-semibold text-slate-300">
                    {new Date(dados.data_envio + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              {dados.previsao_entrega && (
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Previsão de Entrega</p>
                  <p className="font-semibold text-amber-400">
                    {new Date(dados.previsao_entrega + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              {dados.observacao_entrega_publica && (
                <div className="sm:col-span-2 md:col-span-3 mt-2 bg-indigo-950/40 p-4 rounded-xl border border-indigo-900/30">
                  <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                    <MessageCircle size={14} /> Observação
                  </p>
                  <p className="text-sm text-indigo-100/90 font-medium">{dados.observacao_entrega_publica}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-blue-950/40 rounded-3xl border border-blue-900/50 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Activity className="text-emerald-400" />
              Linha do Tempo
            </h2>
            {dados.status_atualizado_em && (
              <p className="text-xs text-slate-500 font-medium text-right">
                Atualizado em:<br className="sm:hidden" />
                <span className="text-slate-300 ml-1">
                  {new Date(dados.status_atualizado_em).toLocaleString('pt-BR')}
                </span>
              </p>
            )}
          </div>

          <div className="relative px-2 sm:px-6">
            <div className="space-y-0 relative">
              {etapasAtuais.map((etapa, idx) => {
                if (isCancelado && idx > currentIndex) return null;

                const styling = getStatusColor(idx, etapa);
                const isActive = idx === currentIndex;
                const isPast = (idx < currentIndex && !isCancelado) || (idx === nfIndex && dados.nf_emitida && !isCancelado);
                const isNextActive = (idx + 1 === currentIndex && !isCancelado) || (isPast && idx + 1 <= currentIndex);
                
                const isLastVisible = isCancelado ? idx === currentIndex : idx === etapasAtuais.length - 1;

                // Busca data real no histórico ou aplica fallbacks de segurança para pedidos antigos
                const hist = dados.historico_status?.find(h => h.status === etapa);
                let dataEtapa: string | undefined = hist?.data_status;
                
                // Aplicar regra de prioridade de rastreamento (Fase 4)
                if (etapa === "Pedido em fase de entrega" && dados.data_envio) {
                  dataEtapa = dados.data_envio + 'T12:00:00Z';
                }
                
                if (!dataEtapa) {
                  if (isActive && !isCancelado) {
                    dataEtapa = dados.status_atualizado_em;
                  } else if (etapa === "Nota fiscal emitida" && dados.nf_emitida && dados.nf_emitida_em) {
                    dataEtapa = dados.nf_emitida_em + 'T12:00:00Z'; // Fallback para data
                  }
                }

                let dataFormatada = null;
                if (dataEtapa) {
                  const d = new Date(dataEtapa);
                  dataFormatada = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  if (dataEtapa.includes('T') && !dataEtapa.endsWith('T12:00:00Z')) {
                    dataFormatada += ` às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                  }
                }

                return (
                  <div key={idx} className={`flex items-start gap-4 sm:gap-8 group transition-all duration-500 relative pb-8 sm:pb-12 ${isPast ? 'opacity-100' : 'opacity-80'}`}>
                    
                    {/* Linha conectora segmentada inteligente */}
                    {!isLastVisible && (
                      <div className={`absolute left-[19px] sm:left-[26px] top-[40px] sm:top-[56px] bottom-[8px] w-0.5 sm:w-1 rounded-full z-0 transition-colors duration-700 ${
                        isPast && (isNextActive || idx < currentIndex - 1) ? 'bg-emerald-500/70 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-800/60'
                      }`} />
                    )}

                    <div className="relative z-10 pt-1">
                      <div className={`relative flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${styling}`}>
                        {getIcon(idx, etapa)}
                      </div>
                    </div>
                    
                    <div className={`pt-2 sm:pt-4 flex-1 min-w-0 ${isActive ? 'scale-105 transform origin-left transition-transform duration-500' : ''}`}>
                      <h4 className={`text-sm sm:text-lg transition-colors duration-500 ${
                        isActive 
                          ? (isCancelado ? 'text-rose-400 font-black' : (etapa === "Pedido entregue" ? 'text-emerald-400 font-black tracking-wide drop-shadow-[0_2px_15px_rgba(16,185,129,0.5)]' : 'text-white font-black tracking-wide drop-shadow-[0_2px_10px_rgba(59,130,246,0.5)]')) 
                          : (isPast ? 'text-emerald-50/90 font-bold' : 'text-slate-500 font-semibold')
                      }`}>
                        {etapa}
                      </h4>
                      
                      {/* Exibição da Data da Etapa */}
                      {dataFormatada ? (
                        <p className={`text-[11px] sm:text-xs font-semibold mt-0.5 sm:mt-1 ${
                          isActive && !isCancelado ? (etapa === "Pedido entregue" ? 'text-emerald-200/90' : 'text-blue-200/90') : (isPast ? 'text-emerald-400/80' : 'text-slate-400')
                        }`}>
                          {dataFormatada}
                        </p>
                      ) : (
                        (!isPast && !isActive && !isCancelado) && (
                          <p className="text-[11px] sm:text-xs font-medium mt-0.5 sm:mt-1 text-slate-600/60">
                            Aguardando
                          </p>
                        )
                      )}

                      {isActive && !isCancelado && (
                        etapa === "Pedido entregue" ? (
                          <div className="mt-2 sm:mt-3 bg-gradient-to-r from-emerald-900/40 to-emerald-900/10 border border-emerald-500/30 p-3 sm:p-4 rounded-xl shadow-lg">
                            <p className="text-xs sm:text-sm text-emerald-200 font-medium leading-relaxed">
                              <span className="font-bold text-emerald-400 block mb-1">Missão Concluída! 🎉</span>
                              Parabéns! O Desafio Logístico chegou ao destino final. Agora a rota continua com aprendizado, estratégia e muita diversão.
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-blue-200/90 mt-1 sm:mt-1.5 font-medium leading-relaxed max-w-md">
                            Este é o status atual do seu pedido.<br className="hidden sm:block" /> Acompanhe as próximas atualizações por aqui.
                          </p>
                        )
                      )}
                      {isActive && isCancelado && (
                        <p className="text-xs sm:text-sm text-rose-500/90 mt-1 font-medium">
                          Pedido cancelado.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="text-center mt-12 pb-8">
          <p className="text-xs text-slate-500 font-medium">
            Em caso de dúvidas, entre em contato com nosso suporte via WhatsApp.
          </p>
          <p className="text-[10px] text-slate-600 mt-2">
            &copy; {new Date().getFullYear()} FormaPlay. Todos os direitos reservados.
          </p>
        </div>

      </main>
    </div>
  );
}
