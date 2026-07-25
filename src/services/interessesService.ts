import { supabase } from '../supabase';
import { InteresseModelo, InteresseStatus } from '../types/interesses';

export const interessesService = {
  async listarInteresses(): Promise<InteresseModelo[]> {
    const { data, error } = await supabase
      .from('interesses_modelos')
      .select('*')
      .order('created_at', { ascending: false });

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
    // Utilizamos a RPC criada que atende tanto Admin quanto Comercial
    // A RPC limita os campos e valida o perfil internamente via SECURITY DEFINER.
    const { data, error } = await supabase.rpc('atualizar_interesse_comercial', {
      p_interesse_id: id,
      p_status: status,
      p_observacao_interna: observacaoInterna || null, // null check se vazio
    });

    if (error) {
      throw error;
    }

    return data as InteresseModelo;
  },
};
