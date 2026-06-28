import { useState, useEffect } from 'react';
import { X, RefreshCw, Package, Tag, CheckCircle2, XCircle, ShieldAlert, Plus, Edit2, Lock, Unlock } from 'lucide-react';
import { Produto } from '../types';
import { supabase } from '../supabase';

interface ProdutosModalProps {
  onClose: () => void;
}

const DEFAULT_PRODUTO: Partial<Produto> = {
  nome: '',
  sku: '',
  revisao: 'R00',
  preco_base: 0,
  peso_kg: 0,
  altura_cm: 0,
  largura_cm: 0,
  comprimento_cm: 0,
  maximo_unidades_por_volume: 1,
  status_comercial: 'disponivel',
  quantidade_estoque: 0,
  controlar_estoque: false,
  ativo: true,
  categoria: '',
  mensagem_publica: '',
  descricao_curta: '',
  descricao_completa: '',
  observacao_interna: ''
};

export function ProdutosModal({ onClose }: ProdutosModalProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin states
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Partial<Produto> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchProdutos = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAdminMode && adminToken) {
        // Fetch do backend Edge Function (ignora RLS e traz inativos)
        const res = await fetch('/api/produtos', {
          headers: { 'x-admin-token': adminToken }
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Erro de autenticação ou servidor.');
        }
        const data = await res.json();
        setProdutos(data || []);
      } else {
        // Fetch via client normal (apenas leitura pública)
        const { data, error: sbError } = await supabase
          .from('produtos')
          .select('*')
          .order('nome', { ascending: true });

        if (sbError) throw sbError;
        setProdutos(data || []);
      }
    } catch (err: any) {
      console.error('Erro ao buscar produtos:', err);
      setError(err.message || 'Erro ao carregar produtos');
      if (isAdminMode && err.message.includes('Acesso negado')) {
        setIsAdminMode(false);
        setAdminToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, [isAdminMode]);

  const handleAdminAuth = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
      setAdminToken('');
      return;
    }
    const token = window.prompt('Digite a senha administrativa:');
    if (token) {
      setAdminToken(token);
      setIsAdminMode(true);
    }
  };

  const handleSaveProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduto || !adminToken) return;
    
    setSaving(true);
    setError(null);
    try {
      const isEditing = !!editingProduto.id;
      const method = isEditing ? 'PUT' : 'POST';
      
      const res = await fetch('/api/produtos', {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify(editingProduto)
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao salvar produto.');
      }
      
      setIsFormOpen(false);
      setEditingProduto(null);
      await fetchProdutos();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (produto: Produto) => {
    if (!adminToken || !window.confirm(`Deseja realmente ${produto.ativo ? 'inativar' : 'reativar'} este produto?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/produtos', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({ id: produto.id, ativo: !produto.ativo })
      });
      
      if (!res.ok) throw new Error('Erro ao alterar status do produto.');
      await fetchProdutos();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fmtCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disponivel': return <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-emerald-500/30">Disponível</span>;
      case 'baixo_estoque': return <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-amber-500/30">Baixo Estoque</span>;
      case 'sob_encomenda': return <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-blue-500/30">Sob Encomenda</span>;
      case 'reposicao_em_breve': return <span className="bg-purple-500/20 text-purple-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-purple-500/30">Reposição Breve</span>;
      case 'em_desenvolvimento': return <span className="bg-slate-500/20 text-slate-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-slate-500/30">Em Desenv.</span>;
      case 'indisponivel': return <span className="bg-rose-500/20 text-rose-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-rose-500/30">Indisponível</span>;
      default: return <span className="bg-slate-500/20 text-slate-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-slate-500/30">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-md animate-fade-in transition-opacity">
      <div className="bg-blue-950 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-6xl max-h-[90vh] flex flex-col border border-blue-800/50 overflow-hidden text-slate-200">
        
        <div className="flex items-center justify-between p-6 border-b border-blue-900 bg-blue-950 shadow-sm relative z-10 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-indigo-600 to-indigo-400 text-white rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)]">
              <Package size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Catálogo de <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200">Produtos</span></h2>
              <p className="text-sm text-slate-400 font-medium mt-0.5">
                {isAdminMode ? 'Modo Administração (Leitura e Escrita)' : 'Visualização de produtos (Somente Leitura)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAdminAuth}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm border ${
                isAdminMode 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {isAdminMode ? <Unlock size={16} /> : <Lock size={16} />}
              {isAdminMode ? 'Sair do Modo Admin' : 'Modo Admin'}
            </button>

            {isAdminMode && !isFormOpen && (
              <button
                onClick={() => { setEditingProduto({ ...DEFAULT_PRODUTO }); setIsFormOpen(true); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all font-bold text-sm shadow-md"
              >
                <Plus size={18} /> Novo Produto
              </button>
            )}

            <button
              onClick={fetchProdutos}
              disabled={loading || isFormOpen}
              className="p-2.5 rounded-xl bg-blue-900/80 text-indigo-400 hover:text-indigo-300 hover:bg-blue-800 transition-all border border-blue-800 shadow-sm disabled:opacity-50 active:scale-95"
              title="Atualizar"
            >
              <RefreshCw size={20} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-blue-900 hover:bg-slate-700 hover:text-white transition-all border border-blue-800 text-slate-400 shadow-sm active:scale-95"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-blue-950/30">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-6 flex items-start gap-3">
              <ShieldAlert className="flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-sm">Erro:</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {isFormOpen && editingProduto ? (
            <div className="bg-blue-900/40 rounded-2xl border border-blue-800/50 p-6 shadow-lg animate-fade-in">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-blue-800/50 pb-4">
                {editingProduto.id ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              
              <form onSubmit={handleSaveProduto} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Nome do Produto *</label>
                    <input required type="text" value={editingProduto.nome} onChange={e => setEditingProduto({...editingProduto, nome: e.target.value})} className="w-full bg-blue-950 border border-blue-800 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">SKU *</label>
                    <input required type="text" value={editingProduto.sku} onChange={e => setEditingProduto({...editingProduto, sku: e.target.value})} className="w-full bg-blue-950 border border-blue-800 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Revisão *</label>
                    <input required type="text" value={editingProduto.revisao} onChange={e => setEditingProduto({...editingProduto, revisao: e.target.value})} className="w-full bg-blue-950 border border-blue-800 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Categoria</label>
                    <input type="text" value={editingProduto.categoria || ''} onChange={e => setEditingProduto({...editingProduto, categoria: e.target.value})} className="w-full bg-blue-950 border border-blue-800 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Preço Base (R$) *</label>
                    <input required type="number" step="0.01" min="0" value={editingProduto.preco_base} onChange={e => setEditingProduto({...editingProduto, preco_base: Number(e.target.value)})} className="w-full bg-blue-950 border border-blue-800 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>

                <div className="bg-blue-950/50 p-4 rounded-xl border border-blue-900">
                  <h4 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Logística e Dimensões</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Peso (kg) *</label>
                      <input required type="number" step="0.01" min="0" value={editingProduto.peso_kg} onChange={e => setEditingProduto({...editingProduto, peso_kg: Number(e.target.value)})} className="w-full bg-blue-900 border border-blue-800 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Altura (cm) *</label>
                      <input required type="number" step="0.1" min="0" value={editingProduto.altura_cm} onChange={e => setEditingProduto({...editingProduto, altura_cm: Number(e.target.value)})} className="w-full bg-blue-900 border border-blue-800 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Largura (cm) *</label>
                      <input required type="number" step="0.1" min="0" value={editingProduto.largura_cm} onChange={e => setEditingProduto({...editingProduto, largura_cm: Number(e.target.value)})} className="w-full bg-blue-900 border border-blue-800 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Compr. (cm) *</label>
                      <input required type="number" step="0.1" min="0" value={editingProduto.comprimento_cm} onChange={e => setEditingProduto({...editingProduto, comprimento_cm: Number(e.target.value)})} className="w-full bg-blue-900 border border-blue-800 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Máx/Vol *</label>
                      <input required type="number" min="1" value={editingProduto.maximo_unidades_por_volume} onChange={e => setEditingProduto({...editingProduto, maximo_unidades_por_volume: Number(e.target.value)})} className="w-full bg-blue-900 border border-blue-800 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-indigo-500" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Status Comercial *</label>
                    <select required value={editingProduto.status_comercial} onChange={e => setEditingProduto({...editingProduto, status_comercial: e.target.value})} className="w-full bg-blue-950 border border-blue-800 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 appearance-none">
                      <option value="disponivel">Disponível</option>
                      <option value="baixo_estoque">Baixo Estoque</option>
                      <option value="sob_encomenda">Sob Encomenda</option>
                      <option value="reposicao_em_breve">Reposição em Breve</option>
                      <option value="em_desenvolvimento">Em Desenvolvimento</option>
                      <option value="indisponivel">Indisponível</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Quantidade Estoque</label>
                    <input type="number" value={editingProduto.quantidade_estoque} onChange={e => setEditingProduto({...editingProduto, quantidade_estoque: Number(e.target.value)})} className="w-full bg-blue-950 border border-blue-800 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="flex items-center gap-2 mt-7">
                    <input type="checkbox" id="controlarEstoque" checked={editingProduto.controlar_estoque} onChange={e => setEditingProduto({...editingProduto, controlar_estoque: e.target.checked})} className="w-5 h-5 rounded border-blue-800 text-indigo-600 focus:ring-indigo-500 bg-blue-950" />
                    <label htmlFor="controlarEstoque" className="text-sm font-medium text-slate-300">Controlar Estoque</label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Mensagem Pública (Formulário Site)</label>
                  <input type="text" value={editingProduto.mensagem_publica || ''} onChange={e => setEditingProduto({...editingProduto, mensagem_publica: e.target.value})} className="w-full bg-blue-950 border border-blue-800 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Produto em reposição. Envie sua solicitação e avisaremos." />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-blue-800/50">
                  <button type="button" onClick={() => setIsFormOpen(false)} disabled={saving} className="px-6 py-2.5 rounded-xl border border-blue-800 text-slate-300 hover:bg-slate-800 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all font-bold shadow-md flex items-center gap-2 disabled:opacity-50">
                    {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={18} />}
                    Salvar Produto
                  </button>
                </div>
              </form>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-900 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_15px_rgba(79,70,229,0.5)]" />
              <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-sm">Carregando catálogo...</p>
            </div>
          ) : produtos.length === 0 && !error ? (
            <div className="text-center py-20 text-slate-500 flex flex-col items-center bg-blue-900/20 rounded-3xl border border-dashed border-blue-800">
              <div className="p-4 bg-blue-900/50 rounded-full mb-4 border border-blue-800">
                <Tag size={48} className="opacity-50 text-slate-400" />
              </div>
              <p className="text-xl font-black text-white">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {produtos.map((p) => (
                <div key={p.id} className={`bg-blue-900/40 rounded-2xl border border-blue-800/50 p-5 flex flex-col shadow-lg relative ${!p.ativo ? 'opacity-60 grayscale-[50%]' : ''}`}>
                  
                  {isAdminMode && (
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                      <button onClick={() => { setEditingProduto(p); setIsFormOpen(true); }} className="p-1.5 bg-blue-800/80 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-lg transition-colors border border-blue-700/50" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleToggleActive(p)} className={`p-1.5 rounded-lg transition-colors border ${p.ativo ? 'bg-blue-800/80 hover:bg-rose-600 text-rose-300 hover:text-white border-blue-700/50' : 'bg-rose-900/80 hover:bg-emerald-600 text-emerald-300 hover:text-white border-rose-800/50'}`} title={p.ativo ? 'Inativar' : 'Reativar'}>
                        {p.ativo ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                      </button>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-3 pr-20">
                    <div>
                      <h3 className="font-bold text-lg text-white leading-tight">{p.nome}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {p.sku}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-blue-900 px-1.5 py-0.5 rounded">
                          Rev: {p.revisao}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-2xl font-black text-emerald-400">{fmtCurrency(p.preco_base)}</p>
                    <div className="mt-2 flex gap-2 items-center">
                      {getStatusBadge(p.status_comercial)}
                      {!p.ativo && <span className="bg-rose-900/50 text-rose-300 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-rose-500/50">Inativo</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 bg-blue-950/50 p-3 rounded-xl border border-blue-900/50">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Logística</p>
                      <p className="text-xs text-slate-200 mt-0.5">{p.peso_kg} kg</p>
                      <p className="text-xs text-slate-200">{p.altura_cm}x{p.largura_cm}x{p.comprimento_cm} cm</p>
                      <p className="text-[10px] text-slate-400 mt-1">Máx/Vol: {p.maximo_unidades_por_volume}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estoque</p>
                      <p className="text-xs text-slate-200 mt-0.5">
                        {p.controlar_estoque ? (
                          <span className={p.quantidade_estoque > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {p.quantidade_estoque} un.
                          </span>
                        ) : 'Não controlado'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 truncate" title={p.categoria}>{p.categoria || 'Sem categoria'}</p>
                    </div>
                  </div>

                  {p.mensagem_publica && (
                    <div className="mt-auto bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                      <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-1">Aviso Público</p>
                      <p className="text-xs text-amber-200/80 italic">"{p.mensagem_publica}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
