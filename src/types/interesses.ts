export type InteresseStatus = 'novo' | 'contatado' | 'em_validacao' | 'aguardando_lancamento' | 'convertido' | 'sem_interesse';

export interface InteresseModelo {
  id: string;
  nome: string;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  tipo_interessado: string | null;
  modelo_interesse: string;
  finalidade_uso: string | null;
  quantidade_estimada: number | null;
  interesse_personalizacao: string | null;
  observacoes: string | null;
  aceita_contato: boolean;
  origem: string;
  status: InteresseStatus;
  observacao_interna: string | null;
  created_at: string;
  updated_at: string;
  arquivado: boolean;
  arquivado_em: string | null;
  arquivado_por: string | null;
  motivo_arquivamento: string | null;
}

export type PerfilUsuario = 'administrador' | 'comercial' | 'producao';

export interface UsuarioApp {
  user_id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}
