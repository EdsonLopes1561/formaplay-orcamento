import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, FileCode2, Receipt, Truck, File, Plus, Download, Trash2,
  RefreshCw, Eye, EyeOff, Pencil, X, AlertTriangle, CheckCircle2,
  Loader2, Upload, ShieldCheck, Lock, BadgeCheck
} from 'lucide-react';
import { supabase } from '../supabase';
import { PerfilUsuario } from '../interfaces/interesses';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TipoDocumento =
  | 'orcamento'
  | 'confirmacao_pedido'
  | 'nfe_pdf'
  | 'nfe_xml'
  | 'boleto'
  | 'comprovante_envio'
  | 'outro';

export interface DocumentoPedido {
  id: string;
  orcamento_id: string;
  tipo_documento: TipoDocumento;
  titulo: string;
  nome_arquivo: string;
  storage_path: string;
  mime_type: string;
  tamanho_bytes: number;
  numero_documento: string | null;
  data_documento: string | null;
  visivel_cliente: boolean;
  created_at: string;
  updated_at: string;
}

interface GerenciadorDocumentosProps {
  orcamentoId: string;
  perfilUsuario: PerfilUsuario;
}

export interface ItemUpload {
  id: string;
  arquivo: File | null;
  tipo_documento: TipoDocumento;
  titulo: string;
  numero_documento: string;
  data_documento: string;
  visivel_cliente: boolean;
  status?: 'pendente' | 'enviando' | 'sucesso' | 'erro';
  erro?: string | null;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const BUCKET = 'documentos-pedidos';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const TIPOS_AMIGAVEIS: Record<TipoDocumento, string> = {
  orcamento: 'Orçamento',
  confirmacao_pedido: 'Confirmação do pedido',
  nfe_pdf: 'NF-e — PDF',
  nfe_xml: 'NF-e — XML',
  boleto: 'Boleto',
  comprovante_envio: 'Comprovante de envio',
  outro: 'Outro documento',
};

const MIME_PERMITIDOS: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/xml': '.xml',
  'text/xml': '.xml',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'application/x-zip': '.zip',
  'image/jpeg': '.jpg/.jpeg',
  'image/png': '.png',
};

const EXTENSOES_PERMITIDAS = ['pdf', 'xml', 'zip', 'jpg', 'jpeg', 'png'];

// Normaliza mime types de navegadores para garantir padrão restritivo e seguro no Storage
function normalizarMime(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'zip') return 'application/zip';
  if (ext === 'xml') return 'application/xml';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return file.type || 'application/octet-stream';
}

function validarArquivo(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!EXTENSOES_PERMITIDAS.includes(ext)) {
    return 'Tipo de arquivo não permitido. Aceitamos PDF, XML, ZIP, JPEG e PNG.';
  }
  const mimeNorm = normalizarMime(file);
  if (!MIME_PERMITIDOS[mimeNorm]) {
    return 'Tipo de arquivo não permitido. Aceitamos PDF, XML, ZIP, JPEG e PNG.';
  }
  if (file.size > MAX_BYTES) {
    return `O arquivo excede o limite de 10 MB (${formatarTamanho(file.size)}).`;
  }
  return null;
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR');
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function IcTipo({ tipo }: { tipo: TipoDocumento }) {
  const cls = 'shrink-0';
  switch (tipo) {
    case 'confirmacao_pedido': return <BadgeCheck size={18} className={`${cls} text-emerald-400`} />;
    case 'nfe_pdf': return <FileText size={18} className={`${cls} text-emerald-400`} />;
    case 'nfe_xml': return <FileCode2 size={18} className={`${cls} text-cyan-400`} />;
    case 'boleto': return <Receipt size={18} className={`${cls} text-yellow-400`} />;
    case 'comprovante_envio': return <Truck size={18} className={`${cls} text-indigo-400`} />;
    case 'orcamento': return <FileText size={18} className={`${cls} text-blue-400`} />;
    default: return <File size={18} className={`${cls} text-slate-400`} />;
  }
}

// Sugere tipo e título inicial com base no nome do arquivo (sugestão editável pelo usuário)
function inferirTipoETitulo(file: File, isProducao: boolean): { tipo: TipoDocumento; titulo: string } {
  if (isProducao) {
    return { tipo: 'comprovante_envio', titulo: 'Comprovante de envio' };
  }

  const nomeSemExt = file.name.replace(/\.[^/.]+$/, '');
  const nomeLower = file.name.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (nomeLower.includes('orcamento') || nomeLower.includes('orçamento')) {
    return { tipo: 'orcamento', titulo: nomeSemExt.replace(/_/g, ' ') };
  }
  if (nomeLower.includes('pedido') || nomeLower.includes('confirmacao') || nomeLower.includes('confirmação')) {
    return { tipo: 'confirmacao_pedido', titulo: nomeSemExt.replace(/_/g, ' ') };
  }
  if ((nomeLower.includes('nfe') || nomeLower.includes('nf-e') || nomeLower.includes('danfe')) && ext === 'pdf') {
    return { tipo: 'nfe_pdf', titulo: nomeSemExt.replace(/_/g, ' ') };
  }
  if ((nomeLower.includes('nfe') || nomeLower.includes('xml')) && (ext === 'xml' || ext === 'zip')) {
    return { tipo: 'nfe_xml', titulo: nomeSemExt.replace(/_/g, ' ') };
  }
  if (nomeLower.includes('boleto')) {
    return { tipo: 'boleto', titulo: nomeSemExt.replace(/_/g, ' ') };
  }
  if (nomeLower.includes('comprovante') || nomeLower.includes('envio') || nomeLower.includes('rastreio')) {
    return { tipo: 'comprovante_envio', titulo: nomeSemExt.replace(/_/g, ' ') };
  }

  if (ext === 'pdf') {
    return { tipo: 'orcamento', titulo: nomeSemExt.replace(/_/g, ' ') };
  }
  if (ext === 'xml' || ext === 'zip') {
    return { tipo: 'nfe_xml', titulo: nomeSemExt.replace(/_/g, ' ') };
  }
  return { tipo: 'outro', titulo: nomeSemExt.replace(/_/g, ' ') };
}

function criarItemUpload(file?: File, isProducao = false): ItemUpload {
  const id = crypto.randomUUID();
  if (file) {
    const { tipo, titulo } = inferirTipoETitulo(file, isProducao);
    return {
      id,
      arquivo: file,
      tipo_documento: tipo,
      titulo,
      numero_documento: '',
      data_documento: '',
      visivel_cliente: false,
      status: 'pendente',
      erro: null,
    };
  }
  return {
    id,
    arquivo: null,
    tipo_documento: isProducao ? 'comprovante_envio' : 'orcamento',
    titulo: '',
    numero_documento: '',
    data_documento: '',
    visivel_cliente: false,
    status: 'pendente',
    erro: null,
  };
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function GerenciadorDocumentos({ orcamentoId, perfilUsuario }: GerenciadorDocumentosProps) {
  const isProducao = perfilUsuario === 'producao';
  const podeEditar = perfilUsuario === 'administrador' || perfilUsuario === 'comercial';

  const [documentos, setDocumentos] = useState<DocumentoPedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Modal de adição (Multiupload)
  const [showModal, setShowModal] = useState(false);
  const [itensUpload, setItensUpload] = useState<ItemUpload[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal de edição de metadados
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formEdicao, setFormEdicao] = useState<{
    tipo_documento?: TipoDocumento;
    titulo?: string;
    numero_documento?: string;
    data_documento?: string;
    visivel_cliente?: boolean;
  }>({});
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Modal de substituição
  const [substituindoDoc, setSubstituindoDoc] = useState<DocumentoPedido | null>(null);
  const [arquivoSubst, setArquivoSubst] = useState<File | null>(null);
  const [salvandoSubst, setSalvandoSubst] = useState(false);
  const fileSubstRef = useRef<HTMLInputElement>(null);

  // Download / exclusão
  const [baixandoId, setBaixandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [avisoOrfao, setAvisoOrfao] = useState<string | null>(null);

  // ── Carregar lista ────────────────────────────────────────────────────────

  const carregarDocumentos = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { data, error } = await supabase
        .from('documentos_pedido')
        .select('*')
        .eq('orcamento_id', orcamentoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocumentos(data ?? []);
    } catch {
      setErro('Não foi possível carregar os documentos. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  }, [orcamentoId]);

  useEffect(() => {
    if (orcamentoId) carregarDocumentos();
  }, [orcamentoId, carregarDocumentos]);

  // ── Adicionar arquivos ao lote ────────────────────────────────────────────

  function adicionarArquivos(files: FileList | File[]) {
    const novosItens: ItemUpload[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      novosItens.push(criarItemUpload(f, isProducao));
    }
    setItensUpload(prev => {
      // Se houver apenas 1 item vazio inicial na lista, substitui
      if (prev.length === 1 && !prev[0].arquivo && !prev[0].titulo.trim()) {
        return novosItens;
      }
      return [...prev, ...novosItens];
    });
    setErroGeral(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      adicionarArquivos(e.target.files);
      e.target.value = '';
    }
  }

  function removerItem(id: string) {
    setItensUpload(prev => prev.filter(item => item.id !== id));
  }

  function atualizarItem(id: string, updates: Partial<ItemUpload>) {
    setItensUpload(prev => prev.map(item => item.id === id ? { ...item, ...updates, erro: null } : item));
  }

  // ── Multiupload: Salvar todos os documentos da lista ─────────────────────

  async function handleSalvarDocumentos(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return;
    setErroGeral(null);

    if (itensUpload.length === 0) {
      setErroGeral('Adicione pelo menos um documento para salvar.');
      return;
    }

    // 1. Validação prévia de todos os itens da lista
    let temErroValidacao = false;
    const itensValidados = itensUpload.map(item => {
      if (!item.arquivo) {
        temErroValidacao = true;
        return { ...item, erro: 'Selecione um arquivo para este documento.' };
      }
      const erroArq = validarArquivo(item.arquivo);
      if (erroArq) {
        temErroValidacao = true;
        return { ...item, erro: erroArq };
      }
      if (!item.titulo.trim()) {
        temErroValidacao = true;
        return { ...item, erro: 'Informe o título do documento.' };
      }
      return { ...item, erro: null };
    });

    if (temErroValidacao) {
      setItensUpload(itensValidados);
      setErroGeral('Existem itens com pendências ou arquivos inválidos. Verifique os campos assinalados.');
      return;
    }

    // 2. Processamento individual de cada item
    setSalvando(true);
    const itensProcessados = [...itensValidados];
    let sucessos = 0;
    let falhas = 0;

    for (let i = 0; i < itensProcessados.length; i++) {
      const item = itensProcessados[i];
      if (item.status === 'sucesso' || !item.arquivo) continue;

      item.status = 'enviando';
      item.erro = null;
      setItensUpload([...itensProcessados]);

      const mimeNorm = normalizarMime(item.arquivo);
      const ext = item.arquivo.name.split('.').pop()?.toLowerCase() ?? 'bin';
      const documentoId = crypto.randomUUID();
      const nomeArquivoStorage = `${crypto.randomUUID()}.${ext}`;
      const storagePath = `${orcamentoId}/${documentoId}/${nomeArquivoStorage}`;

      try {
        // Upload para o Storage
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, item.arquivo, { contentType: mimeNorm, upsert: false });

        if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

        // Insert no Banco
        const { error: dbError } = await supabase
          .from('documentos_pedido')
          .insert({
            id: documentoId,
            orcamento_id: orcamentoId,
            tipo_documento: item.tipo_documento,
            titulo: item.titulo.trim(),
            nome_arquivo: item.arquivo.name,
            storage_path: storagePath,
            mime_type: mimeNorm,
            tamanho_bytes: item.arquivo.size,
            numero_documento: item.numero_documento.trim() || null,
            data_documento: item.data_documento || null,
            visivel_cliente: isProducao ? false : item.visivel_cliente,
          });

        if (dbError) {
          // Rollback do Storage
          await supabase.storage.from(BUCKET).remove([storagePath]);
          throw new Error(`Falha ao registrar documento: ${dbError.message}`);
        }

        item.status = 'sucesso';
        sucessos++;
      } catch (err: unknown) {
        falhas++;
        item.status = 'erro';
        item.erro = err instanceof Error ? err.message : 'Erro ao salvar documento.';
      }

      setItensUpload([...itensProcessados]);
    }

    setSalvando(false);
    await carregarDocumentos();

    if (falhas === 0) {
      setShowModal(false);
      setItensUpload([]);
      setErroGeral(null);
    } else {
      // Mantém no modal apenas os itens que falharam (remove os que já foram salvos com sucesso para evitar duplicação)
      setItensUpload(prev => prev.filter(it => it.status !== 'sucesso'));
      setErroGeral(`${sucessos} documento(s) salvo(s) com sucesso. ${falhas} documento(s) apresentaram erro. Corrija e tente novamente.`);
    }
  }

  // ── Download interno (usuário autenticado) ─────────────────────────────────

  async function handleDownload(doc: DocumentoPedido) {
    if (baixandoId) return;
    setBaixandoId(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, 60, { download: doc.nome_arquivo });

      if (error || !data?.signedUrl) throw new Error('Não foi possível gerar o link.');

      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = doc.nome_arquivo;
      a.click();
    } catch (err: unknown) {
      alert(`Erro ao baixar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setBaixandoId(null);
    }
  }

  // ── Exclusão ───────────────────────────────────────────────────────────────

  async function handleExcluir(doc: DocumentoPedido) {
    if (excluindoId) return;
    if (!window.confirm(`Excluir "${doc.titulo}"?\n\nEsta ação não pode ser desfeita.`)) return;

    setExcluindoId(doc.id);
    try {
      const { error: storageErr } = await supabase.storage
        .from(BUCKET)
        .remove([doc.storage_path]);

      if (storageErr) throw new Error(`Falha ao remover arquivo: ${storageErr.message}`);

      const { error: dbErr } = await supabase
        .from('documentos_pedido')
        .delete()
        .eq('id', doc.id);

      if (dbErr) throw new Error(`Arquivo removido do storage, mas falha ao excluir registro: ${dbErr.message}`);

      await carregarDocumentos();
    } catch (err: unknown) {
      alert(`Erro ao excluir: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setExcluindoId(null);
    }
  }

  // ── Edição de metadados ────────────────────────────────────────────────────

  function iniciarEdicao(doc: DocumentoPedido) {
    setEditandoId(doc.id);
    setFormEdicao({
      tipo_documento: doc.tipo_documento,
      titulo: doc.titulo,
      numero_documento: doc.numero_documento ?? '',
      data_documento: doc.data_documento ?? '',
      visivel_cliente: doc.visivel_cliente,
    });
  }

  async function salvarEdicao(doc: DocumentoPedido) {
    if (salvandoEdicao) return;
    setSalvandoEdicao(true);
    try {
      const { error } = await supabase
        .from('documentos_pedido')
        .update({
          tipo_documento: formEdicao.tipo_documento,
          titulo: formEdicao.titulo?.trim(),
          numero_documento: formEdicao.numero_documento?.trim() || null,
          data_documento: formEdicao.data_documento || null,
          visivel_cliente: formEdicao.visivel_cliente,
        })
        .eq('id', doc.id);

      if (error) throw error;
      setEditandoId(null);
      await carregarDocumentos();
    } catch (err: unknown) {
      alert(`Erro ao salvar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setSalvandoEdicao(false);
    }
  }

  // ── Substituição de arquivo único ──────────────────────────────────────────

  async function handleSubstituir(doc: DocumentoPedido) {
    if (!arquivoSubst || salvandoSubst) return;

    const erroArquivo = validarArquivo(arquivoSubst);
    if (erroArquivo) { alert(erroArquivo); return; }

    const mimeNorm = normalizarMime(arquivoSubst);
    const ext = arquivoSubst.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const pathAntigo = doc.storage_path;

    setSalvandoSubst(true);
    try {
      const novoNomeStorage = `${crypto.randomUUID()}.${ext}`;
      const novoPath = `${orcamentoId}/${doc.id}/${novoNomeStorage}`;

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(novoPath, arquivoSubst, { contentType: mimeNorm, upsert: false });

      if (uploadErr) throw new Error(`Falha ao enviar novo arquivo: ${uploadErr.message}`);

      const { error: dbErr } = await supabase
        .from('documentos_pedido')
        .update({
          storage_path: novoPath,
          nome_arquivo: arquivoSubst.name,
          mime_type: mimeNorm,
          tamanho_bytes: arquivoSubst.size,
        })
        .eq('id', doc.id);

      if (dbErr) {
        await supabase.storage.from(BUCKET).remove([novoPath]);
        throw new Error(`Falha ao atualizar registro: ${dbErr.message}`);
      }

      const { error: removeErr } = await supabase.storage.from(BUCKET).remove([pathAntigo]);
      if (removeErr) {
        setAvisoOrfao(`Aviso: o arquivo anterior pode precisar de limpeza manual no bucket (${pathAntigo}).`);
      }

      setSubstituindoDoc(null);
      setArquivoSubst(null);
      await carregarDocumentos();
    } catch (err: unknown) {
      alert(`Erro na substituição: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setSalvandoSubst(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-violet-500 p-6 mt-5">

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="font-black text-slate-100 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-white text-xs font-bold flex items-center justify-center">
              <FileText size={14} />
            </span>
            Documentos do Pedido
          </h2>
          <p className="text-xs text-violet-400 font-semibold mt-1">
            Centralize arquivos comerciais, fiscais e de expedição relacionados a este pedido.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowModal(true);
            setItensUpload([criarItemUpload(undefined, isProducao)]);
            setErroGeral(null);
          }}
          className="flex items-center gap-2 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-lg text-sm font-bold transition-all border border-violet-500/30 whitespace-nowrap"
        >
          <Plus size={15} />
          + Adicionar documentos
        </button>
      </div>

      {/* Aviso órfão */}
      {avisoOrfao && (
        <div className="mb-3 flex items-start gap-2 text-xs text-yellow-300 bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{avisoOrfao}</span>
          <button onClick={() => setAvisoOrfao(null)} className="ml-auto text-yellow-400 hover:text-white"><X size={13} /></button>
        </div>
      )}

      {/* Estado: carregando */}
      {carregando && (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-6 justify-center">
          <Loader2 size={16} className="animate-spin" /> Carregando documentos...
        </div>
      )}

      {/* Estado: erro */}
      {!carregando && erro && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3">
          <AlertTriangle size={14} /> {erro}
          <button onClick={carregarDocumentos} className="ml-auto text-red-300 hover:text-white"><RefreshCw size={13} /></button>
        </div>
      )}

      {/* Estado: vazio */}
      {!carregando && !erro && documentos.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">
          <File size={32} className="mx-auto mb-2 opacity-30" />
          Nenhum documento cadastrado para este pedido.
        </div>
      )}

      {/* Lista de documentos */}
      {!carregando && !erro && documentos.length > 0 && (
        <div className="space-y-2">
          {documentos.map(doc => {
            const isEditando = editandoId === doc.id;
            const isBaixando = baixandoId === doc.id;
            const isExcluindo = excluindoId === doc.id;

            return (
              <div key={doc.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all">
                {isEditando ? (
                  /* Modo edição inline */
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
                        <select
                          value={formEdicao.tipo_documento}
                          onChange={e => setFormEdicao(f => ({ ...f, tipo_documento: e.target.value as TipoDocumento }))}
                          className="form-input text-sm w-full"
                        >
                          {(Object.keys(TIPOS_AMIGAVEIS) as TipoDocumento[]).map(t => (
                            <option key={t} value={t}>{TIPOS_AMIGAVEIS[t]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-slate-400 mb-1 block">Título *</label>
                        <input
                          value={formEdicao.titulo ?? ''}
                          onChange={e => setFormEdicao(f => ({ ...f, titulo: e.target.value }))}
                          className="form-input text-sm w-full"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-slate-400 mb-1 block">Número do documento</label>
                        <input
                          value={formEdicao.numero_documento ?? ''}
                          onChange={e => setFormEdicao(f => ({ ...f, numero_documento: e.target.value }))}
                          className="form-input text-sm w-full"
                          placeholder="Opcional"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-slate-400 mb-1 block">Data do documento</label>
                        <input
                          type="date"
                          value={formEdicao.data_documento ?? ''}
                          onChange={e => setFormEdicao(f => ({ ...f, data_documento: e.target.value }))}
                          className="form-input text-sm w-full"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`vis-${doc.id}`}
                        checked={formEdicao.visivel_cliente ?? false}
                        onChange={e => setFormEdicao(f => ({ ...f, visivel_cliente: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <label htmlFor={`vis-${doc.id}`} className="text-xs text-slate-300">Disponível para o cliente</label>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => salvarEdicao(doc)}
                        disabled={salvandoEdicao}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-bold border border-emerald-500/30 transition-all disabled:opacity-50"
                      >
                        {salvandoEdicao ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoId(null)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-700/40 hover:bg-slate-700/60 text-slate-400 rounded-lg text-xs border border-slate-700 transition-all"
                      >
                        <X size={12} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Modo visualização */
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="pt-0.5"><IcTipo tipo={doc.tipo_documento} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-200 text-sm">{doc.titulo}</span>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{TIPOS_AMIGAVEIS[doc.tipo_documento]}</span>
                        {doc.visivel_cliente ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                            <ShieldCheck size={10} /> Disponível ao cliente
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-800/60 border border-slate-700/40 px-2 py-0.5 rounded-full">
                            <Lock size={10} /> Uso interno
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>{doc.nome_arquivo}</span>
                        {doc.numero_documento && <span>Nº {doc.numero_documento}</span>}
                        {doc.data_documento && <span>{formatarData(doc.data_documento)}</span>}
                        <span>{formatarTamanho(doc.tamanho_bytes)}</span>
                        <span>Incluído em {formatarDataHora(doc.created_at)}</span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Download */}
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        disabled={!!baixandoId}
                        title="Baixar arquivo"
                        className="p-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-all disabled:opacity-40"
                      >
                        {isBaixando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      </button>

                      {/* Editar metadados */}
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={() => iniciarEdicao(doc)}
                          title="Editar metadados"
                          className="p-1.5 rounded-lg bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/20 transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                      )}

                      {/* Substituir arquivo */}
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={() => { setSubstituindoDoc(doc); setArquivoSubst(null); }}
                          title="Substituir arquivo"
                          className="p-1.5 rounded-lg bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border border-violet-500/20 transition-all"
                        >
                          <RefreshCw size={14} />
                        </button>
                      )}

                      {/* Excluir */}
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={() => handleExcluir(doc)}
                          disabled={!!excluindoId}
                          title="Excluir documento"
                          className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 transition-all disabled:opacity-40"
                        >
                          {isExcluindo ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Adicionar documentos (Multiupload) ───────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

            {/* Topo do Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-600/20 text-violet-400">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-100 text-base">
                    Adicionar documentos ao pedido
                  </h3>
                  <p className="text-xs text-slate-400">
                    Selecione múltiplos arquivos para anexar em uma única operação
                  </p>
                </div>
              </div>
              <button
                onClick={() => { if (!salvando) setShowModal(false); }}
                className="text-slate-500 hover:text-white transition-colors p-1"
                disabled={salvando}
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo rolável */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">

              {/* Dropzone / Seletor em lote */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    adicionarArquivos(e.dataTransfer.files);
                  }
                }}
                className="border-2 border-dashed border-slate-700 hover:border-violet-500/60 bg-slate-900/40 hover:bg-violet-950/10 rounded-xl p-5 text-center cursor-pointer transition-all group"
              >
                <Upload size={28} className="mx-auto mb-2 text-violet-400 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-bold text-slate-200">
                  Clique para selecionar ou arraste arquivos aqui
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Aceitamos PDF, XML, ZIP, JPEG e PNG — máx. 10 MB por arquivo
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.xml,.zip,.jpg,.jpeg,.png,application/zip,application/x-zip-compressed,application/x-zip"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Erro Geral do Envio */}
              {erroGeral && (
                <div className="flex items-start gap-2 text-xs text-red-300 bg-red-950/40 border border-red-800/60 rounded-xl p-3">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-400" />
                  <span className="flex-1">{erroGeral}</span>
                </div>
              )}

              {/* Lista de Documentos a Adicionar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Documentos a adicionar ({itensUpload.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setItensUpload(prev => [...prev, criarItemUpload(undefined, isProducao)])}
                    disabled={salvando}
                    className="text-xs font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    <Plus size={13} /> Adicionar item manual
                  </button>
                </div>

                {itensUpload.length === 0 ? (
                  <div className="text-center py-6 border border-slate-800/80 rounded-xl text-xs text-slate-500">
                    Nenhum arquivo selecionado. Clique acima para adicionar documentos.
                  </div>
                ) : (
                  itensUpload.map((item, index) => {
                    const isEnviando = item.status === 'enviando';
                    const isSucesso = item.status === 'sucesso';
                    const isErro = item.status === 'erro' || !!item.erro;

                    return (
                      <div
                        key={item.id}
                        className={`bg-slate-900/80 border rounded-xl p-4 transition-all ${
                          isErro
                            ? 'border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                            : isSucesso
                            ? 'border-emerald-500/50 bg-emerald-950/10'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Cabeçalho do Card */}
                        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/70">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {index + 1}
                            </span>
                            {item.arquivo ? (
                              <div className="flex items-center gap-2 min-w-0">
                                <IcTipo tipo={item.tipo_documento} />
                                <span className="text-xs font-bold text-slate-200 truncate" title={item.arquivo.name}>
                                  {item.arquivo.name}
                                </span>
                                <span className="text-[10px] text-slate-500 shrink-0">
                                  ({formatarTamanho(item.arquivo.size)})
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                                <AlertTriangle size={12} /> Arquivo não selecionado
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isEnviando && (
                              <span className="text-[11px] text-violet-400 flex items-center gap-1 font-semibold">
                                <Loader2 size={12} className="animate-spin" /> Enviando...
                              </span>
                            )}
                            {isSucesso && (
                              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                                <CheckCircle2 size={12} /> Salvo
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removerItem(item.id)}
                              disabled={salvando}
                              className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Remover este documento da lista"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Mensagem de Erro Específica do Item */}
                        {item.erro && (
                          <div className="mb-3 flex items-center gap-1.5 text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg p-2.5">
                            <AlertTriangle size={13} className="shrink-0" />
                            <span>{item.erro}</span>
                          </div>
                        )}

                        {/* Campos do Documento */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Tipo */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                              Tipo do documento *
                            </label>
                            <select
                              value={item.tipo_documento}
                              onChange={e => atualizarItem(item.id, { tipo_documento: e.target.value as TipoDocumento })}
                              disabled={isProducao || salvando}
                              className="form-input text-xs w-full disabled:opacity-60"
                            >
                              {isProducao ? (
                                <option value="comprovante_envio">Comprovante de envio</option>
                              ) : (
                                (Object.keys(TIPOS_AMIGAVEIS) as TipoDocumento[]).map(t => (
                                  <option key={t} value={t}>{TIPOS_AMIGAVEIS[t]}</option>
                                ))
                              )}
                            </select>
                          </div>

                          {/* Título */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                              Título do documento *
                            </label>
                            <input
                              value={item.titulo}
                              onChange={e => atualizarItem(item.id, { titulo: e.target.value })}
                              disabled={salvando}
                              className="form-input text-xs w-full"
                              placeholder="Ex: NF-e 1234, Confirmação do Pedido..."
                              required
                            />
                          </div>

                          {/* Número */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                              Número do documento
                            </label>
                            <input
                              value={item.numero_documento}
                              onChange={e => atualizarItem(item.id, { numero_documento: e.target.value })}
                              disabled={salvando}
                              className="form-input text-xs w-full"
                              placeholder="Opcional"
                            />
                          </div>

                          {/* Data */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                              Data do documento
                            </label>
                            <input
                              type="date"
                              value={item.data_documento}
                              onChange={e => atualizarItem(item.id, { data_documento: e.target.value })}
                              disabled={salvando}
                              className="form-input text-xs w-full"
                            />
                          </div>
                        </div>

                        {/* Seletor de Arquivo se o item estiver sem arquivo */}
                        {!item.arquivo && (
                          <div className="mt-3">
                            <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                              Selecionar arquivo *
                            </label>
                            <input
                              type="file"
                              accept=".pdf,.xml,.zip,.jpg,.jpeg,.png,application/zip,application/x-zip-compressed,application/x-zip"
                              disabled={salvando}
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  const { tipo, titulo } = inferirTipoETitulo(f, isProducao);
                                  atualizarItem(item.id, {
                                    arquivo: f,
                                    tipo_documento: item.tipo_documento === 'orcamento' ? tipo : item.tipo_documento,
                                    titulo: item.titulo || titulo,
                                  });
                                }
                              }}
                              className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-600/20 file:text-violet-300 hover:file:bg-violet-600/30"
                            />
                          </div>
                        )}

                        {/* Visibilidade para o cliente */}
                        {!isProducao && (
                          <div className="mt-3 flex items-center gap-2 bg-slate-950/40 border border-slate-800/80 rounded-lg px-3 py-2">
                            <input
                              type="checkbox"
                              id={`vis_upload_${item.id}`}
                              checked={item.visivel_cliente}
                              onChange={e => atualizarItem(item.id, { visivel_cliente: e.target.checked })}
                              disabled={salvando}
                              className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <label htmlFor={`vis_upload_${item.id}`} className="text-xs text-slate-300 cursor-pointer">
                              Disponível para o cliente no acompanhamento público
                            </label>
                            {item.visivel_cliente
                              ? <Eye size={14} className="ml-auto text-emerald-400" />
                              : <EyeOff size={14} className="ml-auto text-slate-600" />
                            }
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Rodapé Fixo */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-400">
                {itensUpload.length > 0 ? (
                  <span>
                    <strong className="text-slate-200">{itensUpload.length}</strong> documento(s) na fila
                  </span>
                ) : (
                  <span>Nenhum documento na fila</span>
                )}
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={salvando}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarDocumentos}
                  disabled={salvando || itensUpload.length === 0}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-violet-900/20"
                >
                  {salvando ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Salvando documentos...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Salvar {itensUpload.length > 1 ? `${itensUpload.length} documentos` : 'documento'}
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Modal: Substituir arquivo único ──────────────────────────────── */}
      {substituindoDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-black text-slate-100 flex items-center gap-2">
                <RefreshCw size={16} className="text-violet-400" /> Substituir arquivo
              </h3>
              <button onClick={() => setSubstituindoDoc(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-400">
                O arquivo atual <strong className="text-slate-300">{substituindoDoc.nome_arquivo}</strong> será removido após o envio do novo arquivo.
              </p>
              <div
                onClick={() => fileSubstRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-violet-500/50 rounded-xl p-5 text-center cursor-pointer transition-all"
              >
                {arquivoSubst ? (
                  <div className="text-sm text-slate-300">
                    <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-400" />
                    <span className="font-bold">{arquivoSubst.name}</span>
                    <span className="block text-slate-500 text-xs mt-0.5">{formatarTamanho(arquivoSubst.size)}</span>
                  </div>
                ) : (
                  <div className="text-slate-500">
                    <Upload size={24} className="mx-auto mb-1.5" />
                    <span className="text-sm">Clique para selecionar o novo arquivo</span>
                    <span className="block text-xs mt-0.5">PDF, XML, ZIP, JPEG, PNG — máx. 10 MB</span>
                  </div>
                )}
              </div>
              <input
                ref={fileSubstRef}
                type="file"
                accept=".pdf,.xml,.zip,.jpg,.jpeg,.png,application/zip,application/x-zip-compressed,application/x-zip"
                className="hidden"
                onChange={e => { setArquivoSubst(e.target.files?.[0] ?? null); e.target.value = ''; }}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleSubstituir(substituindoDoc)}
                  disabled={!arquivoSubst || salvandoSubst}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                >
                  {salvandoSubst ? <><Loader2 size={15} className="animate-spin" /> Substituindo...</> : <><RefreshCw size={15} /> Confirmar substituição</>}
                </button>
                <button
                  type="button"
                  onClick={() => { setSubstituindoDoc(null); setArquivoSubst(null); }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
