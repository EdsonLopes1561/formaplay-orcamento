import { useState, useEffect } from 'react';
import { usePresencaComercial } from '../../hooks/usePresencaComercial';
import { interessesService } from '../../services/interessesService';
import { Map, MapPin, Globe, AlertTriangle, CheckCircle, Navigation, TrendingUp, Activity } from 'lucide-react';

interface PresencaComercialViewProps {
  orcamentos: any[];
  solicitacoes: any[];
}

export function PresencaComercialView({ orcamentos, solicitacoes }: PresencaComercialViewProps) {
  const [interesses, setInteresses] = useState<any[]>([]);
  const [loadingInteresses, setLoadingInteresses] = useState(true);
  const [errorInteresses, setErrorInteresses] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchInteresses = async () => {
      try {
        setLoadingInteresses(true);
        // Using the 'todos' parameter to fetch active, archived, sem_interesse, etc.
        const res = await interessesService.listarInteresses('todos');
        if (isMounted) {
          setInteresses(res || []);
          setErrorInteresses(false);
        }
      } catch (err) {
        console.error('Falha ao carregar interesses:', err);
        if (isMounted) {
          setInteresses([]);
          setErrorInteresses(true);
        }
      } finally {
        if (isMounted) setLoadingInteresses(false);
      }
    };
    fetchInteresses();
    return () => { isMounted = false; };
  }, []);

  const { nodes, indicadores, ufsBrasil, loading, error } = usePresencaComercial({
    enabled: true,
    orcamentos,
    solicitacoes,
    interesses
  });

  if (loading || loadingInteresses) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] bg-slate-900/50">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin mb-5 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
        <p className="text-slate-400 font-bold text-sm tracking-wide uppercase">Carregando dados geográficos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-center p-8 bg-slate-900/50">
        <AlertTriangle size={56} className="text-rose-500 mb-5 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
        <h3 className="text-2xl font-black text-white">Falha ao processar a Presença Comercial.</h3>
        <p className="text-slate-400 mt-2 font-medium">Os datasets geográficos não puderam ser carregados.</p>
      </div>
    );
  }

  const top10 = [...nodes]
    .filter(n => n.key.startsWith('BR|'))
    .sort((a, b) => {
      if (b.totalSinais !== a.totalSinais) return b.totalSinais - a.totalSinais;
      return (a.cidade || '').localeCompare(b.cidade || '');
    })
    .slice(0, 10);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-950/30 flex flex-col min-h-0 animate-fade-in">
      
      {/* Header Interno */}
      <div className="flex flex-col gap-1 mb-2">
        <h3 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
          <Globe className="text-indigo-500" size={24} /> Presença Comercial
        </h3>
        <p className="text-slate-400 font-medium text-sm">Onde nossos jogos, propostas e interesses já estão chegando.</p>
        
        {errorInteresses && (
          <div className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 w-fit">
            <AlertTriangle size={14} /> <span>Não foi possível carregar os interesses históricos. Indicadores parciais.</span>
          </div>
        )}
      </div>

      {/* Cards Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Estados Alcançados</span>
            <Map className="text-emerald-500 opacity-80" size={18} />
          </div>
          <div>
            <div className="text-3xl font-black text-white">{indicadores.estadosBrasil}</div>
            <div className="text-xs font-medium text-slate-500 mt-1 truncate" title={ufsBrasil.join(' • ')}>{ufsBrasil.join(' • ') || 'Nenhum'}</div>
          </div>
        </div>

        <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/50 transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-blue-400"></div>
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Cidades Alcançadas</span>
            <MapPin className="text-blue-500 opacity-80" size={18} />
          </div>
          <div className="text-3xl font-black text-white mt-1">{indicadores.cidadesBrasil}</div>
        </div>

        <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-green-500/50 transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-green-400">Vendas Consolidadas</span>
            <CheckCircle className="text-green-500 opacity-80" size={18} />
          </div>
          <div className="text-3xl font-black text-white mt-1">{indicadores.vendas}</div>
        </div>

        <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center justify-between text-slate-400 mb-3 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Sinais Comerciais</span>
            <Activity className="text-indigo-400" size={18} />
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-black text-white">{indicadores.sinaisComerciais}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">interações registradas</div>
          </div>
        </div>
      </div>

      {/* Indicadores Secundários */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 shadow-sm">
           <div className="w-2 h-2 rounded-full bg-blue-500"></div>
           <span className="text-xs font-bold text-slate-400 uppercase">Orçamentos</span>
           <span className="text-sm font-black text-white">{indicadores.orcamentos}</span>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 shadow-sm">
           <div className="w-2 h-2 rounded-full bg-amber-500"></div>
           <span className="text-xs font-bold text-slate-400 uppercase">Solicitações</span>
           <span className="text-sm font-black text-white">{indicadores.solicitacoes}</span>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 shadow-sm">
           <div className="w-2 h-2 rounded-full bg-purple-500"></div>
           <span className="text-xs font-bold text-slate-400 uppercase">Interesses</span>
           <span className="text-sm font-black text-white">{indicadores.interesses}</span>
        </div>
      </div>

      {/* Main Grid: Ranking e Mapa */}
      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        
        {/* Coluna Esquerda: Ranking e Status */}
        <div className="w-full lg:w-[35%] flex flex-col gap-6">
          <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 shadow-xl flex-1">
            <h3 className="text-sm font-black text-white mb-6 flex items-center gap-2 uppercase tracking-widest"><TrendingUp size={18} className="text-indigo-500"/> Top 10 Cidades</h3>
            
            {top10.length > 0 ? (
              <div className="space-y-4">
                {top10.map((n, idx) => (
                  <div key={n.key} className="flex flex-col gap-1.5 pb-3 border-b border-slate-800/50 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <span className="text-sm font-black text-slate-500 min-w-[18px]">{idx + 1}.</span>
                        <div>
                          <div className="text-sm font-bold text-slate-200">{n.cidade} <span className="text-slate-500 font-medium">/ {n.estado}</span></div>
                          <div className="text-[11px] font-medium text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                             {n.vendas > 0 && <span className="text-emerald-400">{n.vendas} venda{n.vendas !== 1 && 's'}</span>}
                             {n.vendas > 0 && <span className="text-slate-700">•</span>}
                             {n.orcamentos > 0 && <span>{n.orcamentos} orçam.</span>}
                             {n.orcamentos > 0 && <span className="text-slate-700">•</span>}
                             {n.solicitacoes > 0 && <span>{n.solicitacoes} solicit.</span>}
                             {n.solicitacoes > 0 && <span className="text-slate-700">•</span>}
                             {n.interesses > 0 && <span>{n.interesses} inter.</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">{n.totalSinais} sinais</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                <p className="text-xs text-slate-500 font-medium italic">Nenhum sinal com cidade brasileira detectado.</p>
              </div>
            )}
          </div>

          {/* Avisos Inferiores */}
          <div className="flex flex-col gap-3">
            {indicadores.sinaisNaoResolvidos > 0 && (
              <div className="flex items-center gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                <AlertTriangle size={18} className="text-amber-500 opacity-80" />
                <span className="text-xs font-medium text-slate-300"><strong className="text-amber-500">{indicadores.sinaisNaoResolvidos} sinais comerciais</strong> com localização incompleta na base (apenas estado).</span>
              </div>
            )}
            
            <div className="flex items-center gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <Globe size={18} className="text-blue-500 opacity-80" />
              {indicadores.sinaisInternacionais === 0 ? (
                <span className="text-xs font-medium text-slate-400">Nenhum sinal internacional até o momento.</span>
              ) : (
                <span className="text-xs font-medium text-slate-300"><strong className="text-blue-400">{indicadores.sinaisInternacionais} sinais</strong> de origem internacional.</span>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Placeholder do Mapa */}
        <div className="w-full lg:w-[65%] min-h-[350px] lg:min-h-[500px] flex flex-col items-center justify-center p-8 bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-700/50 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-900/5 to-transparent"></div>
          <Navigation size={80} className="text-slate-700 mb-6 group-hover:text-indigo-500/50 transition-colors duration-700" strokeWidth={1} />
          <h2 className="text-2xl font-black text-slate-300 mb-2 relative z-10 text-center">Mapa de presença em preparação</h2>
          <p className="text-slate-500 text-sm font-medium max-w-md text-center relative z-10">
            Na próxima etapa, as cidades alcançadas serão exibidas geograficamente aqui no mapa do Brasil.
          </p>
        </div>

      </div>

    </div>
  );
}
