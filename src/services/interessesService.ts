import { supabase } from '../supabase';
import { InteresseModelo, InteresseStatus } from '../types/interesses';

export type FiltroArquivado = 'ativos' | 'arquivados' | 'todos';

export const interessesService = {
  async listarInteresses(filtroArquivado: FiltroArquivado = 'ativos'): Promise<InteresseModelo[]> {
    let query = supabase
      .from('interesses_modelos')
      .select('*')
      .order('created_at', { ascending: false });

    if (filtroArquivado === 'ativos') {
      query = query.eq('arquivado', false);
    } else if (filtroArquivado === 'arquivados') {
      query = query.eq('arquivado', true);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data as InteresseModelo[];
  },

  async atualizarInteresse(
    id: string,
    status: InteresseStatus,
    observacaoInterna: string
  ): Promise<InteresseModelo> {
    const { data, error } = await supabase.rpc('atualizar_interesse_comercial', {
      p_interesse_id: id,
      p_status: status,
      p_observacao_interna: observacaoInterna || null,
    });

    if (error) {
      throw error;
    }

    return data as InteresseModelo;
  },

  async arquivarInteresse(id: string, motivo: string | null): Promise<InteresseModelo> {
    const { data, error } = await supabase.rpc('arquivar_interesse', {
      p_interesse_id: id,
      p_arquivar: true,
      p_motivo: motivo || null,
    });

    if (error) {
      throw error;
    }

    return data as InteresseModelo;
  },

  async restaurarInteresse(id: string): Promise<InteresseModelo> {
    const { data, error } = await supabase.rpc('arquivar_interesse', {
      p_interesse_id: id,
      p_arquivar: false,
      p_motivo: null,
    });

    if (error) {
      throw error;
    }

    return data as InteresseModelo;
  },

  async excluirInteresseDefinitivamente(id: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('excluir_interesse_definitivamente', {
      p_interesse_id: id,
    });

    if (error) {
      throw error;
    }

    return data as boolean;
  },

  async inserirInteresse(dados: Partial<InteresseModelo>): Promise<InteresseModelo> {
    const { data, error } = await supabase
      .from('interesses_modelos')
      .insert(dados)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as InteresseModelo;
  }
};
