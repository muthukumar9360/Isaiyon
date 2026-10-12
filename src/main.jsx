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

  // Automatically refresh with new version once the new Service Worker activates, unless audio is playing
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      const isAudioActive = document.querySelector('audio')?.paused === false;
      if (!isAudioActive) {
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
