import { useState, useEffect } from 'react';
import { X, RefreshCw, Package, Tag, Layers, CheckCircle2, XCircle } from 'lucide-react';
import { Produto } from '../types';
import { supabase } from '../supabase';

interface ProdutosModalProps {
  onClose: () => void;
}

export function ProdutosModal({ onClose }: ProdutosModalProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProdutos = async () => {
    setLoading(true);
    setError(null);
    try {
      // Usando select normal (RLS do Supabase só retornará os permitidos)
      const { data, error: sbError } = await supabase
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true });

      if (sbError) throw sbError;
      setProdutos(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar produtos:', err);
      setError(err.message || 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

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
        
        <div className="flex items-center justify-between p-6 border-b border-blue-900 bg-blue-950 shadow-sm relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-indigo-600 to-indigo-400 text-white rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)]">
              <Package size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Catálogo de <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200">Produtos</span></h2>
              <p className="text-sm text-slate-400 font-medium mt-0.5">Visualização de produtos (Fase 1)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchProdutos}
              disabled={loading}
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
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-6">
              <p className="font-bold text-sm">Erro ao carregar produtos:</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-900 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_15px_rgba(79,70,229,0.5)]" />
              <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-sm">Carregando catálogo...</p>
            </div>
          ) : produtos.length === 0 && !error ? (
            <div className="text-center py-20 text-slate-500 flex flex-col items-center bg-blue-900/20 rounded-3xl border border-dashed border-blue-800">
              <div className="p-4 bg-blue-900/50 rounded-full mb-4 border border-blue-800">
                <Tag size={48} className="opacity-50 text-slate-400" />
              </div>
              <p className="text-xl font-black text-white">Nenhum produto cadastrado</p>
              <p className="text-sm mt-1 font-medium">Os produtos devem ser inseridos manualmente no banco de dados nesta fase.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {produtos.map((p) => (
                <div key={p.id} className="bg-blue-900/40 rounded-2xl border border-blue-800/50 p-5 flex flex-col shadow-lg">
                  <div className="flex justify-between items-start mb-3">
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
                    <div>
                      {p.ativo ? (
                        <CheckCircle2 size={20} className="text-emerald-500" title="Ativo" />
                      ) : (
                        <XCircle size={20} className="text-rose-500" title="Inativo" />
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-2xl font-black text-emerald-400">{fmtCurrency(p.preco_base)}</p>
                    <div className="mt-2">
                      {getStatusBadge(p.status_comercial)}
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
