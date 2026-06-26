import { Orcamento, Cliente, EMPRESA } from '../types';
import { Building2, MessageCircle, Mail } from 'lucide-react';
import { FormaPlayBrand } from './FormaPlayBrand';

interface PrintViewProps {
  orcamento: Orcamento;
  clienteData?: Cliente | null;
}

const fmt = (val: number | string | null | undefined) => {
  const n = Number(val) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getProdutoImagem = (nome: string): string | null => {
  const n = (nome || '').toLowerCase();
  if (n.includes('premium')) return '/desafio-logistico-premium.png';
  if (n.includes('logístico') || n.includes('logistico')) return '/desafio-logistico.png';
  if (n.includes('kids')) return '/desafio-kids.png';
  if (n.includes('professor')) return '/edicao-professor.png';
  return null;
};

const getProdutoDiferenciais = (nome: string): string[] => {
  const k = (nome || '').toLowerCase();
  if (k.includes('premium')) return ['Apresentação diferenciada', 'Ideal para eventos e premiações', 'Experiência educacional com acabamento superior', 'Mesma base pedagógica do Desafio Logístico'];
  if (k.includes('kids')) return ['Aprendizado divertido', 'Desenvolvimento lógico', 'Interação infantil', 'Estímulo criativo'];
  if (k.includes('logístico') || k.includes('logistico')) return ['Aprendizado prático', 'Estratégia e tomada de decisão', 'Aplicação educacional', 'Dinâmica em grupo'];
  if (k.includes('professor')) return ['Aplicação em sala de aula', 'Material de apoio educacional', 'Dinâmicas pedagógicas', 'Treinamentos e workshops'];
  return [];
};

const getProdutoConteudo = (nome: string): string[] => {
  const k = (nome || '').toLowerCase();
  if (k.includes('premium')) return ['Tabuleiro premium', 'Cartas operacionais premium', 'Peões personalizados', 'Dados', 'Manual especial do jogo', 'Caixa rígida premium'];
  if (k.includes('kids')) return ['Tabuleiro infantil', 'Cartas coloridas', 'Peças educativas', 'Manual infantil', 'Dinâmicas lúdicas'];
  if (k.includes('logístico') || k.includes('logistico')) return ['Tabuleiro premium', 'Cartas operacionais', 'Peões personalizados', 'Dados', 'Manual do jogo', 'Dinâmicas educacionais'];
  if (k.includes('professor')) return ['Material pedagógico', 'Cartas avançadas', 'Guia do educador', 'Dinâmicas em grupo', 'Aplicação em sala'];
  return [];
};

export function PrintView({ orcamento, clienteData }: PrintViewProps) {
  const produtoImagem = getProdutoImagem(orcamento.produto);
  const diferenciais = getProdutoDiferenciais(orcamento.produto);
  const conteudo = getProdutoConteudo(orcamento.produto);

  function extrairEnderecoDasObservacoes(texto?: string): string {
    if (!texto) return '';
    const match = texto.match(/Endereço de entrega:\s*(.*?)(?=\n|Forma de pagamento pretendida:|Embrulho para presente:|Observações do cliente:|$)/i);
    return match ? match[1].trim().replace(/\.$/, '') : '';
  }

  interface EnderecoParsed {
    rua?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidadeUF?: string;
    cep?: string;
  }

  function parseEnderecoLegacy(str: string): EnderecoParsed {
    if (!str) return {};
    let temp = str.replace(/- CEP /i, ',');
    const parts = temp.split(',').map(s => s.trim());
    if (parts.length >= 4) {
      return {
        rua: parts[0],
        numero: parts[1],
        bairro: parts[2],
        cidadeUF: parts[3],
        cep: parts.length > 4 ? parts[4] : ''
      };
    }
    return { rua: str };
  }

  let endEntrega: EnderecoParsed | null = null;
  const legacyEntregaStr = extrairEnderecoDasObservacoes(orcamento.observacoes);

  if (orcamento.cliente_logradouro) {
    endEntrega = {
      rua: orcamento.cliente_logradouro,
      numero: orcamento.cliente_numero || 'S/N',
      complemento: orcamento.cliente_complemento,
      bairro: orcamento.cliente_bairro,
      cidadeUF: `${orcamento.cliente_cidade || ''}/${orcamento.cliente_uf || ''}`.replace(/^\/|\/$/g, ''),
      cep: orcamento.cliente_cep
    };
  } else if (legacyEntregaStr) {
    endEntrega = parseEnderecoLegacy(legacyEntregaStr);
  } else if (orcamento.cliente_endereco_completo) {
    endEntrega = parseEnderecoLegacy(orcamento.cliente_endereco_completo);
  }

  let endCliente: EnderecoParsed | null = endEntrega;
  if (!endEntrega && clienteData?.endereco) {
    endCliente = {
      rua: clienteData.endereco,
      numero: clienteData.numero || 'S/N',
      complemento: clienteData.complemento,
      bairro: clienteData.bairro,
      cidadeUF: `${clienteData.cidade || ''}/${clienteData.estado || ''}`.replace(/^\/|\/$/g, ''),
      cep: clienteData.cep
    };
  }

  if (!endCliente) {
    endCliente = { cidadeUF: orcamento.cidade || (orcamento.cliente_cidade ? `${orcamento.cliente_cidade}/${orcamento.cliente_uf}`.replace(/^\/|\/$/g, '') : '') };
  }

  // Oculta bloco de entrega se for exatamente igual ao endereço do cliente
  if (endEntrega && endCliente && JSON.stringify(endEntrega) === JSON.stringify(endCliente)) {
    endEntrega = null;
  }

  const RenderAddressFields = ({ end }: { end: EnderecoParsed }) => {
    let enderecoLinha = '';
    if (end.rua) {
      enderecoLinha += end.rua;
      if (end.numero) {
        const numLimpo = end.numero.replace(/^(?:n[º°o]\.?|n[úu]mero)\s*/i, '').trim();
        enderecoLinha += `, nº ${numLimpo}`;
      }
      if (end.complemento) enderecoLinha += ` - ${end.complemento}`;
      if (end.bairro) enderecoLinha += ` - ${end.bairro}`;
    }

    const formatCep = (cep: string) => {
      if (!cep) return '';
      const clean = cep.replace(/\D/g, '');
      if (clean.length === 8) {
        return `${clean.slice(0, 5)}-${clean.slice(5)}`;
      }
      return cep;
    };

    return (
      <>
        {enderecoLinha && (
          <div className="print-field">
            <span className="print-label">Endereço:</span>
            <span className="print-value" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{enderecoLinha}</span>
          </div>
        )}
        {end.cidadeUF && end.cidadeUF !== '/' && (
          <div className="print-field">
            <span className="print-label">Cidade/UF:</span>
            <span className="print-value">{end.cidadeUF}</span>
          </div>
        )}
        {end.cep && (
          <div className="print-field">
            <span className="print-label">CEP:</span>
            <span className="print-value">{formatCep(end.cep)}</span>
          </div>
        )}
      </>
    );
  };

  const cleanObservacoes = (obs: string) => {
    if (!obs) return null;
    let clean = obs;
    // Tira os blocos sistêmicos indesejados
    clean = clean.replace(/Origem: Solicitação pública.*?(?=\n|$)/ig, '');
    clean = clean.replace(/Forma de pagamento pretendida:.*?(?=\n|$)/ig, '');
    clean = clean.replace(/Embrulho para presente:.*?(?=\n|$)/ig, '');
    clean = clean.replace(/Endereço de entrega:.*?(?=\n|$)/ig, '');
    clean = clean.replace(/Observações do cliente:\s*/ig, '');
    
    // Limpa quebras de linha múltiplas ou espaços finais
    clean = clean.replace(/\n{2,}/g, '\n').trim();
    
    return (!clean || clean === 'Nenhuma' || clean === 'Nenhuma.') ? null : clean;
  };

  const obsFiltrada = cleanObservacoes(orcamento.observacoes);
  return (
    <div id="print-area" className="print-area">
      {/* Watermark */}
      <div className="print-watermark" style={{ backgroundImage: 'url(' + '/logocircular.png' + ')' }} aria-hidden="true" />
      {/* Premium Header */}
      <div className="print-header-premium">
        <div className="print-header-top">
          <div className="print-header-logo-box">
            <img
              src={'/logocircular.png'}
              alt="FormaPlay"
              style={{
                width: '80px',
                height: '80px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
          <div className="print-header-title">
            <h1 className="print-company-title"><FormaPlayBrand /></h1>
            <p className="print-company-subtitle">Jogos Educacionais</p>
            <p className="print-company-tagline">Educação que Transforma</p>
          </div>
          <div className="print-header-numero">
            <div className="print-numero-banner">{orcamento.numero}</div>
            <p className="print-numero-label">Orçamento Nº</p>
          </div>
        </div>
        <div className="print-header-bottom">
          <div className="print-header-info">
            <span className="print-info-label">Data do Orçamento</span>
            <span className="print-info-value">{orcamento.data_orcamento}</span>
          </div>
          <div className="print-header-info">
            <span className="print-info-label">Validade</span>
            <span className="print-info-value">{orcamento.validade}</span>
          </div>
          <div className="print-header-info">
            <span className="print-info-label">Status</span>
            <span className="print-status-badge" data-status={(orcamento.status || 'Aberto').toLowerCase()}>{orcamento.status || 'Aberto'}</span>
          </div>
        </div>
      </div>

      <div className="print-divider-premium" />

      <div className="print-section">
        <h2 className="print-section-title">Dados do Cliente</h2>
        <div className="print-client-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr', gap: '4px 16px' }}>
          {/* Coluna 1: Documentos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="print-field">
              <span className="print-label">Razão Social:</span>
              <span className="print-value">{orcamento.cliente_razao_social || orcamento.cliente_nome || clienteData?.razao_social || clienteData?.nome || orcamento.cliente}</span>
            </div>
            {(orcamento.cliente_nome_fantasia || clienteData?.nome_fantasia) && (
              <div className="print-field">
                <span className="print-label">Nome Fantasia:</span>
                <span className="print-value">{orcamento.cliente_nome_fantasia || clienteData?.nome_fantasia}</span>
              </div>
            )}
            {(orcamento.cliente_documento || clienteData?.documento) && (
              <div className="print-field">
                <span className="print-label">CNPJ:</span>
                <span className="print-value">{orcamento.cliente_documento || clienteData?.documento}</span>
              </div>
            )}
            {(orcamento.cliente_inscricao_estadual || clienteData?.inscricao_estadual) && (
              <div className="print-field">
                <span className="print-label">Inscrição Estadual:</span>
                <span className="print-value">{orcamento.cliente_inscricao_estadual || clienteData?.inscricao_estadual}</span>
              </div>
            )}
          </div>

          {/* Coluna 2: Contato */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {(orcamento.cliente_contato_responsavel || clienteData?.contato_responsavel) && (
              <div className="print-field">
                <span className="print-label">Contato:</span>
                <span className="print-value">{orcamento.cliente_contato_responsavel || clienteData?.contato_responsavel}</span>
              </div>
            )}
            <div className="print-field">
              <span className="print-label">Telefone:</span>
              <span className="print-value">{orcamento.cliente_telefone || clienteData?.telefone || orcamento.telefone}</span>
            </div>
            <div className="print-field">
              <span className="print-label">E-mail:</span>
              <span className="print-value">{orcamento.cliente_email || clienteData?.email || orcamento.email}</span>
            </div>
          </div>
          
          {/* Coluna 3: Endereço */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {endCliente && <RenderAddressFields end={endCliente} />}
          </div>
        </div>
      </div>

      {/* Delivery */}
      {endEntrega && Object.keys(endEntrega).length > 0 && (
        <div className="print-section">
          <h2 className="print-section-title">Dados de Entrega</h2>
          <div className="print-client-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <RenderAddressFields end={endEntrega} />
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      <div className="print-section">
        <h2 className="print-section-title">Produtos / Serviços</h2>
        <table className="print-table">
          <thead>
            <tr>
              <th className="print-th print-th-left">Produto</th>
              <th className="print-th print-th-center">Qtd</th>
              <th className="print-th print-th-right">Valor Unit.</th>
              <th className="print-th print-th-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="print-td">{orcamento.produto}</td>
              <td className="print-td print-td-center">{orcamento.quantidade}</td>
              <td className="print-td print-td-right">{fmt(orcamento.valor_unitario)}</td>
              <td className="print-td print-td-right">{fmt(orcamento.subtotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Financial Summary */}
      <div className="print-summary-wrapper">
        {produtoImagem && (
          <div className="print-product-image-card">
            <h3 className="print-product-image-title">Imagem do Produto</h3>
            <div className="print-product-image-frame">
              <img src={produtoImagem} alt={orcamento.produto} className="print-product-image" />
            </div>
          </div>
        )}
        <div className="print-summary">
          <div className="print-summary-row">
            <span>Subtotal</span>
            <span>{fmt(orcamento.subtotal)}</span>
          </div>
          <div className="print-summary-row">
            <span>Frete</span>
            <span>+ {fmt(orcamento.frete)}</span>
          </div>
          <div className="print-summary-row">
            <span>Desconto</span>
            <span>- {fmt(orcamento.desconto)}</span>
          </div>
          <div className="print-summary-divider" />
          <div className="print-summary-total">
            <span>TOTAL</span>
            <span>{fmt(orcamento.total)}</span>
          </div>
        </div>
      </div>

      {/* Differentials */}
      {diferenciais.length > 0 && (
        <div className="print-section">
          <h2 className="print-section-title">Diferenciais do Produto</h2>
          <div className="print-diferenciais-grid">
            {diferenciais.map((item, idx) => (
              <div key={idx} className="print-diferenciais-item">
                <span className="print-diferenciais-check">&#10003;</span>
                <span className="print-diferenciais-text">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Box contents */}
      {conteudo.length > 0 && (
        <div className="print-section">
          <h2 className="print-section-title">Conteúdo da Caixa</h2>
          <div className="print-conteudo-grid">
            {conteudo.map((item, idx) => (
              <div key={idx} className="print-conteudo-item">
                <span className="print-conteudo-dot" />
                <span className="print-conteudo-text">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conditions */}
      <div className="print-section">
        <h2 className="print-section-title">Condições Comerciais</h2>
        <div className="print-conditions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
          
          {(() => {
            const clienteName = orcamento.cliente_razao_social || orcamento.cliente_nome || clienteData?.razao_social || clienteData?.nome || orcamento.cliente || '';
            const isInstitucional = /senac|senai|escola|faculdade|universidade|instituto|colegio|colégio|prefeitura/i.test(clienteName);
            
            const clearSenac = (text: string | null | undefined) => {
              if (!text) return '';
              if (/(senac|senai)/i.test(clienteName)) return text; 
              return text.replace(/do (SENAC|SENAI)/gi, 'da instituição').replace(/(SENAC|SENAI)/gi, 'instituição');
            };

            const getPagamento = () => {
              let pag = orcamento.pagamento === 'Personalizado' ? orcamento.forma_pagamento_personalizada : orcamento.pagamento;
              pag = clearSenac(pag);
              if (!pag || pag.trim() === '' || pag.toLowerCase() === 'a combinar') {
                return isInstitucional 
                  ? "Depósito bancário para 20/30 dias, conforme processo de pagamento da instituição."
                  : "Forma de pagamento conforme combinado com o cliente.";
              }
              return pag;
            };

            const getPrazoEntrega = () => {
              let prazo = clearSenac(orcamento.prazo_entrega);
              if (!prazo || prazo.trim() === '' || prazo.toLowerCase() === 'a combinar') {
                return "Até 15 dias úteis após confirmação do pedido.";
              }
              return prazo;
            };

            const getObsFrete = () => {
              let obs = clearSenac(orcamento.observacao_frete);
              if (!obs || obs.trim() === '') {
                return "Frete ou entrega conforme localidade informada e condição acordada no orçamento.";
              }
              return obs;
            };

            const getValidade = () => {
              let val = clearSenac(orcamento.validade);
              if (!val || val.trim() === '') val = "15 dias";
              // Impede duplicar a frase se já estiver salva
              if (val.includes('Valores válidos para as condições')) return val;
              return `${val}. Valores válidos para as condições descritas neste orçamento.`;
            };

            const condicoesPag = clearSenac(orcamento.condicoes_pagamento);
            const infoComp = clearSenac(orcamento.informacoes_complementares);
            const finalObs = clearSenac(obsFiltrada) || "Orçamento sujeito à confirmação de disponibilidade e condições comerciais no momento da aprovação.";

            return (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div className="print-field">
                    <span className="print-label">Prazo de Entrega:</span>
                    <span className="print-value">{getPrazoEntrega()}</span>
                  </div>
                  <div className="print-field">
                    <span className="print-label">Tipo de Frete:</span>
                    <span className="print-value">{orcamento.tipo_frete || 'A combinar'}</span>
                  </div>
                  <div className="print-field">
                    <span className="print-label">Observação sobre Frete:</span>
                    <span className="print-value">{getObsFrete()}</span>
                  </div>
                  <div className="print-field">
                    <span className="print-label">Forma de Pagamento:</span>
                    <span className="print-value">{getPagamento()}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div className="print-field">
                    <span className="print-label">Validade da Proposta:</span>
                    <span className="print-value">{getValidade()}</span>
                  </div>
                  <div className="print-field">
                    <span className="print-label">Frete:</span>
                    <span className="print-value">
                      {orcamento.frete_incluso 
                        ? 'Contemplado no valor total, sem cobrança em separado' 
                        : fmt(orcamento.frete)}
                    </span>
                  </div>
                  {orcamento.desconto > 0 && (
                    <div className="print-field">
                      <span className="print-label">Desconto:</span>
                      <span className="print-value">{fmt(orcamento.desconto)}</span>
                    </div>
                  )}
                  <div className="print-field">
                    <span className="print-label">Nota Fiscal:</span>
                    <span className="print-value">Sim, emitida pela FormaPlay Jogos Educacionais.</span>
                  </div>
                  {condicoesPag && (
                    <div className="print-field">
                      <span className="print-label">Condições de Pagamento:</span>
                      <span className="print-value print-value-observacoes">{condicoesPag}</span>
                    </div>
                  )}
                </div>

                {infoComp && (
                  <div className="print-field print-field-full" style={{ gridColumn: 'span 2', marginTop: '2px' }}>
                    <span className="print-label">Informações Complementares:</span>
                    <span className="print-value print-value-observacoes">{infoComp}</span>
                  </div>
                )}
                {finalObs && (
                  <div className="print-field print-field-full" style={{ gridColumn: 'span 2', marginTop: '2px' }}>
                    <span className="print-label">Observações:</span>
                    <span className="print-value print-value-observacoes">{finalObs}</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Signature */}
      <div className="print-signature">
        <div className="print-signature-line">
          <div className="print-sig-box">
            <div className="print-sig-empty" />
            <div className="print-sig-line" />
            <p>Assinatura do Cliente</p>
            <p>{orcamento.cliente}</p>
          </div>
          <div className="print-sig-box">
            <img src="/Assinatura Edson.png?v=2" alt="Assinatura" className="print-sig-image" />
            <div className="print-sig-line" />
            <p>Responsável</p>
            <p><FormaPlayBrand /> Jogos Educacionais</p>
          </div>
        </div>
      </div>


      {/* Footer */}
      <div className="print-footer">
        <div className="print-footer-line" />
        <div className="print-footer-card">
          <div className="print-footer-brand">
            <p className="print-footer-brand-name"><FormaPlayBrand /> Jogos Educacionais</p>
            <p className="print-footer-brand-tagline">Educação que transforma</p>
          </div>
          <div className="print-footer-divider-soft" />
          <div className="print-footer-content">
            <div className="print-footer-item">
              <span className="print-footer-icon-wrap">
                <Building2 className="print-footer-icon" />
              </span>
              <div className="print-footer-item-text">
                <span className="print-footer-label">CNPJ</span>
                <span className="print-footer-value">{EMPRESA.cnpj}</span>
              </div>
            </div>
            <div className="print-footer-item">
              <span className="print-footer-icon-wrap">
                <MessageCircle className="print-footer-icon" />
              </span>
              <div className="print-footer-item-text">
                <span className="print-footer-label">WhatsApp</span>
                <span className="print-footer-value">{EMPRESA.whatsapp}</span>
              </div>
            </div>
            <div className="print-footer-item">
              <span className="print-footer-icon-wrap">
                <Mail className="print-footer-icon" />
              </span>
              <div className="print-footer-item-text">
                <span className="print-footer-label">E-mail</span>
                <span className="print-footer-value">{EMPRESA.email}</span>
              </div>
            </div>
          </div>
        </div>
        <p className="print-footer-disclaimer">
          Orçamento comercial sem valor fiscal
        </p>
      </div>
    </div>
  );
}


