import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, FileCode2, Receipt, Truck, File, Plus, Download, Trash2,
  RefreshCw, Eye, EyeOff, Pencil, X, AlertTriangle, CheckCircle2,
  Loader2, Upload, ShieldCheck, Lock
} from 'lucide-react';
import { supabase } from '../supabase';
import { PerfilUsuario } from '../interfaces/interesses';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TipoDocumento = 'orcamento' | 'nfe_pdf' | 'nfe_xml' | 'boleto' | 'comprovante_envio' | 'outro';

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

// ─── Constantes ───────────────────────────────────────────────────────────────

const BUCKET = 'documentos-pedidos';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const TIPOS_AMIGAVEIS: Record<TipoDocumento, string> = {
  orcamento: 'Orçamento',
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
  'image/jpeg': '.jpg/.jpeg',
  'image/png': '.png',
};

// Normaliza mime types inconsistentes de navegadores para .xml
function normalizarMime(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xml') return 'application/xml';
  return file.type;
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
    case 'nfe_pdf': return <FileText size={18} className={`${cls} text-emerald-400`} />;
    case 'nfe_xml': return <FileCode2 size={18} className={`${cls} text-cyan-400`} />;
    case 'boleto': return <Receipt size={18} className={`${cls} text-yellow-400`} />;
    case 'comprovante_envio': return <Truck size={18} className={`${cls} text-indigo-400`} />;
    case 'orcamento': return <FileText size={18} className={`${cls} text-blue-400`} />;
    default: return <File size={18} className={`${cls} text-slate-400`} />;
  }
}

// ─── Formulário de novo/edição de documento ───────────────────────────────────

interface FormDocumento {
  tipo_documento: TipoDocumento;
  titulo: string;
  numero_documento: string;
  data_documento: string;
  visivel_cliente: boolean;
  arquivo: File | null;
}

const emptyForm = (producao: boolean): FormDocumento => ({
  tipo_documento: producao ? 'comprovante_envio' : 'nfe_pdf',
  titulo: '',
  numero_documento: '',
  data_documento: '',
  visivel_cliente: false,
  arquivo: null,
});

// ─── Componente Principal ─────────────────────────────────────────────────────

export function GerenciadorDocumentos({ orcamentoId, perfilUsuario }: GerenciadorDocumentosProps) {
  const isProducao = perfilUsuario === 'producao';
  const podeEditar = perfilUsuario === 'administrador' || perfilUsuario === 'comercial';

  const [documentos, setDocumentos] = useState<DocumentoPedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Modal de adição
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormDocumento>(emptyForm(isProducao));
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Modal de edição de metadados
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formEdicao, setFormEdicao] = useState<Partial<FormDocumento>>({});
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

  // ── Validar arquivo ───────────────────────────────────────────────────────

  function validarArquivo(file: File): string | null {
    const mime = normalizarMime(file);
    if (!MIME_PERMITIDOS[mime]) {
      return `Tipo de arquivo não permitido. Aceitamos PDF, XML, JPEG e PNG.`;
    }
    if (file.size > MAX_BYTES) {
      return `O arquivo excede o limite de 10 MB (${formatarTamanho(file.size)}).`;
    }
    return null;
  }

  // ── Upload + INSERT ────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return;
    setErroForm(null);

    if (!form.titulo.trim()) { setErroForm('Informe o título do documento.'); return; }
    if (!form.arquivo) { setErroForm('Selecione um arquivo.'); return; }

    const erroArquivo = validarArquivo(form.arquivo);
    if (erroArquivo) { setErroForm(erroArquivo); return; }

    const mimeNorm = normalizarMime(form.arquivo);
    const ext = form.arquivo.name.split('.').pop()?.toLowerCase() ?? 'bin';

    setSalvando(true);
    try {
      // 1. Gerar ID do documento antes do upload
      const documentoId = crypto.randomUUID();

      // 2. Montar storage_path seguro (sem dados do cliente)
      const nomeArquivoStorage = `${crypto.randomUUID()}.${ext}`;
      const storagePath = `${orcamentoId}/${documentoId}/${nomeArquivoStorage}`;

      // 3. Upload para o bucket privado
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, form.arquivo, { contentType: mimeNorm, upsert: false });

      if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

      // 4. INSERT no banco usando o mesmo documentoId
      const { error: dbError } = await supabase
        .from('documentos_pedido')
        .insert({
          id: documentoId,
          orcamento_id: orcamentoId,
          tipo_documento: form.tipo_documento,
          titulo: form.titulo.trim(),
          nome_arquivo: form.arquivo.name,
          storage_path: storagePath,
          mime_type: mimeNorm,
          tamanho_bytes: form.arquivo.size,
          numero_documento: form.numero_documento.trim() || null,
          data_documento: form.data_documento || null,
          visivel_cliente: isProducao ? false : form.visivel_cliente,
          // created_by preenchido automaticamente pelo banco (auth.uid())
        });

      // 5. Rollback do Storage se INSERT falhar
      if (dbError) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
        throw new Error(`Falha ao registrar documento: ${dbError.message}`);
      }

      setShowModal(false);
      setForm(emptyForm(isProducao));
      await carregarDocumentos();
    } catch (err: unknown) {
      setErroForm(err instanceof Error ? err.message : 'Erro ao salvar documento.');
    } finally {
      setSalvando(false);
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
      // 1. Remover do Storage primeiro
      const { error: storageErr } = await supabase.storage
        .from(BUCKET)
        .remove([doc.storage_path]);

      if (storageErr) throw new Error(`Falha ao remover arquivo: ${storageErr.message}`);

      // 2. Somente então remover o registro
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
          // created_by NÃO é incluído aqui — protegido pelo trigger
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

  // ── Substituição de arquivo ────────────────────────────────────────────────

  async function handleSubstituir(doc: DocumentoPedido) {
    if (!arquivoSubst || salvandoSubst) return;

    const erroArquivo = validarArquivo(arquivoSubst);
    if (erroArquivo) { alert(erroArquivo); return; }

    const mimeNorm = normalizarMime(arquivoSubst);
    const ext = arquivoSubst.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const pathAntigo = doc.storage_path;

    setSalvandoSubst(true);
    try {
      // 1. Novo path para o arquivo substituto
      const novoNomeStorage = `${crypto.randomUUID()}.${ext}`;
      const novoPath = `${orcamentoId}/${doc.id}/${novoNomeStorage}`;

      // 2. Upload do novo arquivo
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(novoPath, arquivoSubst, { contentType: mimeNorm, upsert: false });

      if (uploadErr) throw new Error(`Falha ao enviar novo arquivo: ${uploadErr.message}`);

      // 3. Atualizar o banco (created_by protegido pelo trigger)
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
        // Reverter: remover novo arquivo, manter antigo
        await supabase.storage.from(BUCKET).remove([novoPath]);
        throw new Error(`Falha ao atualizar registro: ${dbErr.message}`);
      }

      // 4. Remover arquivo antigo (falha aqui não desfaz a substituição)
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
          onClick={() => { setShowModal(true); setForm(emptyForm(isProducao)); setErroForm(null); }}
          className="flex items-center gap-2 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-lg text-sm font-bold transition-all border border-violet-500/30 whitespace-nowrap"
        >
          <Plus size={15} />
          + Adicionar documento
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
                  /* ── Modo edição inline ── */
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
                  /* ── Modo visualização ── */
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

      {/* ── Modal: Adicionar documento ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-black text-slate-100 flex items-center gap-2">
                <Upload size={16} className="text-violet-400" /> Adicionar documento
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Tipo */}
              <div>
                <label className="form-label">Tipo do documento *</label>
                <select
                  value={form.tipo_documento}
                  onChange={e => setForm(f => ({ ...f, tipo_documento: e.target.value as TipoDocumento }))}
                  disabled={isProducao}
                  className="form-input w-full disabled:opacity-60"
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
                <label className="form-label">Título *</label>
                <input
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="form-input w-full"
                  placeholder="Ex: NF-e nº 1234, Boleto Bradesco..."
                  required
                />
              </div>

              {/* Número e data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Número do documento</label>
                  <input
                    value={form.numero_documento}
                    onChange={e => setForm(f => ({ ...f, numero_documento: e.target.value }))}
                    className="form-input w-full"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="form-label">Data do documento</label>
                  <input
                    type="date"
                    value={form.data_documento}
                    onChange={e => setForm(f => ({ ...f, data_documento: e.target.value }))}
                    className="form-input w-full"
                  />
                </div>
              </div>

              {/* Arquivo */}
              <div>
                <label className="form-label">Arquivo *</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-violet-500/50 rounded-xl p-5 text-center cursor-pointer transition-all group"
                >
                  {form.arquivo ? (
                    <div className="text-sm text-slate-300">
                      <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-400" />
                      <span className="font-bold">{form.arquivo.name}</span>
                      <span className="block text-slate-500 text-xs mt-0.5">{formatarTamanho(form.arquivo.size)}</span>
                    </div>
                  ) : (
                    <div className="text-slate-500 group-hover:text-slate-400 transition-colors">
                      <Upload size={24} className="mx-auto mb-1.5" />
                      <span className="text-sm">Clique para selecionar</span>
                      <span className="block text-xs mt-0.5">PDF, XML, JPEG, PNG — máx. 10 MB</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.xml,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0] ?? null;
                    setForm(prev => ({ ...prev, arquivo: f }));
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Visibilidade (não aparece para produção) */}
              {!isProducao && (
                <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                  <input
                    type="checkbox"
                    id="visivel_cliente_modal"
                    checked={form.visivel_cliente}
                    onChange={e => setForm(f => ({ ...f, visivel_cliente: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="visivel_cliente_modal" className="text-sm text-slate-300 cursor-pointer">
                    Disponível para o cliente no acompanhamento
                  </label>
                  {form.visivel_cliente
                    ? <Eye size={14} className="ml-auto text-emerald-400" />
                    : <EyeOff size={14} className="ml-auto text-slate-600" />
                  }
                </div>
              )}

              {/* Erro */}
              {erroForm && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} /> {erroForm}
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                >
                  {salvando ? <><Loader2 size={15} className="animate-spin" /> Enviando...</> : <><Upload size={15} /> Salvar documento</>}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={salvando}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Substituir arquivo ──────────────────────────────────── */}
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
                  </div>
                )}
              </div>
              <input
                ref={fileSubstRef}
                type="file"
                accept=".pdf,.xml,.jpg,.jpeg,.png"
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
