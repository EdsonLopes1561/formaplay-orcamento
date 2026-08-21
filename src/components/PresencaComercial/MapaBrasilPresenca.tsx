import React, { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { PresencaCidade } from '../../types/geografia';
import brasilEstados from '../../assets/data/brasil_estados.json';

type MetricType = 'todos' | 'vendas' | 'orcamentos' | 'solicitacoes' | 'interesses';

interface MapaBrasilPresencaProps {
  nodes: PresencaCidade[];
  metric: MetricType;
  ufs: string[];
}

export function MapaBrasilPresenca({ nodes, metric, ufs }: MapaBrasilPresencaProps) {
  const [tooltipData, setTooltipData] = useState<PresencaCidade | null>(null);

  // Filtra apenas cidades com coordenadas válidas E que tenham valor na métrica atual
  const validNodes = useMemo(() => {
    return nodes.filter(n => {
      if (!n.lat || !n.lng) return false;
      if (metric === 'vendas' && n.vendas === 0) return false;
      if (metric === 'orcamentos' && n.orcamentos === 0) return false;
      if (metric === 'solicitacoes' && n.solicitacoes === 0) return false;
      if (metric === 'interesses' && n.interesses === 0) return false;
      if (metric === 'todos' && n.totalSinais === 0) return false;
      return true;
    });
  }, [nodes, metric]);

  const getMetricValue = (n: PresencaCidade) => {
    if (metric === 'vendas') return n.vendas;
    if (metric === 'orcamentos') return n.orcamentos;
    if (metric === 'solicitacoes') return n.solicitacoes;
    if (metric === 'interesses') return n.interesses;
    return n.totalSinais;
  };

  const getMetricLabel = () => {
    if (metric === 'vendas') return 'Vendas';
    if (metric === 'orcamentos') return 'Orçamentos';
    if (metric === 'solicitacoes') return 'Solicitações';
    if (metric === 'interesses') return 'Interesses';
    return 'Sinais Comerciais';
  };

  return (
    <div className="relative w-full h-[400px] lg:h-full min-h-[400px] bg-slate-900/30 rounded-2xl border border-slate-800 overflow-hidden group">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-900/50 to-[#0f172a] pointer-events-none"></div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 650,
          center: [-54, -15]
        }}
        className="w-full h-full"
      >
        <ZoomableGroup zoom={1} minZoom={1} maxZoom={5} translateExtent={[[-100, -100], [900, 700]]}>
          <Geographies geography={brasilEstados}>
            {({ geographies }) =>
              geographies.map(geo => {
                const ufSigla = geo.properties.uf;
                const isAlcancado = ufs.includes(ufSigla);
                const temCidade = validNodes.some(n => n.estado === ufSigla);
                const semMunicipio = isAlcancado && !temCidade;
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    stroke={semMunicipio ? '#f97316' : '#1e293b'}
                    strokeWidth={semMunicipio ? 0.8 : 0.5}
                    style={{
                      default: {
                        fill: isAlcancado ? '#1e293b' : '#0f172a',
                        outline: 'none',
                        transition: 'all 250ms'
                      },
                      hover: {
                        fill: isAlcancado ? '#334155' : '#1e293b',
                        outline: 'none',
                        transition: 'all 250ms'
                      },
                      pressed: {
                        fill: '#334155',
                        outline: 'none'
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>

          {/* Labels das UFs (renderizados sob os markers laranjas) */}
          {brasilEstados.features.map((geo: any) => {
            const uf = geo.properties.uf;
            const isAlcancado = ufs.includes(uf);
            const lng = geo.properties.labelLng;
            const lat = geo.properties.labelLat;

            if (lng === undefined || lat === undefined) return null;

            return (
              <Marker key={`label-${uf}`} coordinates={[lng, lat]} style={{ pointerEvents: 'none' }}>
                <text
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  className={`text-[8px] md:text-[9px] font-semibold tracking-wider transition-colors duration-300 ${
                    isAlcancado ? 'fill-slate-300 drop-shadow-sm' : 'fill-slate-500'
                  }`}
                >
                  {uf}
                </text>
              </Marker>
            );
          })}

          {/* Markers Laranjas (Cidades) */}
          {validNodes.map(node => {
            const valor = getMetricValue(node);
            const radius = 3 + Math.sqrt(valor) * 1.5;
            
            return (
              <Marker 
                key={node.key} 
                coordinates={[node.lng!, node.lat!]}
                onMouseEnter={() => setTooltipData(node)}
                onMouseLeave={() => setTooltipData(null)}
                onTouchStart={() => setTooltipData(node)}
              >
                {/* Halo */}
                <circle
                  r={radius * 1.8}
                  fill="#f97316" // laranja FormaPlay
                  opacity={0.1}
                  className="animate-pulse"
                />
                {/* Central Dot */}
                <circle
                  r={radius}
                  fill="#f97316"
                  stroke="#fff"
                  strokeWidth={1}
                  className="transition-all duration-300 hover:fill-orange-400 cursor-pointer shadow-lg drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]"
                />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltipData && (
        <div 
          className="absolute bottom-4 left-4 lg:bottom-auto lg:left-auto lg:top-4 lg:right-4 z-50 bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl min-w-[220px] pointer-events-none transition-opacity duration-200"
        >
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/50">
            <h4 className="text-white font-bold text-sm tracking-wide">
              {tooltipData.cidade} <span className="text-slate-400 font-medium">{tooltipData.estado}</span>
            </h4>
          </div>
          
          <div className="flex items-end justify-between mb-3">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{getMetricLabel()}</span>
             <span className="text-2xl font-black text-orange-500 leading-none">{getMetricValue(tooltipData)}</span>
          </div>

          <div className="space-y-1.5 text-xs font-medium">
             {tooltipData.vendas > 0 && (
               <div className="flex justify-between text-emerald-400">
                 <span>Vendas</span>
                 <span>{tooltipData.vendas}</span>
               </div>
             )}
             {tooltipData.orcamentos > 0 && (
               <div className="flex justify-between text-blue-400">
                 <span>Orçamentos</span>
                 <span>{tooltipData.orcamentos}</span>
               </div>
             )}
             {tooltipData.solicitacoes > 0 && (
               <div className="flex justify-between text-amber-400">
                 <span>Solicitações</span>
                 <span>{tooltipData.solicitacoes}</span>
               </div>
             )}
             {tooltipData.interesses > 0 && (
               <div className="flex justify-between text-purple-400">
                 <span>Interesses</span>
                 <span>{tooltipData.interesses}</span>
               </div>
             )}
          </div>
        </div>
      )}
      
      {/* Legend / Info */}
      <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 pointer-events-none bg-slate-900/70 backdrop-blur-md p-2 md:p-3 rounded-xl border border-slate-700/50 shadow-lg">
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]"></div>
            <span className="text-[9px] md:text-xs font-medium text-slate-300">Cidade identificada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded bg-slate-800 border border-slate-600"></div>
            <span className="text-[9px] md:text-xs font-medium text-slate-400">Presença comercial no estado</span>
          </div>
          
          {(() => {
            const hasEstadoSemMunicipio = ufs.some(uf => !validNodes.some(n => n.estado === uf));
            if (!hasEstadoSemMunicipio) return null;
            return (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded bg-slate-800 border border-orange-500"></div>
                <span className="text-[9px] md:text-xs font-medium text-slate-400">UF sem município identificado</span>
              </div>
            );
          })()}
        </div>
        <div className="mt-2 pt-1.5 md:mt-3 md:pt-2 border-t border-slate-700/50">
          <span className="text-[8px] md:text-[10px] text-slate-500">Tamanho do ponto = intensidade</span>
        </div>
      </div>
    </div>
  );
}
