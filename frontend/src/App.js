import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import AppRouter from './Router.js';
import './app.scss';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <WebSocketProvider>
          <AppRouter />
        </WebSocketProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}

function initApp() {
  const container = document.getElementById('root');
  const root = createRoot(container);
  root.render(
    <App />
  );
}

initApp();

export default App;
