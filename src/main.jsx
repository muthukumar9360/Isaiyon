import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// In development, ensure no stale service worker intercepts live reload
if (import.meta.env.DEV && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.unregister();
    }
  });
} else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Check for updates every time app is opened / brought to foreground
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.ready.then((reg) => {
        reg.update();
      }).catch(() => {});
    }
  });

  // Automatically refresh with new version once the new Service Worker activates, unless an audio track is active (playing or paused)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      const audioEl = document.querySelector('audio');
      const hasActiveTrack = Boolean(
        (audioEl && audioEl.src && audioEl.src !== '' && !audioEl.ended) ||
        (window.__isaiyonAudio && window.__isaiyonAudio.src && window.__isaiyonAudio.src !== '' && !window.__isaiyonAudio.ended) ||
        window.__isaiyonHasTrack
      );
      if (!hasActiveTrack) {
        refreshing = true;
        window.location.reload();
      }
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
