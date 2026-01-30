import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Injeção de Estilos Globais
const injectStyles = () => {
  if (document.getElementById('squad-styles')) return;
  const style = document.createElement('style');
  style.id = 'squad-styles';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Bungee&family=Inter:wght@400;500;600;700;800&display=swap');
    :root {
      --primary: #3B82F6;
      --bg-main: #0A0F1E;
    }
    body { 
      font-family: 'Inter', sans-serif; 
      background-color: var(--bg-main); 
      margin: 0; 
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }
    .font-bungee { font-family: 'Bungee', cursive; }
    .glass { backdrop-filter: blur(12px); background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    
    @keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .animate-pop-in { animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    
    .neo-glow-blue { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
  `;
  document.head.appendChild(style);
};

const renderApp = () => {
  const container = document.getElementById('root');
  if (container) {
    injectStyles();
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // Remove o loader assim que o React começar a trabalhar
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    }
  }
};

// Inicialização segura
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  renderApp();
} else {
  document.addEventListener('DOMContentLoaded', renderApp);
}