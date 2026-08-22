export type ResolucaoGeografica = 'estruturado' | 'legado-extraido' | 'legado-unico' | 'nao-resolvido' | 'internacional';

export interface PresencaCidade {
  key: string;

  pais: string | null;
  estado: string | null;
  cidade: string | null;

  codigoIbge?: string;
  lat?: number;
  lng?: number;

  vendas: number;
  orcamentos: number;
  solicitacoes: number;
  interesses: number;

  totalSinais: number;

  resolucao: ResolucaoGeografica;
}
