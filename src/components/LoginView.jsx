import React, { useState } from 'react';
import { LogIn, Loader2, AlertTriangle, X, Music2, Heart, ListMusic, History } from 'lucide-react';
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

export default function LoginView() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authErrorInfo, setAuthErrorInfo] = useState(null);

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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex flex-col justify-between items-center px-4 py-8 select-none relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 -right-20 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header / Brand */}
      <header className="w-full max-w-sm flex items-center justify-center gap-2 pt-2">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20">
          <img src="/logo.png" alt="Isaiyon" className="w-full h-full object-cover rounded-2xl" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight text-white font-display">Isaiyon</span>
          <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase">Sound Vault</span>
        </div>
      </header>

      {/* Center Hero: Vinyl record artwork centerpiece */}
      <div className="w-full max-w-sm flex flex-col items-center text-center my-auto py-6">
        <div className="relative w-44 h-44 mb-6">
          {/* Vinyl Disc Outer Rim */}
          <div className="w-full h-full rounded-full bg-slate-900 p-3 shadow-[0_0_40px_rgba(245,158,11,0.2)] ring-4 ring-white/10 flex items-center justify-center">
            <div 
              className="w-full h-full rounded-full overflow-hidden relative border-2 border-white/20 shadow-inner"
              style={{ animation: 'spinDisc 18s linear infinite' }}
            >
              <img 
                src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400" 
                alt="Vinyl Record" 
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = FALLBACK_ARTWORK;
                }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950 border-4 border-amber-500/80 shadow-md" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
          Your Personal <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">Music Vault</span>
        </h1>
        <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed font-medium">
          Sign in to unlock full songs, stream in high-fidelity, build your own playlists, and save recent searches.
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-2 w-full mt-6 text-left">
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Music2 size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-white truncate">Full Playback</div>
              <div className="text-[9px] text-slate-400 truncate">High-fidelity tracks</div>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Heart size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-white truncate">Liked Songs</div>
              <div className="text-[9px] text-slate-400 truncate">Cloud-synced list</div>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <ListMusic size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-white truncate">Custom Playlists</div>
              <div className="text-[9px] text-slate-400 truncate">Create & organize</div>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <History size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-white truncate">Search History</div>
              <div className="text-[9px] text-slate-400 truncate">Instant recollection</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Section: Google Sign In */}
      <div className="w-full max-w-sm flex flex-col gap-3 pb-4">
        <button
          disabled={isSigningIn}
          onClick={() => handleGoogleSignIn(false)}
          className={`w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm flex items-center justify-center gap-3 shadow-xl shadow-white/10 transition-all active:scale-95 cursor-pointer ${
            isSigningIn ? 'opacity-80 cursor-wait' : ''
          }`}
        >
          {isSigningIn ? (
            <>
              <Loader2 size={18} className="animate-spin text-amber-600" />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <p className="text-[10px] text-slate-500 text-center font-medium">
          Sign-in keeps your playlists, favorites, and search history safely synced to your account.
        </p>
      </div>

      {/* Auth Error Diagnostic Modal */}
      {authErrorInfo && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none animate-[modalPop_0.2s_ease-out]"
          onClick={() => setAuthErrorInfo(null)}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl relative border border-slate-100 flex flex-col gap-3 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setAuthErrorInfo(null)}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90"
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
