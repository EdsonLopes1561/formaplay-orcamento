import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { UsuarioApp } from './types/interesses';

interface AuthContextData {
  user: any | null;
  usuarioApp: UsuarioApp | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const useAuth = () => useContext(AuthContext);

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [usuarioApp, setUsuarioApp] = useState<UsuarioApp | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Usado para saber se já estamos autenticados com este usuário e evitar recargas duplas
  const currentUserRef = useRef<string | null>(null);

  useEffect(() => {
    currentUserRef.current = user?.id || null;
  }, [user]);

  useEffect(() => {
    let mounted = true;

    async function carregarSessao() {
      setIsLoading(true);
      setLoginError('');

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (!session) {
          if (mounted) {
            setUser(null);
            setUsuarioApp(null);
            setIsLoading(false);
          }
          return;
        }

        const authUser = session.user;

        const { data: userData, error: userError } = await supabase
          .from('usuarios_app')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (userError) throw userError;

        if (!userData || !userData.ativo) {
          await supabase.auth.signOut();
          if (mounted) {
            setUser(null);
            setUsuarioApp(null);
            setLoginError(userData ? 'Conta inativa. Acesso negado.' : 'Acesso negado: Perfil não encontrado.');
            setIsLoading(false);
          }
          return;
        }

        if (mounted) {
          setUser(authUser);
          setUsuarioApp(userData as UsuarioApp);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("Erro na autenticação:", err);
        await supabase.auth.signOut();
        if (mounted) {
          setUser(null);
          setUsuarioApp(null);
          setLoginError('Erro de conexão ao validar perfil.');
          setIsLoading(false);
        }
      }
    }

    carregarSessao();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null);
          setUsuarioApp(null);
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_IN') {
        // Se o mesmo usuário já estiver em memória, ignora (evita recarga pesada ao voltar para aba)
        if (session && currentUserRef.current === session.user.id) {
          return;
        }
        carregarSessao();
      }
      // Outros eventos como TOKEN_REFRESHED, INITIAL_SESSION, USER_UPDATED
      // são ignorados para não desmontar o App. Apenas a SDK atualiza em segundo plano.
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setLoginError(error.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos' : 'Erro ao fazer login. Verifique suas credenciais.');
      setLoginLoading(false);
    }
    // Se não der erro, o onAuthStateChange vai capturar o evento de SIGN_IN 
    // e o `carregarSessao` será disparado, resolvendo o state.
    // O loading principal voltará para true durante o carregamento.
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setUsuarioApp(null);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-gray-600 font-medium">Verificando acesso...</div>
      </div>
    );
  }

  if (!user || !usuarioApp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="/logocircular.png"
                alt="FormaPlay"
                className="h-24 w-24 rounded-full border-4 border-green-400 shadow-lg object-contain bg-white"
              />
            </div>
            <h1 className="text-2xl font-bold text-blue-900">FormaPlay</h1>
            <p className="text-green-600 font-semibold">Painel Administrativo</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                placeholder="Digite seu e-mail"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                placeholder="Digite sua senha"
                required
              />
            </div>
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-blue-950 to-blue-900 text-white py-3 rounded-lg font-medium hover:from-blue-900 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loginLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loginLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, usuarioApp, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
