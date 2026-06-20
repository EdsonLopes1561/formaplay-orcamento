import { Orcamento, EMPRESA } from '../types';
import { Building2, MessageCircle, Mail } from 'lucide-react';
import { FormaPlayBrand } from './FormaPlayBrand';


interface PrintViewProps {
  orcamento: Orcamento;
}

const fmt = (val: number | string | null | undefined) => {
  const n = Number(val) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getProdutoImagem = (nome: string): string | null => {
  const n = (nome || '').toLowerCase();
  if (n.includes('logístico') || n.includes('logistico')) return '/desafio-logistico.png';
  if (n.includes('kids')) return '/desafio-kids.png';
  if (n.includes('professor')) return '/edicao-professor.png';
  return null;
};

const getProdutoDiferenciais = (nome: string): string[] => {
  const k = (nome || '').toLowerCase();
  if (k.includes('kids')) return ['Aprendizado divertido', 'Desenvolvimento lógico', 'Interação infantil', 'Estímulo criativo'];
  if (k.includes('logístico') || k.includes('logistico')) return ['Aprendizado prático', 'Estratégia e tomada de decisão', 'Aplicação educacional', 'Dinâmica em grupo'];
  if (k.includes('professor')) return ['Aplicação em sala de aula', 'Material de apoio educacional', 'Dinâmicas pedagógicas', 'Treinamentos e workshops'];
  return [];
};

const getProdutoConteudo = (nome: string): string[] => {
  const k = (nome || '').toLowerCase();
  if (k.includes('kids')) return ['Tabuleiro infantil', 'Cartas coloridas', 'Peças educativas', 'Manual infantil', 'Dinâmicas lúdicas'];
  if (k.includes('logístico') || k.includes('logistico')) return ['Tabuleiro premium', 'Cartas operacionais', 'Peões personalizados', 'Dados', 'Manual do jogo', 'Dinâmicas educacionais'];
  if (k.includes('professor')) return ['Material pedagógico', 'Cartas avançadas', 'Guia do educador', 'Dinâmicas em grupo', 'Aplicação em sala'];
  return [];
};

export function PrintView({ orcamento }: PrintViewProps) {
  const produtoImagem = getProdutoImagem(orcamento.produto);
  const diferenciais = getProdutoDiferenciais(orcamento.produto);
  const conteudo = getProdutoConteudo(orcamento.produto);
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
            <span className="print-info-value" style={{ textTransform: 'uppercase', color: orcamento.status === 'Aprovado' ? '#166534' : 'inherit' }}>{orcamento.status || 'Aberto'}</span>
          </div>
        </div>
      </div>

      <div className="print-divider-premium" />

      {/* Client */}
      <div className="print-section">
        <h2 className="print-section-title">Dados do Cliente</h2>
        <div className="print-client-grid">
          <div className="print-field">
            <span className="print-label">Cliente:</span>
            <span className="print-value">{orcamento.cliente}</span>
          </div>
          <div className="print-field">
            <span className="print-label">Telefone:</span>
            <span className="print-value">{orcamento.telefone}</span>
          </div>
          <div className="print-field">
            <span className="print-label">Cidade/UF:</span>
            <span className="print-value">{orcamento.cidade}</span>
          </div>
          <div className="print-field">
            <span className="print-label">E-mail:</span>
            <span className="print-value">{orcamento.email}</span>
          </div>
        </div>
      </div>

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
        <div className="print-conditions-grid">
          <div className="print-field">
            <span className="print-label">Prazo de Entrega:</span>
            <span className="print-value">{orcamento.prazo_entrega}</span>
          </div>
          <div className="print-field">
            <span className="print-label">Validade:</span>
            <span className="print-value">{orcamento.validade}</span>
          </div>
          <div className="print-field print-field-full">
            <span className="print-label">Forma de Pagamento:</span>
            <span className="print-value">{orcamento.pagamento}</span>
          </div>
          {orcamento.observacoes && (
            <div className="print-field print-field-full">
              <span className="print-label">Observações:</span>
              <span className="print-value print-value-observacoes">{orcamento.observacoes}</span>
            </div>
          )}
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


