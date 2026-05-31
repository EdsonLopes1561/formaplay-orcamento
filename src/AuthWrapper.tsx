import { useState, useEffect } from 'react';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('auth_session');
    if (session) {
      const sessionData = JSON.parse(session);
      const now = new Date().getTime();
      if (now < sessionData.expiresAt) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('auth_session');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    if (loginUsername === 'formaplay' && loginPassword === 'H@racio1561') {
      const expiresAt = new Date().getTime() + (30 * 24 * 60 * 60 * 1000); // 30 days
      localStorage.setItem('auth_session', JSON.stringify({ expiresAt }));
      setIsAuthenticated(true);
    } else {
      setLoginError('Usuário ou senha inválidos');
    }

    setLoginLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_session');
    setIsAuthenticated(false);
    setLoginUsername('');
    setLoginPassword('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="/logocircular.png"
                alt="FormaPlay"
                className="h-24 w-24 rounded-full border-4 border-green-400 shadow-lg"
              />
            </div>
            <h1 className="text-2xl font-bold text-blue-900">FormaPlay</h1>
            <p className="text-green-600 font-semibold">Jogos Educacionais</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuário</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                placeholder="Digite seu usuário"
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
              className="w-full bg-gradient-to-r from-blue-950 to-blue-900 text-white py-3 rounded-lg font-medium hover:from-blue-900 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loginLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
