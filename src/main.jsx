import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Global uncaught error listener to display any startup/runtime crashes visually instead of blank screen
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Global Error caught:', event.error || event.message);
    const root = document.getElementById('root');
    if (root && (!root.innerHTML || root.innerHTML.trim() === '')) {
      root.innerHTML = `
        <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;background:#ffffff;color:#0f172a;font-family:sans-serif;text-align:center;">
          <h2 style="font-size:18px;font-weight:800;margin-bottom:8px;">App Launch Error</h2>
          <p style="font-size:12px;color:#64748b;margin-bottom:16px;max-width:320px;word-break:break-all;">${event.message || 'An error occurred while loading.'}</p>
          <button onclick="try{localStorage.clear();sessionStorage.clear();if('caches' in window){caches.keys().then(k=>Promise.all(k.map(c=>caches.delete(c))));}}catch(e){}location.reload();" style="padding:10px 20px;background:#0f172a;color:#fff;border:none;border-radius:9999px;font-weight:700;font-size:13px;cursor:pointer;">
            Clear Cache & Restart
          </button>
        </div>
      `;
    }
  });
}

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('React Crash Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#ffffff', color: '#0f172a', fontFamily: 'sans-serif', textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16, maxWidth: 320, wordBreak: 'break-all' }}>
            {this.state.error?.message || String(this.state.error)}
          </p>
          <button 
            onClick={() => {
              try {
                localStorage.clear();
                sessionStorage.clear();
                if ('caches' in window) {
                  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
                }
              } catch (_) {}
              window.location.reload();
            }}
            style={{ padding: '10px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 9999, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Clear Cache & Restart
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)
