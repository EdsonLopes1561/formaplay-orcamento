import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
  MessageCircle,
  FileDown,
  BadgeCheck,
  Receipt,
  PackageCheck,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Layers,
  Info
} from 'lucide-react';

import { 
  ETAPAS_TIMELINE_PUBLICA, 
  EtapaPublica,
  mapearStatusParaPublico, 
  isFaseOrcamento,
  getMensagemDestaqueFase,
  getTextoAmigavelHistorico,
  TOTAL_ETAPAS_PRODUCAO
} from '../constants/etapasTimeline';

interface HistoricoItem {
  status: string;
  data_status: string;
  observacao_publica?: string | null;
}

interface DadosAcompanhamento {
  numero: string;
  cliente_nome_publico: string;
  produto: string;
  quantidade: number;
  status_acompanhamento: string;
  status_atualizado_em: string;
  observacao_publica_status?: string | null;
  nf_emitida: boolean;
  nf_numero?: string | null;
  nf_emitida_em?: string | null;
  nf_pdf_url?: string | null;
  historico_status?: HistoricoItem[];
  transportadora?: string | null;
  codigo_rastreio?: string | null;
  link_rastreio?: string | null;
  data_envio?: string | null;
  previsao_entrega?: string | null;
  data_entrega?: string | null;
  observacao_entrega_publica?: string | null;
  status_producao?: string | null;
  producao_itens_concluidos?: number | null;
}

interface DocumentoPublico {
  id: string;
  tipo_documento: string;
  titulo: string;
  numero_documento?: string | null;
  data_documento?: string | null;
  nome_arquivo: string;
  tamanho_bytes: number;
}

// Bateria de Mocks para validação completa e confiável de todos os cenários
const TEST_SCENARIOS: Record<string, { dados: DadosAcompanhamento; documentos: DocumentoPublico[] }> = {
  A: {
    dados: {
      numero: 'ORC-2026-001',
      cliente_nome_publico: 'Escola Pequenos Passos',
      produto: 'Desafio Logístico',
      quantidade: 1,
      status_acompanhamento: 'Orçamento criado',
      status_atualizado_em: '2026-10-02T10:15:00-03:00',
      observacao_publica_status: 'Seu orçamento foi gerado com sucesso.',
      nf_emitida: false,
      historico_status: [
        { status: 'Orçamento criado', data_status: '2026-10-02T10:15:00-03:00', observacao_publica: 'Orçamento gerado e disponível para consulta.' }
      ]
    },
    documentos: []
  },
  B: {
    dados: {
      numero: 'ORC-2026-002',
      cliente_nome_publico: 'Colégio Nova Fronteira',
      produto: 'Desafio Logístico',
      quantidade: 2,
      status_acompanhamento: 'Orçamento enviado',
      status_atualizado_em: '2026-10-03T14:32:00-03:00',
      observacao_publica_status: 'Orçamento formal encaminhado por e-mail e WhatsApp.',
      nf_emitida: false,
      historico_status: [
        { status: 'Orçamento criado', data_status: '2026-10-02T09:30:00-03:00', observacao_publica: 'Orçamento criado no sistema.' },
        { status: 'Orçamento enviado', data_status: '2026-10-03T14:32:00-03:00', observacao_publica: 'Seu orçamento foi encaminhado para confirmação.' }
      ]
    },
    documentos: [
      {
        id: 'doc-orc-01',
        tipo_documento: 'orcamento',
        titulo: 'Proposta Comercial — Orçamento Nº ORC-2026-002',
        numero_documento: 'ORC-2026-002',
        data_documento: '2026-10-03',
        nome_arquivo: 'Orcamento_ORC-2026-002_FormaPlay.pdf',
        tamanho_bytes: 4363662
      }
    ]
  },
  C: {
    dados: {
      numero: 'PED-2026-003',
      cliente_nome_publico: 'Instituto Saber & Crescer',
      produto: 'Desafio Logístico',
      quantidade: 3,
      status_acompanhamento: 'Pedido em produção',
      status_atualizado_em: '2026-10-04T11:20:00-03:00',
      observacao_publica_status: '2 unidades finalizadas. Preparando documentação para envio.',
      status_producao: 'Montagem dos tabuleiros e separação de peças',
      producao_itens_concluidos: 12,
      nf_emitida: false,
      historico_status: [
        { status: 'Orçamento criado', data_status: '2026-09-28T14:00:00-03:00', observacao_publica: 'Orçamento criado no sistema.' },
        { status: 'Orçamento enviado', data_status: '2026-09-29T10:00:00-03:00', observacao_publica: 'Orçamento enviado ao cliente.' },
        { status: 'Pedido autorizado para produção', data_status: '2026-10-01T16:45:00-03:00', observacao_publica: 'Pedido aprovado pelo cliente. Autorizado para produção.' },
        { status: 'Pedido em produção', data_status: '2026-10-04T11:20:00-03:00', observacao_publica: 'Produção iniciada na fábrica da FormaPlay.' }
      ]
    },
    documentos: [
      {
        id: 'doc-conf-01',
        tipo_documento: 'confirmacao_pedido',
        titulo: 'Confirmação de Compra — Pedido Nº PED-2026-003',
        numero_documento: 'PED-2026-003',
        data_documento: '2026-10-01',
        nome_arquivo: 'Confirmacao_Compra_PED-2026-003_FormaPlay.pdf',
        tamanho_bytes: 4261450
      }
    ]
  },
  D: {
    dados: {
      numero: 'PED-2026-004',
      cliente_nome_publico: 'Complexo Educacional Vale',
      produto: 'Desafio Logístico',
      quantidade: 1,
      status_acompanhamento: 'Produção',
      status_atualizado_em: '2026-10-03T16:00:00-03:00',
      observacao_publica_status: null,
      status_producao: null,
      producao_itens_concluidos: 0,
      nf_emitida: false,
      historico_status: [
        { status: 'Orçamento criado', data_status: '2026-10-01T08:30:00-03:00' },
        { status: 'Aguardando confirmação', data_status: '2026-10-02T10:00:00-03:00' },
        { status: 'Produção', data_status: '2026-10-03T16:00:00-03:00' }
      ]
    },
    documentos: []
  },
  E: {
    dados: {
      numero: 'PED-2026-005',
      cliente_nome_publico: 'Colégio Santa Clara',
      produto: 'Desafio Logístico',
      quantidade: 2,
      status_acompanhamento: 'Transporte',
      status_atualizado_em: '2026-10-04T08:30:00-03:00',
      observacao_publica_status: 'Carga coletada e em transferência para a unidade de distribuição.',
      transportadora: 'Jadlog',
      codigo_rastreio: 'JAD88992211BR',
      link_rastreio: 'https://www.jadlog.com.br/tracking?cod=JAD88992211BR',
      data_envio: '2026-10-03',
      previsao_entrega: '2026-10-08',
      observacao_entrega_publica: 'Entrega em horário comercial na recepção central.',
      nf_emitida: true,
      nf_numero: '000.124.891',
      nf_emitida_em: '2026-10-03',
      historico_status: [
        { status: 'Orçamento criado', data_status: '2026-09-25T11:00:00-03:00' },
        { status: 'Orçamento enviado', data_status: '2026-09-26T14:00:00-03:00' },
        { status: 'Pedido autorizado para produção', data_status: '2026-09-29T10:30:00-03:00' },
        { status: 'Nota fiscal emitida', data_status: '2026-10-03T09:00:00-03:00', observacao_publica: 'Nota fiscal emitida pela FormaPlay.' },
        { status: 'Transporte', data_status: '2026-10-04T08:30:00-03:00', observacao_publica: 'Pedido coletado pela transportadora Jadlog.' }
      ]
    },
    documentos: [
      {
        id: 'doc-nfe-pdf-01',
        tipo_documento: 'nfe_pdf',
        titulo: 'Nota Fiscal Eletrônica (DANFE) — Nº 000.124.891',
        numero_documento: '000.124.891',
        data_documento: '2026-10-03',
        nome_arquivo: 'DANFE_000124891_FormaPlay.pdf',
        tamanho_bytes: 254120
      },
      {
        id: 'doc-nfe-xml-01',
        tipo_documento: 'nfe_xml',
        titulo: 'Arquivo XML da NF-e — Nº 000.124.891',
        numero_documento: '000.124.891',
        data_documento: '2026-10-03',
        nome_arquivo: 'NFe_000124891.xml',
        tamanho_bytes: 45200
      }
    ]
  },
  F: {
    dados: {
      numero: 'PED-2026-006',
      cliente_nome_publico: 'Escola Estrela do Amanhã',
      produto: 'Desafio Logístico',
      quantidade: 1,
      status_acompanhamento: 'Pedido em fase de entrega',
      status_atualizado_em: '2026-10-04T15:10:00-03:00',
      observacao_publica_status: 'Pedido embalado e pronto para coleta.',
      transportadora: null,
      codigo_rastreio: null,
      link_rastreio: null,
      data_envio: null,
      previsao_entrega: null,
      nf_emitida: true,
      nf_numero: '000.124.892',
      historico_status: [
        { status: 'Orçamento criado', data_status: '2026-09-29T10:00:00-03:00' },
        { status: 'Orçamento enviado', data_status: '2026-09-30T11:00:00-03:00' },
        { status: 'Pedido autorizado para produção', data_status: '2026-10-02T14:00:00-03:00' },
        { status: 'Pedido em fase de entrega', data_status: '2026-10-04T15:10:00-03:00', observacao_publica: 'Pedido embalado e pronto para envio.' }
      ]
    },
    documentos: []
  },
  G: {
    dados: {
      numero: 'PED-2026-007',
      cliente_nome_publico: 'Colégio Horizonte',
      produto: 'Desafio Logístico',
      quantidade: 4,
      status_acompanhamento: 'Pedido entregue',
      status_atualizado_em: '2026-10-05T16:45:00-03:00',
      observacao_publica_status: 'Entrega finalizada com sucesso. Recebido pela coordenação pedagógica.',
      data_entrega: '2026-10-05',
      nf_emitida: true,
      nf_numero: '000.124.870',
      transportadora: 'Jadlog',
      codigo_rastreio: 'JAD77665544BR',
      link_rastreio: 'https://www.jadlog.com.br/tracking?cod=JAD77665544BR',
      historico_status: [
        { status: 'Orçamento criado', data_status: '2026-09-20T09:00:00-03:00' },
        { status: 'Orçamento enviado', data_status: '2026-09-21T10:00:00-03:00' },
        { status: 'Pedido autorizado para produção', data_status: '2026-09-24T14:00:00-03:00' },
        { status: 'Transporte', data_status: '2026-10-01T08:00:00-03:00' },
        { status: 'Pedido entregue', data_status: '2026-10-05T16:45:00-03:00', observacao_publica: 'Pedido entregue ao destinatário.' }
      ]
    },
    documentos: [
      {
        id: 'doc-comprovante-01',
        tipo_documento: 'comprovante_envio',
        titulo: 'Comprovante de Entrega Assinado',
        nome_arquivo: 'Comprovante_Entrega_PED-2026-007.pdf',
        tamanho_bytes: 180420
      }
    ]
  },
  H: {
    dados: {
      numero: 'ORC-2026-008',
      cliente_nome_publico: 'Escola Exemplo Cancelada',
      produto: 'Desafio Logístico',
      quantidade: 1,
      status_acompanhamento: 'Cancelado',
      status_atualizado_em: '2026-10-03T09:15:00-03:00',
      observacao_publica_status: 'Orçamento cancelado a pedido da instituição por alteração orçamentária.',
      nf_emitida: false,
      historico_status: [
        { status: 'Orçamento criado', data_status: '2026-09-25T10:00:00-03:00' },
        { status: 'Orçamento enviado', data_status: '2026-09-26T11:00:00-03:00' },
        { status: 'Cancelado', data_status: '2026-10-03T09:15:00-03:00', observacao_publica: 'Cancelamento formal registrado no sistema.' }
      ]
    },
    documentos: []
  },
  H2: {
    dados: {
      numero: 'PED-2026-010',
      cliente_nome_publico: 'Escola Modelo Cancelada Pós-Produção',
      produto: 'Desafio Logístico',
      quantidade: 2,
      status_acompanhamento: 'Cancelado',
      status_atualizado_em: '2026-10-04T16:00:00-03:00',
      observacao_publica_status: 'Pedido cancelado por solicitação formal do cliente após início da produção.',
      nf_emitida: false,
      historico_status: [
        { status: 'Orçamento criado', data_status: '2026-09-10T10:00:00-03:00' },
        { status: 'Orçamento enviado', data_status: '2026-09-11T11:00:00-03:00' },
        { status: 'Pedido autorizado para produção', data_status: '2026-09-15T14:00:00-03:00' },
        { status: 'Pedido em produção', data_status: '2026-09-18T09:30:00-03:00', observacao_publica: 'Produção iniciada na fábrica da FormaPlay.' },
        { status: 'Cancelado', data_status: '2026-10-04T16:00:00-03:00', observacao_publica: 'Pedido cancelado a pedido do cliente.' }
      ]
    },
    documentos: []
  },
  K: {
    dados: {
      numero: 'PED-2026-009',
      cliente_nome_publico: 'Colégio Integrado',
      produto: 'Desafio Logístico',
      quantidade: 2,
      status_acompanhamento: 'Transporte',
      status_atualizado_em: '2026-10-03T18:00:00-03:00',
      nf_emitida: true,
      nf_numero: '000.124.900',
      nf_pdf_url: 'https://example.com/legacy_danfe.pdf',
      historico_status: [
        { status: 'Orçamento criado', data_status: '2026-09-28T09:00:00-03:00' },
        { status: 'Produção', data_status: '2026-10-01T10:00:00-03:00' },
        { status: 'Transporte', data_status: '2026-10-03T18:00:00-03:00' }
      ]
    },
    documentos: [
      {
        id: 'doc-nfe-central',
        tipo_documento: 'nfe_pdf',
        titulo: 'Nota Fiscal Eletrônica (DANFE) — Central',
        numero_documento: '000.124.900',
        nome_arquivo: 'DANFE_Central_000124900.pdf',
        tamanho_bytes: 312000
      }
    ]
  }
};

export function AcompanhamentoPublico() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const testParam = searchParams.get('testScenario')?.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosAcompanhamento | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoPublico[]>([]);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    async function carregarDados() {
      // 1. Verificação de Mock para testes e screenshots dos cenários
      if (testParam && TEST_SCENARIOS[testParam]) {
        const mock = TEST_SCENARIOS[testParam];
        setDados(mock.dados);
        setDocumentos(mock.documentos);
        setLoading(false);
        return;
      }

      if (token && token.startsWith('test-')) {
        const key = token.replace('test-', '').toUpperCase();
        if (TEST_SCENARIOS[key]) {
          const mock = TEST_SCENARIOS[key];
          setDados(mock.dados);
          setDocumentos(mock.documentos);
          setLoading(false);
          return;
        }
      }

      // 2. Consulta Real via RPC no Supabase
      if (!token) {
        setError('Token de acompanhamento não fornecido.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: rpcError } = await supabase.rpc('buscar_acompanhamento_pedido', {
          p_token: token
        });

        if (rpcError) throw rpcError;

        if (!data || data.length === 0) {
          setError('Registro não encontrado ou link expirado/inválido.');
        } else {
          const rawDados = data[0] as DadosAcompanhamento;
          setDados(rawDados);

          // Buscar documentos públicos disponíveis da Central
          try {
            const { data: docs, error: errDocs } = await supabase.rpc('buscar_documentos_publicos', { p_token: token });
            if (!errDocs && docs) {
              setDocumentos(docs as DocumentoPublico[]);
            }
          } catch (err: unknown) {
            console.error('Erro secundário ao buscar documentos:', err);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar dados do pedido:', err);
        setError('Não foi possível carregar os dados de acompanhamento no momento. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, [token, testParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center text-slate-200">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-emerald-400 rounded-full animate-spin shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
        <p className="mt-6 text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando acompanhamento...</p>
      </div>
    );
  }

  if (error || !dados) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center p-4 text-slate-200">
        <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800 max-w-md w-full text-center shadow-2xl">
          <AlertCircle size={44} className="mx-auto text-rose-400 mb-4 opacity-90" />
          <h2 className="text-xl font-black text-white mb-2">Ops!</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">{error || 'Registro não localizado.'}</p>
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              Verifique se o link ou QR Code escaneado está correto ou entre em contato com nossa equipe pelo WhatsApp.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleDownload = async (docId: string, isLegacyUrl: string | null = null) => {
    if (isLegacyUrl) {
      window.open(isLegacyUrl, '_blank');
      return;
    }

    if (downloadingDocId || !token) return;
    setDownloadingDocId(docId);

    try {
      const response = await fetch('/api/documentos-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_publico: token,
          documento_id: docId
        })
      });

      if (!response.ok) throw new Error('Falha na autorização do documento');
      const data = await response.json();
      if (!data.url) throw new Error('URL de download não retornada');

      const fileResponse = await fetch(data.url);
      if (!fileResponse.ok) throw new Error('Falha ao baixar arquivo');

      const blob = await fileResponse.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = data.nome_arquivo || 'documento_formaplay';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Erro no download:', err);
      alert('Não foi possível realizar o download do documento. Tente novamente.');
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleCopyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Normalização e Lógica de Fases
  const statusPublicoAtual: EtapaPublica = mapearStatusParaPublico(dados.status_acompanhamento);
  const isCancelado = statusPublicoAtual === "Cancelado";
  const isOrcamento = isCancelado 
    ? (dados.numero?.toUpperCase().startsWith('ORC') ?? true)
    : isFaseOrcamento(dados.status_acompanhamento);
  const infoFase = getMensagemDestaqueFase(statusPublicoAtual, dados.produto);

  const currentIndex = isCancelado ? -1 : ETAPAS_TIMELINE_PUBLICA.indexOf(statusPublicoAtual as any);

  // Evita duplicação de Nota Fiscal legada se a Central já possuir nfe_pdf
  const temNfeNaCentral = documentos.some(d => d.tipo_documento === 'nfe_pdf');
  const exibirNfeLegada = Boolean(dados.nf_pdf_url && !temNfeNaCentral);
  const totalDocumentos = documentos.length + (exibirNfeLegada ? 1 : 0);

  // Verificação de rastreio ativo
  const temRastreio = Boolean(dados.codigo_rastreio || dados.link_rastreio || dados.transportadora);

  // Proteção e cálculo seguro do percentual de progresso da produção
  const rawItens = dados.producao_itens_concluidos;
  const itensConcluidos = 
    typeof rawItens === 'number'
      ? rawItens
      : (rawItens !== null && rawItens !== undefined && String(rawItens).trim() !== ''
          ? Number(rawItens)
          : NaN);

  const percentualProducao =
    Number.isFinite(itensConcluidos) && itensConcluidos >= 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((itensConcluidos / TOTAL_ETAPAS_PRODUCAO) * 100)
          )
        )
      : null;

  const temDadosProducao = Boolean(
    dados.status_producao || 
    (percentualProducao !== null && percentualProducao > 0)
  );

  // Formatação de data/hora amigável
  const formatarDataHora = (isoDate?: string | null) => {
    if (!isoDate) return null;
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatarDataSimples = (isoDate?: string | null) => {
    if (!isoDate) return null;
    const dateStr = isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00Z`;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Obtém a data da primeira ocorrência real no histórico para cada uma das 5 etapas públicas
  const getDataPrimeiraOcorrencia = (etapaAlvo: string): string | null => {
    if (!dados.historico_status || dados.historico_status.length === 0) {
      if (etapaAlvo === "Orçamento criado" || etapaAlvo === statusPublicoAtual) {
        return formatarDataSimples(dados.status_atualizado_em);
      }
      return null;
    }

    const primeira = dados.historico_status.find(h => mapearStatusParaPublico(h.status) === etapaAlvo);
    if (primeira?.data_status) {
      return formatarDataSimples(primeira.data_status);
    }

    if (etapaAlvo === statusPublicoAtual && !isCancelado) {
      return formatarDataSimples(dados.status_atualizado_em);
    }

    return null;
  };

  // Derivação da data inicial do orçamento/pedido a partir do histórico
  const dataInicial = dados.historico_status?.[0]?.data_status 
    ? formatarDataSimples(dados.historico_status[0].data_status)
    : formatarDataSimples(dados.status_atualizado_em);

  const getTipoAmigavel = (tipo: string) => {
    const mapa: Record<string, string> = {
      orcamento: 'Orçamento Comercial',
      confirmacao_pedido: 'Confirmação de Pedido',
      nfe_pdf: 'Nota Fiscal (DANFE)',
      nfe_xml: 'XML da NF-e',
      boleto: 'Boleto Bancário',
      comprovante_envio: 'Comprovante de Envio',
      outro: 'Documento'
    };
    return mapa[tipo] || 'Documento';
  };

  const getIconForDoc = (tipo: string) => {
    if (tipo === 'confirmacao_pedido') return <BadgeCheck size={20} className="text-emerald-400" />;
    if (tipo.includes('nfe')) return <Receipt size={20} className="text-blue-400" />;
    if (tipo === 'boleto') return <FileDown size={20} className="text-amber-400" />;
    if (tipo === 'comprovante_envio') return <Truck size={20} className="text-emerald-400" />;
    return <FileText size={20} className="text-slate-400" />;
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,58,138,0.18),rgba(255,255,255,0))] text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* 1. CABEÇALHO DINÂMICO */}
      <header className="border-b border-slate-800/80 bg-[#0c1329]/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border border-blue-500/40 bg-white p-0.5 shadow-md flex-shrink-0">
              <img src="/logocircular.png" alt="FormaPlay" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-black text-white text-base sm:text-lg tracking-tight leading-tight">
                <FormaPlayBrand />
              </h1>
              <p className="text-[10px] sm:text-xs text-blue-300/80 font-medium">
                Educação que transforma
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block">
              {isOrcamento ? 'Orçamento' : 'Pedido'}
            </span>
            <span className="font-black text-white text-sm sm:text-base tracking-wide">
              {dados.numero}
            </span>
          </div>
        </div>
      </header>

      {/* Banner de Destaque da Fase */}
      <div className="bg-gradient-to-r from-blue-950/70 via-blue-900/40 to-blue-950/70 border-b border-blue-800/30 px-4 py-3 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs sm:text-sm font-semibold text-blue-100 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {infoFase.destaque}
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ALERTA DE CANCELAMENTO (Se aplicável) */}
        {isCancelado && (
          <div className="bg-rose-950/30 border border-rose-800/60 rounded-2xl p-5 shadow-lg flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 flex-shrink-0">
              <XCircle size={28} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-rose-300">
                Orçamento / Pedido Cancelado
              </h2>
              <p className="text-xs sm:text-sm text-rose-200/80 font-medium mt-1 leading-relaxed">
                Este registro foi cancelado e não receberá novas atualizações de produção ou entrega. O histórico e eventuais documentos anteriores continuam disponíveis abaixo.
              </p>
            </div>
          </div>
        )}

        {/* 2. CARD HERO DE STATUS ATUAL */}
        <div className="bg-slate-900/60 rounded-3xl border border-slate-800/90 p-5 sm:p-7 shadow-xl relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Status Atual
              </span>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm sm:text-base font-black uppercase tracking-wider border shadow-sm ${
                  isCancelado
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/40'
                    : statusPublicoAtual === 'Entregue'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                      : statusPublicoAtual === 'Aguardando confirmação'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                        : 'bg-blue-500/10 text-blue-300 border-blue-500/40'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    isCancelado ? 'bg-rose-400' : statusPublicoAtual === 'Entregue' ? 'bg-emerald-400' : 'bg-blue-400 animate-pulse'
                  }`} />
                  {statusPublicoAtual}
                </span>
              </div>
            </div>

            {dados.status_atualizado_em && (
              <div className="text-left sm:text-right">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                  Última Atualização
                </span>
                <p className="text-xs sm:text-sm font-semibold text-slate-300 flex items-center sm:justify-end gap-1.5">
                  <Clock size={14} className="text-slate-400" />
                  {formatarDataHora(dados.status_atualizado_em)}
                </p>
              </div>
            )}
          </div>

          {/* Frase contextual de destaque */}
          <div className="pt-4">
            <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
              {infoFase.statusDescricao}
            </p>

            {/* Observação Pública Adicional (se houver) */}
            {dados.observacao_publica_status && (
              <div className="mt-3.5 bg-blue-950/40 border border-blue-800/40 rounded-xl p-3.5 sm:p-4 flex items-start gap-3">
                <MessageCircle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block mb-0.5">
                    Atualização Adicional
                  </span>
                  <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
                    {dados.observacao_publica_status}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. TIMELINE VISUAL DE 5 ETAPAS (Desktop: Horizontal | Mobile: Vertical) */}
        <div className="bg-slate-900/60 rounded-3xl border border-slate-800/90 p-5 sm:p-7 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Layers size={18} className="text-blue-400" />
              Etapas do {isOrcamento ? 'Orçamento' : 'Pedido'}
            </h2>
            <span className="text-xs text-slate-400 font-semibold">
              {isCancelado ? 'Interrompido' : `${Math.max(currentIndex + 1, 1)} de 5 etapas`}
            </span>
          </div>

          {/* DESKTOP TIMELINE: Horizontal com linha contínua */}
          <div className="hidden md:block relative pt-4 pb-2">
            <div className="relative flex items-start justify-between">
              
              {/* Linha conectora horizontal de fundo */}
              <div className="absolute top-6 left-8 right-8 h-1 bg-slate-800 rounded-full z-0" />
              
              {/* Linha conectora preenchida até o progresso atual */}
              {!isCancelado && currentIndex > 0 && (
                <div 
                  className="absolute top-6 left-8 h-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full z-0 transition-all duration-700 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  style={{ width: `${(currentIndex / 4) * 88}%` }}
                />
              )}

              {ETAPAS_TIMELINE_PUBLICA.map((etapaNome, idx) => {
                const isConcluida = !isCancelado && idx < currentIndex;
                const isAtiva = !isCancelado && idx === currentIndex;
                const isFutura = isCancelado || idx > currentIndex;
                const dataEtapa = getDataPrimeiraOcorrencia(etapaNome);

                return (
                  <div key={etapaNome} className="relative z-10 flex flex-col items-center text-center flex-1 px-1">
                    {/* Círculo do Ícone */}
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-md ${
                      isConcluida
                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : isAtiva
                          ? etapaNome === 'Entregue'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-300 scale-110 shadow-[0_0_20px_rgba(16,185,129,0.5)] ring-4 ring-emerald-500/20'
                            : 'bg-blue-600 text-white border-blue-300 scale-110 shadow-[0_0_20px_rgba(59,130,246,0.4)] ring-4 ring-blue-500/20'
                          : 'bg-slate-900 border-slate-700/80 text-slate-500'
                    }`}>
                      {isConcluida ? (
                        <CheckCircle2 size={22} strokeWidth={2.5} />
                      ) : isAtiva ? (
                        etapaNome === 'Entregue' ? <PackageCheck size={22} /> :
                        etapaNome === 'Transporte' ? <Truck size={22} /> :
                        etapaNome === 'Produção' ? <Package size={22} /> :
                        etapaNome === 'Aguardando confirmação' ? <Clock size={22} /> :
                        <FileDown size={22} />
                      ) : (
                        <span className="text-xs font-bold text-slate-500">{idx + 1}</span>
                      )}
                    </div>

                    {/* Rótulo da Etapa */}
                    <p className={`text-xs font-bold mt-2.5 leading-tight ${
                      isAtiva 
                        ? 'text-white' 
                        : isConcluida 
                          ? 'text-slate-200' 
                          : 'text-slate-500'
                    }`}>
                      {etapaNome}
                    </p>

                    {/* Percentual discreto de produção na timeline */}
                    {etapaNome === 'Produção' && percentualProducao !== null && percentualProducao > 0 && (
                      <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">
                        {percentualProducao}% concluído
                      </span>
                    )}

                    {/* Data Real da Etapa */}
                    {dataEtapa ? (
                      <span className="text-[11px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar size={11} className="text-slate-500" />
                        {dataEtapa}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600 mt-1 font-medium">
                        {isFutura ? 'Aguardando' : ''}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* MOBILE TIMELINE: Vertical com linha contínua à esquerda */}
          <div className="md:hidden relative space-y-4 pl-1">
            {ETAPAS_TIMELINE_PUBLICA.map((etapaNome, idx) => {
              const isConcluida = !isCancelado && idx < currentIndex;
              const isAtiva = !isCancelado && idx === currentIndex;
              const isLast = idx === ETAPAS_TIMELINE_PUBLICA.length - 1;
              const dataEtapa = getDataPrimeiraOcorrencia(etapaNome);

              return (
                <div key={etapaNome} className="relative flex items-start gap-3.5">
                  
                  {/* Linha conectora vertical */}
                  {!isLast && (
                    <div className={`absolute left-[19px] top-9 bottom-[-16px] w-0.5 rounded-full z-0 ${
                      isConcluida ? 'bg-emerald-500/60' : 'bg-slate-800'
                    }`} />
                  )}

                  {/* Círculo do Ícone */}
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${
                    isConcluida
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-400 shadow-sm'
                      : isAtiva
                        ? etapaNome === 'Entregue'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300 ring-4 ring-emerald-500/20'
                          : 'bg-blue-600 text-white border-blue-300 ring-4 ring-blue-500/20'
                        : 'bg-slate-900 border-slate-800 text-slate-600'
                  }`}>
                    {isConcluida ? (
                      <CheckCircle2 size={18} strokeWidth={2.5} />
                    ) : isAtiva ? (
                      etapaNome === 'Entregue' ? <PackageCheck size={18} /> :
                      etapaNome === 'Transporte' ? <Truck size={18} /> :
                      etapaNome === 'Produção' ? <Package size={18} /> :
                      etapaNome === 'Aguardando confirmação' ? <Clock size={18} /> :
                      <FileDown size={18} />
                    ) : (
                      <span className="text-xs font-bold text-slate-500">{idx + 1}</span>
                    )}
                  </div>

                  {/* Conteúdo da Etapa */}
                  <div className="flex-1 pt-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs sm:text-sm font-bold ${
                        isAtiva ? 'text-white' : isConcluida ? 'text-slate-200' : 'text-slate-500'
                      }`}>
                        {etapaNome}
                      </p>
                      {dataEtapa && (
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <Calendar size={11} className="text-slate-500" />
                          {dataEtapa}
                        </span>
                      )}
                    </div>
                    {etapaNome === 'Produção' && percentualProducao !== null && percentualProducao > 0 && (
                      <p className="text-[11px] font-semibold text-emerald-400 mt-0.5">
                        {percentualProducao}% concluído
                      </p>
                    )}
                    {isAtiva && (etapaNome !== 'Produção' || percentualProducao === null || percentualProducao === 0) && (
                      <p className="text-[11px] text-blue-300 font-medium mt-0.5">
                        Etapa em andamento
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. PROGRESSO DA PRODUÇÃO (Secundário, exibido quando em Produção e houver dados reais) */}
        {statusPublicoAtual === "Produção" && temDadosProducao && (
          <div className="bg-slate-900/60 rounded-3xl border border-blue-900/40 p-5 sm:p-6 shadow-xl">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package size={16} />
              Progresso da Produção
            </h3>

            {dados.status_producao && (
              <div className="mb-4">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                  Etapa de Fabricação
                </span>
                <p className="text-sm font-bold text-white bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
                  {dados.status_producao}
                </p>
              </div>
            )}

            {percentualProducao !== null && percentualProducao > 0 && (
              <div>
                <div className="flex flex-wrap justify-between items-center gap-1.5 text-xs font-semibold mb-1.5">
                  <span className="text-slate-300">Itens concluídos na linha de produção</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400">
                      {percentualProducao}% concluído
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      ({itensConcluidos} de {TOTAL_ETAPAS_PRODUCAO} etapas concluídas)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2 rounded-full transition-all duration-700" 
                    style={{ width: `${percentualProducao}%` }} 
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. TRANSPORTE E RASTREAMENTO (Renderizado SOMENTE quando houver dados reais) */}
        {temRastreio && (
          <div className="bg-slate-900/60 rounded-3xl border border-indigo-900/40 p-5 sm:p-7 shadow-xl">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mb-5">
              <Truck className="text-indigo-400" size={20} />
              Transporte e Rastreamento
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {dados.transportadora && (
                <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/40">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Transportadora
                  </span>
                  <p className="font-bold text-white text-sm">{dados.transportadora}</p>
                </div>
              )}

              {dados.codigo_rastreio && (
                <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/40">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Código de Rastreio
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono font-bold text-white text-sm tracking-wider">
                      {dados.codigo_rastreio}
                    </p>
                    <button
                      onClick={() => handleCopyTracking(dados.codigo_rastreio!)}
                      className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copiar código de rastreio"
                      aria-label="Copiar código de rastreio"
                    >
                      {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {dados.previsao_entrega && (
                <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/40">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Previsão de Entrega
                  </span>
                  <p className="font-bold text-amber-300 text-sm">
                    {formatarDataSimples(dados.previsao_entrega)}
                  </p>
                </div>
              )}

              {dados.data_envio && (
                <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/40">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Data de Envio
                  </span>
                  <p className="font-bold text-slate-300 text-sm">
                    {formatarDataSimples(dados.data_envio)}
                  </p>
                </div>
              )}

              {dados.data_entrega && (
                <div className="bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-800/40">
                  <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                    Data da Entrega
                  </span>
                  <p className="font-bold text-emerald-300 text-sm">
                    {formatarDataSimples(dados.data_entrega)}
                  </p>
                </div>
              )}
            </div>

            {/* Observação de entrega (se houver) */}
            {dados.observacao_entrega_publica && (
              <div className="mt-4 bg-indigo-950/30 border border-indigo-900/40 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block mb-0.5">
                  Observação de Entrega
                </span>
                <p className="text-xs sm:text-sm text-indigo-100 font-medium">
                  {dados.observacao_entrega_publica}
                </p>
              </div>
            )}

            {/* Botão de Rastreio Externo */}
            {dados.link_rastreio && (dados.link_rastreio.startsWith('http://') || dados.link_rastreio.startsWith('https://')) && (
              <div className="mt-5 pt-4 border-t border-slate-800 flex justify-end">
                <a
                  href={dados.link_rastreio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg transition-all active:scale-95"
                >
                  ACOMPANHAR ENTREGA <ExternalLink size={16} />
                </a>
              </div>
            )}
          </div>
        )}

        {/* 6. DOCUMENTOS DISPONÍVEIS (Renderizado SOMENTE se houver documentos) */}
        {totalDocumentos > 0 && (
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800/90 p-5 sm:p-7 shadow-xl">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mb-5">
              <FileDown className="text-blue-400" size={20} />
              Documentos Disponíveis
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {documentos.map(doc => (
                <div 
                  key={doc.id} 
                  className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-500/40 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getIconForDoc(doc.tipo_documento)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-xs sm:text-sm truncate" title={doc.titulo}>
                        {doc.titulo}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[11px] text-slate-400">
                        <span className="text-blue-400 font-semibold">{getTipoAmigavel(doc.tipo_documento)}</span>
                        {doc.numero_documento && <span>• Nº {doc.numero_documento}</span>}
                        {doc.data_documento && <span>• {formatarDataSimples(doc.data_documento)}</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(doc.id)}
                    disabled={downloadingDocId === doc.id}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 font-bold text-xs transition-all whitespace-nowrap active:scale-95 disabled:opacity-50"
                  >
                    {downloadingDocId === doc.id ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Baixando...
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        Baixar
                      </>
                    )}
                  </button>
                </div>
              ))}

              {/* NF Legada (caso exista e não esteja duplicada) */}
              {exibirNfeLegada && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Receipt size={20} className="text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-xs sm:text-sm truncate">
                        Nota Fiscal Eletrônica (DANFE)
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[11px] text-slate-400">
                        <span className="text-blue-400 font-semibold">NF-e — PDF</span>
                        {dados.nf_numero && <span>• Nº {dados.nf_numero}</span>}
                        {dados.nf_emitida_em && <span>• {formatarDataSimples(dados.nf_emitida_em)}</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload('legacy', dados.nf_pdf_url)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 font-bold text-xs transition-all whitespace-nowrap"
                  >
                    <Download size={14} />
                    Baixar DANFE
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. HISTÓRICO DE ATUALIZAÇÕES */}
        {dados.historico_status && dados.historico_status.length > 0 && (
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800/90 p-5 sm:p-7 shadow-xl">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mb-5">
              <Clock className="text-slate-400" size={18} />
              Atualizações
            </h2>

            <div className="space-y-4">
              {[...dados.historico_status].reverse().map((item, idx) => {
                const dataFormatada = formatarDataHora(item.data_status) || formatarDataSimples(item.data_status);
                const mensagemFactual = item.observacao_publica?.trim() || getTextoAmigavelHistorico(item.status);

                return (
                  <div key={idx} className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/30 flex items-start gap-3.5">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {item.status}
                        </span>
                        {dataFormatada && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            {dataFormatada}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                        {mensagemFactual}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 8. DADOS DA SOLICITAÇÃO / PEDIDO */}
        <div className="bg-slate-900/60 rounded-3xl border border-slate-800/90 p-5 sm:p-7 shadow-xl">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mb-5">
            <Package size={18} className="text-blue-400" />
            Dados {isOrcamento ? 'da Proposta' : 'do Pedido'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/30 p-3.5 rounded-xl border border-slate-700/30">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                {isOrcamento ? 'Nº Orçamento' : 'Nº Pedido'}
              </span>
              <p className="font-bold text-white text-sm">{dados.numero}</p>
            </div>

            <div className="bg-slate-800/30 p-3.5 rounded-xl border border-slate-700/30">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Cliente
              </span>
              <p className="font-bold text-white text-sm truncate" title={dados.cliente_nome_publico}>
                {dados.cliente_nome_publico}
              </p>
            </div>

            <div className="bg-slate-800/30 p-3.5 rounded-xl border border-slate-700/30">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Produto & Quantidade
              </span>
              <p className="font-bold text-white text-sm truncate" title={dados.produto}>
                {dados.quantidade}x {dados.produto || 'Desafio Logístico'}
              </p>
            </div>

            <div className="bg-slate-800/30 p-3.5 rounded-xl border border-slate-700/30">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Data do Registro
              </span>
              <p className="font-bold text-slate-300 text-sm">
                {dataInicial || 'Conforme proposta'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Info size={14} className="text-blue-400 flex-shrink-0" />
            <span>
              Valores financeiros discriminados, descontos e frete estão detalhados no documento oficial em PDF disponível na seção de documentos.
            </span>
          </div>
        </div>

        {/* RODAPÉ INSTITUCIONAL */}
        <footer className="text-center pt-6 pb-8 border-t border-slate-800/60 mt-10">
          <p className="text-xs text-slate-400 font-medium">
            Em caso de dúvidas sobre o seu pedido ou orçamento, entre em contato conosco pelo WhatsApp da FormaPlay.
          </p>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            FormaPlay Jogos Educacionais • Educação que transforma
          </p>
        </footer>

      </main>
    </div>
  );
}
