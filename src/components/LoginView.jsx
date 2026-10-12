import React, { useState, useEffect } from 'react';
import { 
  LogIn, 
  Loader2, 
  AlertTriangle, 
  X, 
  Music2, 
  Heart, 
  ListMusic, 
  History, 
  Download, 
  Sparkles, 
  Smartphone, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  ChevronRight, 
  Info,
  Radio,
  ExternalLink
} from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signInWithRedirect } from '../firebase/config';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

function getAuthErrorMessage(err) {
  const currentHost = window.location.hostname;
  switch (err.code) {
    case 'auth/unauthorized-domain':
      return {
        title: 'Unauthorized Domain',
        message: `Your current domain ("${currentHost}") is not in Firebase's Authorized Domains list.`,
        solution: `Open Firebase Console → Authentication → Settings → Authorized domains → Add "${currentHost}".`
      };
    case 'auth/operation-not-allowed':
      return {
        title: 'Google Sign-In Disabled',
        message: 'Google Sign-In provider is not enabled in your Firebase project.',
        solution: 'Open Firebase Console → Authentication → Sign-in method → Click Google → Enable & Save.'
      };
    case 'auth/popup-blocked':
      return {
        title: 'Popup Blocked',
        message: 'Your browser blocked the Google sign-in popup.',
        solution: 'Use the Redirect Sign-In option below, or allow popups for this site.'
      };
    case 'auth/popup-closed-by-user':
      return {
        title: 'Sign-In Cancelled',
        message: 'The sign-in window was closed before completion.',
        solution: 'Click Continue with Google to try again.'
      };
    case 'auth/cancelled-popup-request':
      return null;
    case 'auth/network-request-failed':
      return {
        title: 'Network Error',
        message: 'Unable to reach authentication servers.',
        solution: 'Check your internet connection and try again.'
      };
    default:
      return {
        title: 'Sign-In Failed',
        message: err.message || 'An error occurred during authentication.',
        solution: `Error code: ${err.code || 'unknown'}`
      };
  }
}

export default function LoginView({ isStandalone = false, onInstallApp }) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authErrorInfo, setAuthErrorInfo] = useState(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);

  // Reliable dynamic detection of standalone PWA vs browser access
  const [internalStandalone, setInternalStandalone] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      isStandalone ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  });

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = Boolean(
        isStandalone ||
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://')
      );
      setInternalStandalone(standalone);
    };

    checkStandalone();
    const mql = window.matchMedia('(display-mode: standalone)');
    mql.addEventListener?.('change', checkStandalone);
    return () => mql.removeEventListener?.('change', checkStandalone);
  }, [isStandalone]);

  const effectiveStandalone = Boolean(isStandalone || internalStandalone);

  const handleInstallClick = () => {
    if (onInstallApp) {
      onInstallApp();
    } else {
      setShowInstallGuide(true);
    }
  };

  const handleGoogleSignIn = async (useRedirect = false) => {
    setIsSigningIn(true);
    setAuthErrorInfo(null);
    try {
      if (useRedirect) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (popupErr) {
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
          console.warn('Popup blocked, attempting redirect sign-in...');
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw popupErr;
      }
    } catch (err) {
      console.error('Google Sign-in error:', err);
      const info = getAuthErrorMessage(err);
      if (info) {
        setAuthErrorInfo(info);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900 flex flex-col justify-between items-center px-4 py-6 pb-10 select-none relative overflow-hidden">
      {/* Soft Background Radial Lighting Shadows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-black/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 -right-20 w-80 h-80 bg-slate-900/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header / Brand + Smart Dynamic Right Action */}
      <header className="w-full max-w-sm flex items-center justify-between pt-1 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-md shadow-black/10 border border-slate-200">
            <img 
              src="/logo.png" 
              alt="Isaiyon" 
              className="w-full h-full object-fit rounded-xl" 
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black tracking-tight text-slate-900 font-display">Isaiyon</span>
            <span className="text-[11px] font-extrabold text-slate-700 tracking-wider uppercase">Sound Vault</span>
          </div>
        </div>

        {/* Header Right: Always show Install button in Web access, but in PWA access hide it and use space efficiently */}
        {!effectiveStandalone ? (
          <button
            type="button"
            onClick={handleInstallClick}
            className="py-1.5 px-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md shadow-slate-900/10 active:scale-95 transition-all cursor-pointer border border-slate-700 hover:border-amber-400 group"
            title="Install Isaiyon Web App"
          >
            <Download size={14} className="text-amber-400 group-hover:translate-y-0.5 transition-transform" />
            <span>Install App</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowPwaModal(true)}
            className="py-1.5 px-3 rounded-full bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-300 text-emerald-900 flex items-center gap-2 shadow-2xs transition-all active:scale-95 cursor-pointer group"
            title="PWA App Mode is Active • Tap for details"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[10px] font-black text-slate-900 flex items-center gap-1">
                <Sparkles size={10} className="text-amber-600 group-hover:rotate-12 transition-transform" />
                <span>App Mode</span>
              </span>
              <span className="text-[8px] font-bold text-emerald-700">Studio Master</span>
            </div>
          </button>
        )}
      </header>

      {/* Center Hero: Vinyl record artwork centerpiece */}
      <div className="w-full max-w-sm flex flex-col items-center text-center z-10 my-auto py-2">
        <div className="relative w-48 h-48 sm:w-52 sm:h-52 mb-6">
          {/* Outer Black Shadow Aura Ring */}
          <div className="absolute -inset-2 rounded-full bg-slate-900/10 blur-xl opacity-50 animate-pulse" />
          
          {/* Vinyl Disc Outer Rim in Clean White & Black Shadow Theme */}
          <div className="relative w-full h-full rounded-full bg-white p-2 shadow-2xl shadow-black border border-slate-200 flex items-center justify-center">
            <div 
              className="w-full h-full rounded-full overflow-hidden relative border-2 border-slate-800 shadow-inner bg-slate-950"
              style={{ animation: 'spinDisc 18s linear infinite' }}
            >
              <img 
                src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400" 
                alt="Vinyl Record" 
                className="w-full h-full object-cover rounded-full opacity-100"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = FALLBACK_ARTWORK;
                }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-4 border-slate-900 shadow-md" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight font-display">
          Your Personal <span className="text-slate-900">Music Vault</span>
        </h1>
        <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed font-medium">
          Sign in to stream Tamil soundtracks, curate personal playlists, and sync listening history across devices.
        </p>

        {/* Action Section: Google Sign In + Smart Dynamic Action Slot */}
        <div className="w-full flex flex-col gap-2 pt-5 z-10">
          <button
            disabled={isSigningIn}
            onClick={() => handleGoogleSignIn(false)}
            className={`w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 shadow-md shadow-slate-900/5 text-slate-900 font-extrabold text-base flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] transition-all ${
              isSigningIn ? 'opacity-80 cursor-wait' : ''
            }`}
          >
            {isSigningIn ? (
              <>
                <Loader2 size={22} className="animate-spin text-amber-600" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Dynamic Smart Slot: In Web mode, promote install. In PWA mode, highlight native engine perks */}
          {!effectiveStandalone ? (
            <div 
              onClick={handleInstallClick}
              className="w-full p-2.5 rounded-2xl bg-amber-500/10 border border-amber-300/80 hover:bg-amber-500/15 flex items-center justify-between gap-2.5 cursor-pointer transition-all active:scale-[0.99] group shadow-2xs text-left"
              title="Install Isaiyon for Full App Features"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <Download size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1">
                    <span>Install App for Full Sound</span>
                    <Sparkles size={11} className="text-amber-600 shrink-0" />
                  </div>
                  <div className="text-[10px] font-medium text-slate-600 truncate">
                    Lockscreen controls, background play & zero latency
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-amber-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          ) : (
            <div 
              onClick={() => setShowPwaModal(true)}
              className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-slate-50 border border-emerald-300/80 hover:border-emerald-400 flex items-center justify-between gap-2.5 cursor-pointer transition-all active:scale-[0.99] group shadow-2xs text-left"
              title="PWA Native Features are Active • Tap for details"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <Zap size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1">
                    <span>Native Sound Engine Active</span>
                    <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                  </div>
                  <div className="text-[10px] font-medium text-slate-600 truncate">
                    Background audio • Floating PiP • High-speed vault
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300 shrink-0">
                Active
              </span>
            </div>
          )}
        </div>

        {/* Feature Highlights Grid in Clean White Style */}
        <div className="grid grid-cols-2 gap-2.5 w-full mt-4 text-left px-1">
          <div className="p-2.5 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Music2 size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-900 truncate">Full Playback</div>
              <div className="text-[9px] text-slate-500 truncate">High-fidelity audio</div>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <Heart size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-900 truncate">Liked Songs</div>
              <div className="text-[9px] text-slate-500 truncate">Cloud-synced list</div>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
              <ListMusic size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-900 truncate">Custom Playlists</div>
              <div className="text-[9px] text-slate-500 truncate">Create & organize</div>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <History size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-900 truncate">History & Memory</div>
              <div className="text-[9px] text-slate-500 truncate">Remembers last track</div>
            </div>
          </div>
        </div>

        <p className="text-[10px] mt-3 text-slate-500 text-center font-medium">
          Sign-in securely syncs your favorites and playlists to Google Firebase.
        </p>

        {/* Developer Credit & Copyright */}
        <div className="mt-3 pt-2.5 border-t border-slate-200/70 w-full text-center flex flex-col items-center gap-0.5">
          <p className="text-[11px] font-semibold text-slate-700">
            Developed by <span className="font-bold text-slate-900">Muthukumar</span> (
            <a 
              href="https://github.com/muthukumar9360" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-amber-600 font-bold hover:underline"
            >
              @muthukumar9360
            </a>)
          </p>
          <p className="text-[9px] text-slate-400 font-mono tracking-wider">
            © {new Date().getFullYear()} Isaiyon — Pure Sound Vault
          </p>
        </div>
      </div>

      {/* 1. Modal: Web Installation Guide (For Web Access) */}
      {showInstallGuide && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-[modalPop_0.2s_ease-out]"
          onClick={() => setShowInstallGuide(false)}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl relative border border-slate-100 flex flex-col gap-4 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 text-amber-600">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <Download size={22} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Install Isaiyon App
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Instant full-screen native experience
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 text-xs text-slate-700 font-medium">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <strong className="block text-slate-900 font-bold mb-0.5">Android / Chrome:</strong>
                  Tap the three dots menu (<strong>⋮</strong>) in the top-right corner, then tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <strong className="block text-slate-900 font-bold mb-0.5">iPhone / iPad (Safari):</strong>
                  Tap the <strong>Share button</strong> (square with arrow up) at the bottom, then scroll down and tap <strong>"Add to Home Screen"</strong>.
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <strong className="block text-slate-900 font-bold mb-0.5">Desktop Chrome / Edge:</strong>
                  Click the <strong>Install icon</strong> inside the address bar next to the URL.
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              {onInstallApp && (
                <button
                  type="button"
                  onClick={() => {
                    setShowInstallGuide(false);
                    onInstallApp();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Download size={14} className="text-amber-400" />
                  <span>Try Install Prompt</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: PWA Mode Perks (When Opened in Installed PWA) */}
      {showPwaModal && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-[modalPop_0.2s_ease-out]"
          onClick={() => setShowPwaModal(false)}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl relative border border-slate-100 flex flex-col gap-4 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowPwaModal(false)}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 text-emerald-600">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Zap size={22} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>PWA App Mode Active</span>
                  <Sparkles size={14} className="text-amber-500" />
                </h3>
                <p className="text-[11px] text-emerald-700 font-semibold">
                  Full standalone audio privileges unlocked
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs text-slate-700 font-medium">
              <div className="p-2.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/70 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="text-[11px] text-slate-800">
                  <strong>Fullscreen Experience:</strong> Zero browser address bar distractions.
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/70 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="text-[11px] text-slate-800">
                  <strong>Background Audio:</strong> Continuous playback when device is locked.
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/70 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="text-[11px] text-slate-800">
                  <strong>Hardware Controls:</strong> Headphone remotes & lockscreen seek active.
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/70 flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="text-[11px] text-slate-800">
                  <strong>Picture-in-Picture:</strong> Floating mini player window ready.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPwaModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              Continue to Isaiyon
            </button>
          </div>
        </div>
      )}

      {/* 3. Modal: Auth Error Diagnostic */}
      {authErrorInfo && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-[modalPop_0.2s_ease-out]"
          onClick={() => setAuthErrorInfo(null)}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl relative border border-slate-100 flex flex-col gap-3 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setAuthErrorInfo(null)}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 text-amber-600">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {authErrorInfo.title}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {authErrorInfo.message}
            </p>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-700 leading-normal font-mono">
              <strong className="block text-slate-900 font-sans mb-1 font-semibold">How to fix:</strong>
              {authErrorInfo.solution}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleGoogleSignIn(true)}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                Try Redirect Sign-In
              </button>
              <button
                onClick={() => setAuthErrorInfo(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
