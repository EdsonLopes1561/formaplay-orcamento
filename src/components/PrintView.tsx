import { Orcamento, EMPRESA } from '../types';

interface PrintViewProps {
  orcamento: Orcamento;
}

const fmt = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function PrintView({ orcamento }: PrintViewProps) {
  return (
    <div id="print-area" className="print-area">
      {/* Premium Header */}
      <div className="print-header-premium">
        <div className="print-header-top">
          <div className="print-header-logo-box">
            <img src="/ChatGPT_Image_18_de_mai._de_2026,_22_43_59.png" alt="FormaPlay Logo" className="print-logo-premium" />
          </div>
          <div className="print-header-title">
            <h1 className="print-company-title">FormaPlay</h1>
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
            <span className="print-info-label">CNPJ</span>
            <span className="print-info-value">{EMPRESA.cnpj}</span>
          </div>
          <div className="print-header-info">
            <span className="print-info-label">Validade</span>
            <span className="print-info-value">{orcamento.validade}</span>
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
        <div className="print-summary">
          <div className="print-summary-row">
            <span>Subtotal</span>
            <span>{fmt(orcamento.subtotal)}</span>
          </div>
          <div className="print-summary-row">
            <span>Frete</span>
            <span>{fmt(orcamento.frete)}</span>
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
              <span className="print-value">{orcamento.observacoes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Signature */}
      <div className="print-signature">
        <div className="print-signature-line">
          <div className="print-sig-box">
            <div className="print-sig-line" />
            <p>Assinatura do Cliente</p>
            <p>{orcamento.cliente}</p>
          </div>
          <div className="print-sig-box">
            <div className="print-sig-line" />
            <p>Responsável FormaPlay</p>
            <p>{EMPRESA.nome}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="print-footer">
        <div className="print-footer-line" />
        <div className="print-footer-content">
          <div className="print-footer-left">
            <span className="print-footer-label">CNPJ:</span>
            <span className="print-footer-value">{EMPRESA.cnpj}</span>
          </div>
          <div className="print-footer-center">
            <span className="print-footer-label">WhatsApp:</span>
            <span className="print-footer-value">{EMPRESA.whatsapp}</span>
          </div>
          <div className="print-footer-right">
            <span className="print-footer-label">E-mail:</span>
            <span className="print-footer-value">{EMPRESA.email}</span>
          </div>
        </div>
        <p className="print-footer-disclaimer">
          Orçamento comercial sem valor fiscal
        </p>
      </div>
    </div>
  );
}
