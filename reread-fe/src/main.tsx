import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ReaderProvider } from './context/ReaderContext';
import './index.css';

// ── iOS PWA Viewport Height Fix ─────────────────────────────────────────────
// In iOS standalone (Add to Home Screen) mode, `100dvh` / `100vh` can be
// miscalculated by WKWebView, causing a gap below fixed elements.
// We measure window.innerHeight — which is ALWAYS correct — and expose it as
// the CSS variable --app-height. All full-screen containers use this instead.
function applyRealViewportHeight() {
  const h = window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${h}px`);
}
applyRealViewportHeight();
// Re-measure on resize (e.g. keyboard open/close, orientation change)
window.addEventListener('resize', applyRealViewportHeight);
// Also re-measure after a short delay on first load — iOS sometimes reports
// the wrong height before the PWA chrome fully settles.
setTimeout(applyRealViewportHeight, 100);
setTimeout(applyRealViewportHeight, 500);
// ────────────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ReaderProvider>
        <App />
      </ReaderProvider>
    </AuthProvider>
  </React.StrictMode>
);
