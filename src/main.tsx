import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthWrapper } from './AuthWrapper';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthWrapper>
      <App />
    </AuthWrapper>
  </StrictMode>
);
