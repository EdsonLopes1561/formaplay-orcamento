import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { AuthWrapper } from './AuthWrapper';
import { SolicitacaoPublica } from './pages/SolicitacaoPublica';
import { AcompanhamentoPublico } from './pages/AcompanhamentoPublico';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/solicitar-orcamento" element={<SolicitacaoPublica />} />
        <Route path="/acompanhar-pedido/:token" element={<AcompanhamentoPublico />} />
        <Route path="*" element={
          <AuthWrapper>
            <App />
          </AuthWrapper>
        } />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
