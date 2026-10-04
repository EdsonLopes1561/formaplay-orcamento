import { useSearchParams } from 'react-router-dom';
import { PrintView } from '../components/PrintView';
import { ConfirmacaoCompraView } from '../components/ConfirmacaoCompraView';
import { Orcamento } from '../types';

export const SCENARIO_A: Orcamento = {
  id: 'scen-a',
  numero: 'ORC-2026-001',
  cliente: 'Escola Pequenos Passos',
  telefone: '(11) 98765-4321',
  cidade: 'São Paulo/SP',
  email: 'contato@pequenospassos.com.br',
  produto: 'Desafio Logístico',
  quantidade: 1,
  valor_unitario: 299.90,
  frete: 0,
  desconto: 0,
  subtotal: 299.90,
  total: 299.90,
  prazo_entrega: 'Até 10 dias úteis',
  validade: '15 dias',
  pagamento: 'PIX ou Boleto Bancário',
  tipo_frete: 'A combinar',
  frete_incluso: false,
  observacao_frete: 'A combinar com o cliente após fechamento.',
  observacoes: '',
  data_orcamento: '03/10/2026',
  status: 'Aberto',
  cliente_nome: 'Escola Pequenos Passos',
  cliente_documento: '45.123.890/0001-12',
  cliente_cidade: 'São Paulo',
  cliente_uf: 'SP',
  token_publico: 'token-scen-a-12345678',
};

export const SCENARIO_B: Orcamento = {
  id: 'scen-b',
  numero: 'ORC-2026-002',
  cliente: 'Associação Beneficente de Ensino Integrado e Inovação Pedagógica',
  telefone: '(11) 99123-4567',
  cidade: 'São Paulo/SP',
  email: 'diretoria@ensinopedagogico.org.br',
  produto: 'Desafio Logístico',
  quantidade: 2,
  valor_unitario: 299.90,
  frete: 45.00,
  desconto: 0,
  subtotal: 599.80,
  total: 644.80,
  prazo_entrega: '7 a 12 dias úteis',
  validade: '20 dias',
  pagamento: 'Boleto Bancário 30 dias',
  tipo_frete: 'Transportadora Jadlog',
  frete_incluso: false,
  observacao_frete: 'Entrega em horário comercial na recepção do bloco A.',
  observacoes: 'Entregar aos cuidados do setor de recepção de materiais pedagógicos.',
  data_orcamento: '03/10/2026',
  status: 'Enviado',
  cliente_razao_social: 'Associação Beneficente de Ensino Integrado e Inovação Pedagógica',
  cliente_nome_fantasia: 'Colégio Nova Fronteira',
  cliente_documento: '12.345.678/0001-90',
  cliente_contato_responsavel: 'Dra. Maria Fernanda de Albuquerque Silveira',
  cliente_logradouro: 'Avenida Brigadeiro Faria Lima',
  cliente_numero: '3477',
  cliente_complemento: 'Bloco A, 14º andar, Conjuntos 142 e 144 - Edifício Faria Lima Corporate Tower',
  cliente_bairro: 'Itaim Bibi',
  cliente_cidade: 'São Paulo',
  cliente_uf: 'SP',
  cliente_cep: '04538-133',
  token_publico: 'token-scen-b-87654321',
};

export const SCENARIO_C: Orcamento = {
  id: 'scen-c',
  numero: 'ORC-2026-003',
  cliente: 'Instituto Educacional Saber & Crescer',
  telefone: '(21) 98888-7777',
  cidade: 'Rio de Janeiro/RJ',
  email: 'compras@sabercrescer.edu.br',
  produto: 'Desafio Logístico',
  quantidade: 1,
  valor_unitario: 307.69,
  frete: 0,
  desconto: 0,
  subtotal: 307.69,
  total: 307.69,
  prazo_entrega: 'Até 15 dias úteis',
  validade: '15 dias',
  pagamento: 'Cartão de crédito',
  tipo_frete: 'A combinar',
  frete_incluso: false,
  observacao_frete: 'Frete a combinar após confirmação.',
  condicoes_pagamento: 'Parcelamento: 3x de R$ 110,27\nTotal no cartão: R$ 330,81',
  observacoes: 'Cliente solicitou parcelamento em 3x no cartão de crédito.',
  data_orcamento: '03/10/2026',
  status: 'Aberto',
  cliente_nome: 'Instituto Educacional Saber & Crescer',
  cliente_documento: '28.987.654/0001-33',
  cliente_cidade: 'Rio de Janeiro',
  cliente_uf: 'RJ',
  cliente_cep: '22041-001',
  token_publico: 'token-scen-c-33333333',
};

export const SCENARIO_D: Orcamento = {
  id: 'scen-d',
  numero: 'ORC-2026-004',
  cliente: 'Complexo Educacional Vale do Saber Ltda',
  telefone: '(31) 97654-3210',
  cidade: 'Belo Horizonte/MG',
  email: 'pedagogico@valedosaber.com.br',
  produto: 'Desafio Logístico',
  quantidade: 3,
  valor_unitario: 299.90,
  frete: 65.00,
  desconto: 29.70,
  subtotal: 899.70,
  total: 935.00,
  prazo_entrega: '15 a 20 dias úteis após confirmação formal',
  validade: '30 dias',
  pagamento: 'Boleto faturado em 2 parcelas (30 e 60 dias)',
  tipo_frete: 'Transportadora Especializada com rastreamento',
  frete_incluso: false,
  observacao_frete: 'Frete compartilhado com seguro de carga e entrega agendada.',
  condicoes_pagamento: 'Faturamento direto para instituição de ensino com emissão de nota fiscal eletrônica. Pagamento via boleto bancário 30/60 DDL.',
  informacoes_complementares: 'Garantia integral de 90 dias contra defeitos de fabricação. Suporte técnico-pedagógico para mediação em sala de aula durante o ano letivo. Peças de reposição disponíveis para envio em até 48h.',
  observacoes: 'Orçamento contempla treinamento online de 1h para os professores aplicadores. O material deve ser conferido no ato da entrega e armazenado em local seco e arejado conforme orientações do manual.',
  data_orcamento: '03/10/2026',
  status: 'Enviado',
  cliente_razao_social: 'Complexo Educacional Vale do Saber Ltda',
  cliente_nome_fantasia: 'Colégio Vale do Saber',
  cliente_documento: '33.444.555/0001-66',
  cliente_contato_responsavel: 'Prof. Carlos Eduardo Mendonça (Coordenação de Projetos)',
  cliente_logradouro: 'Rua dos Inconfidentes',
  cliente_numero: '1205',
  cliente_complemento: 'Prédio Central, Sala da Coordenação Pedagógica do Ensino Médio',
  cliente_bairro: 'Savassi',
  cliente_cidade: 'Belo Horizonte',
  cliente_uf: 'MG',
  cliente_cep: '30140-120',
  token_publico: 'token-scen-d-44444444',
};

export function TestPrintScenarios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scenarioKey = (searchParams.get('scenario') || 'A').toUpperCase();
  const mode = searchParams.get('mode') || 'orcamento';

  const scenarios: Record<string, Orcamento> = {
    A: SCENARIO_A,
    B: SCENARIO_B,
    C: SCENARIO_C,
    D: SCENARIO_D,
  };

  const orcamento = scenarios[scenarioKey] || SCENARIO_A;

  return (
    <div className="bg-[#334155] min-h-screen py-4 print:bg-white print:p-0 print:m-0 print:min-h-0">
      {/* Controles de visualização na tela (ocultos na impressão) */}
      <div className="no-print print-hidden print:hidden" style={{
        maxWidth: '210mm',
        margin: '0 auto 16px',
        padding: '12px 16px',
        background: '#1e293b',
        borderRadius: '8px',
        color: '#f8fafc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Cenário:</span>
          {(['A', 'B', 'C', 'D'] as const).map(sc => (
            <button
              key={sc}
              onClick={() => setSearchParams({ scenario: sc, mode })}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '13px',
                background: scenarioKey === sc ? '#2563eb' : '#334155',
                color: '#fff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {sc}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setSearchParams({ scenario: scenarioKey, mode: 'orcamento' })}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: mode === 'orcamento' ? 'bold' : 'normal',
              background: mode === 'orcamento' ? '#059669' : '#334155',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Orçamento
          </button>
          <button
            onClick={() => setSearchParams({ scenario: scenarioKey, mode: 'confirmacao' })}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: mode === 'confirmacao' ? 'bold' : 'normal',
              background: mode === 'confirmacao' ? '#059669' : '#334155',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Confirmação de Compra
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Área de Impressão Renderizada */}
      <div className="flex justify-center print:block print:p-0 print:m-0">
        {mode === 'orcamento' ? (
          <PrintView orcamento={orcamento} />
        ) : (
          <ConfirmacaoCompraView orcamento={orcamento} />
        )}
      </div>
    </div>
  );
}
