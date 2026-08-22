import { useMemo, useState, useRef, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { Map as MapIcon } from 'lucide-react';
import { PresencaCidade } from '../../interfaces/geografia';
import brasilEstados from '../../assets/data/brasil_estados.json';

type MetricType = 'todos' | 'vendas' | 'orcamentos' | 'solicitacoes' | 'interesses';

interface MapaBrasilPresencaProps {
  nodes: PresencaCidade[];
  metric: MetricType;
  ufs: string[];
}

export function MapaBrasilPresenca({ nodes, metric, ufs }: MapaBrasilPresencaProps) {
  const [tooltipData, setTooltipData] = useState<PresencaCidade | null>(null);
  const [position, setPosition] = useState({ coordinates: [-54, -15] as [number, number], zoom: 1 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<{ [key: string]: SVGCircleElement | null }>({});

  const currentZoom = position.zoom;

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

  useEffect(() => {
    if (!tooltipData || !tooltipRef.current || !containerRef.current) return;
    
    let rafId: number;
    let pointerState = '';

    const updatePosition = () => {
      const circle = circleRefs.current[tooltipData.key];
      const tooltip = tooltipRef.current;
      const container = containerRef.current;
      if (!circle || !tooltip || !container) return;

      const cRect = circle.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      const tRect = tooltip.getBoundingClientRect();

      const cx = cRect.left + cRect.width / 2 - contRect.left;
      const cy = cRect.top + cRect.height / 2 - contRect.top;

      const gap = 15;
      let x = cx + gap;
      let y = cy - tRect.height / 2;
      let newPointer = 'right';

      if (x + tRect.width > contRect.width) {
        x = cx - tRect.width - gap;
        newPointer = 'left';
      }
      
      if (y < 10) {
        y = cy + gap;
        x = cx - tRect.width / 2;
        newPointer = 'bottom';
      } else if (y + tRect.height > contRect.height - 10) {
        y = cy - tRect.height - gap;
        x = cx - tRect.width / 2;
        newPointer = 'top';
      }

      if (x < 10) x = 10;
      if (x + tRect.width > contRect.width - 10) x = contRect.width - tRect.width - 10;

      tooltip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      tooltip.style.opacity = '1';

      if (pointerState !== newPointer) {
        tooltip.setAttribute('data-pointer', newPointer);
        pointerState = newPointer;
      }

      rafId = requestAnimationFrame(updatePosition);
    };

    tooltipRef.current.style.opacity = '0';
    updatePosition();

    return () => cancelAnimationFrame(rafId);
  }, [tooltipData]);

  const handleMoveEnd = (pos: any) => setPosition(pos);

  const handleReset = () => {
    setPosition({ coordinates: [-54, -15], zoom: 1 });
    setTooltipData(null);
  };

  return (
    <div ref={containerRef} className="relative w-full h-[400px] lg:h-full min-h-[400px] bg-slate-900/30 rounded-2xl border border-slate-800 overflow-hidden group">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-900/50 to-[#0f172a] pointer-events-none"></div>

      {currentZoom > 1.1 && (
        <button
          onClick={handleReset}
          className="absolute top-4 left-4 z-40 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-600 shadow-lg text-xs font-bold tracking-wide flex items-center gap-1.5 transition-all backdrop-blur-sm"
        >
          <MapIcon size={14} />
          Ver Brasil
        </button>
      )}

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 650 }}
        className="w-full h-full"
      >
        <ZoomableGroup 
          zoom={position.zoom} 
          center={position.coordinates} 
          onMoveEnd={handleMoveEnd} 
          minZoom={1} 
          maxZoom={20} 
          translateExtent={[[-1000, -1000], [1800, 1600]]}
        >
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
                    stroke={semMunicipio ? '#10b981' : '#1e293b'}
                    strokeWidth={semMunicipio ? 0.8 : 0.5}
                    vectorEffect="non-scaling-stroke"
                    style={{
                      default: { fill: isAlcancado ? '#1e293b' : '#0f172a', outline: 'none', transition: 'all 250ms' },
                      hover: { fill: isAlcancado ? '#334155' : '#1e293b', outline: 'none', transition: 'all 250ms' },
                      pressed: { fill: '#334155', outline: 'none' }
                    }}
                  />
                );
              })
            }
          </Geographies>

          {validNodes.map(node => {
            const baseRadius = 3;
            const interactionRadius = 12;
            const visualRadius = baseRadius / currentZoom;
            const touchRadius = interactionRadius / currentZoom;
            
            return (
              <Marker key={node.key} coordinates={[node.lng!, node.lat!]}>
                <g
                  onMouseEnter={() => setTooltipData(node)}
                  onMouseLeave={() => {}}
                  onTouchStart={() => setTooltipData(node)}
                  className="cursor-pointer group"
                >
                  <circle
                    ref={el => circleRefs.current[node.key] = el}
                    r={touchRadius}
                    fill="transparent"
                  />
                  <circle
                    r={visualRadius}
                    fill="#10b981"
                    stroke={tooltipData?.key === node.key ? '#34d399' : '#ffffff'}
                    strokeWidth={tooltipData?.key === node.key ? 1.5 : 0.5}
                    vectorEffect="non-scaling-stroke"
                    className="transition-colors duration-300 group-hover:fill-emerald-400"
                  />
                  {tooltipData?.key === node.key && (
                    <circle
                      r={visualRadius * 2.5}
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth={1}
                      strokeOpacity={0.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </g>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      <div 
        ref={tooltipRef}
        className={`absolute top-0 left-0 z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl min-w-[220px] transition-opacity duration-200 pointer-events-none ${!tooltipData ? 'opacity-0 hidden' : ''}`}
      >
        <div className="absolute w-2 h-2 bg-slate-900 border-slate-700 transform rotate-45 
          data-[pointer=right]:-left-1 data-[pointer=right]:top-1/2 data-[pointer=right]:-translate-y-1/2 data-[pointer=right]:border-b data-[pointer=right]:border-l
          data-[pointer=left]:-right-1 data-[pointer=left]:top-1/2 data-[pointer=left]:-translate-y-1/2 data-[pointer=left]:border-t data-[pointer=left]:border-r
          data-[pointer=bottom]:-top-1 data-[pointer=bottom]:left-1/2 data-[pointer=bottom]:-translate-x-1/2 data-[pointer=bottom]:border-t data-[pointer=bottom]:border-l
          data-[pointer=top]:-bottom-1 data-[pointer=top]:left-1/2 data-[pointer=top]:-translate-x-1/2 data-[pointer=top]:border-b data-[pointer=top]:border-r
        "></div>
        
        {tooltipData && (
          <>
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/50">
              <h4 className="text-white font-bold text-sm tracking-wide">
                {tooltipData.cidade} <span className="text-slate-400 font-medium">{tooltipData.estado}</span>
              </h4>
            </div>
            <div className="flex items-end justify-between mb-3">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sinais Comerciais</span>
               <span className="text-xl font-black text-emerald-500 leading-none">{tooltipData.totalSinais}</span>
            </div>
            <div className="space-y-1.5 text-xs font-medium">
               {tooltipData.vendas > 0 && <div className="flex justify-between text-emerald-400"><span>Vendas</span><span>{tooltipData.vendas}</span></div>}
               {tooltipData.orcamentos > 0 && <div className="flex justify-between text-blue-400"><span>Orçamentos</span><span>{tooltipData.orcamentos}</span></div>}
               {tooltipData.solicitacoes > 0 && <div className="flex justify-between text-amber-400"><span>Solicitações</span><span>{tooltipData.solicitacoes}</span></div>}
               {tooltipData.interesses > 0 && <div className="flex justify-between text-purple-400"><span>Interesses</span><span>{tooltipData.interesses}</span></div>}
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 pointer-events-none bg-slate-900/70 backdrop-blur-md p-2 md:p-3 rounded-xl border border-slate-700/50 shadow-lg">
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-emerald-500 shadow-sm"></div>
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
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded bg-slate-800 border border-emerald-500"></div>
                <span className="text-[9px] md:text-xs font-medium text-slate-400">UF sem município identificado</span>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

