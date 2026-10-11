import React, { useState, useEffect } from 'react';
import { Download, Plus, LogIn, LogOut, AlertTriangle, X, Loader2, ExternalLink } from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  signOut, 
  isAdminUser 
} from '../firebase/config';

function getAuthErrorMessage(err) {
  const currentHost = window.location.hostname;
  switch (err.code) {
    case 'auth/unauthorized-domain':
      return {
        title: 'Unauthorized Domain',
        message: `Your current hostname ("${currentHost}") is not in Firebase's Authorized Domains list.`,
        solution: `Go to Firebase Console (console.firebase.google.com) → Authentication → Settings → Authorized domains → Add "${currentHost}".`
      };
    case 'auth/operation-not-allowed':
      return {
        title: 'Google Sign-In Disabled',
        message: 'Google Sign-In provider is not enabled in your Firebase project.',
        solution: 'Go to Firebase Console → Authentication → Sign-in method → Click "Google" → Toggle "Enable" and Save.'
      };
    case 'auth/popup-blocked':
      return {
        title: 'Popup Blocked',
        message: 'Your browser blocked the Google sign-in popup window.',
        solution: 'Allow popups for this site, or use the Redirect Sign-In option below.'
      };
    case 'auth/popup-closed-by-user':
      return {
        title: 'Sign-In Cancelled',
        message: 'The sign-in window was closed before completion.',
        solution: 'Click Sign In again to retry.'
      };
    case 'auth/cancelled-popup-request':
      return null;
    case 'auth/network-request-failed':
      return {
        title: 'Network Error',
        message: 'Unable to reach Google Authentication servers.',
        solution: 'Check your internet connection and try again.'
      };
    default:
      return {
        title: 'Sign-In Failed',
        message: err.message || 'An unexpected error occurred during Google sign-in.',
        solution: `Error code: ${err.code || 'unknown'}`
      };
  }
}

export default function Navbar({ user, onOpenAdminModal }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authErrorInfo, setAuthErrorInfo] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
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
      console.error('Sign-in error:', err);
      const info = getAuthErrorMessage(err);
      if (info) {
        setAuthErrorInfo(info);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const isAdmin = isAdminUser(user);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 max-w-md mx-auto h-18 bg-white border-b border-slate-300 px-4 flex items-center justify-between z-40 select-none shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        {/* Brand / App Name (Top Left in Full Caps) */}
        <div className="flex items-center gap-1">
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            <img 
              src="/logo.png" 
              alt="Isaiyon" 
              className="w-full h-full object-cover rounded-[10px]" 
              onError={(e) => { e.currentTarget.style.display = 'none'; }} 
            />
          </div>
          <span className="text-black text-xl font-black tracking-widest text-slate-900 font-display uppercase">
            ISAIYON
          </span>
        </div>

        {/* Nav Actions */}
        <div className="flex items-center gap-1.5">
          {/* PWA Install Button on mobile */}
          {installPrompt && !isInstalled && (
            <button 
              className="w-8 h-8 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-all active:scale-95 shadow-2xs" 
              onClick={handleInstallClick} 
              title="Install mobile app"
            >
              <Download size={16} />
            </button>
          )}

          {/* Discreet Admin Button: ONLY visible for perumpatayans@gmail.com */}
          {isAdmin && (
            <button 
              className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-md font-bold shadow-xs hover:from-amber-600 hover:to-amber-700 transition-all active:scale-95 cursor-pointer" 
              onClick={onOpenAdminModal}
              title="Import YouTube track to Archive.org"
            >
              <Plus size={20} strokeWidth={3} />
              <span>Add</span>
            </button>
          )}

          {/* Google Authentication */}
          {user ? (
            <button 
              type="button"
              className="flex items-center gap-1.5 p-1.5 pr-2.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 cursor-pointer transition-all active:scale-95 shadow-2xs" 
              onClick={() => setShowLogoutConfirm(true)} 
              title="Account & Log Out"
            >
              <img 
                src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                alt={user.displayName || 'User'} 
                className="w-6 h-6 rounded-full object-cover ring-2 ring-white"
              />
              <LogOut size={16} className="text-slate-600" />
            </button>
          ) : (
            <button 
              disabled={isSigningIn}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer ${
                isSigningIn ? 'opacity-70 cursor-not-allowed' : ''
              }`} 
              onClick={() => handleGoogleSignIn(false)}
            >
              {isSigningIn ? (
                <Loader2 size={13} className="animate-spin text-amber-400" />
              ) : (
                <LogIn size={13} />
              )}
              <span>{isSigningIn ? 'Connecting...' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && user && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-[modalPop_0.2s_ease-out]"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div 
            className="w-full max-w-xs sm:max-w-sm bg-white rounded-3xl p-5 shadow-2xl relative border border-slate-100 flex flex-col gap-4 text-center items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
              title="Close"
            >
              <X size={16} />
            </button>

            {/* Logout Icon Graphic */}
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shadow-xs mt-1">
              <LogOut size={15} className="ml-0.5" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-extrabold text-slate-900 font-display">
                Sign Out of ISAIYON?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Are you sure you want to log out?
              </p>
            </div>

            {/* User Profile Card */}
            <div className="w-full flex items-center gap-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-left">
              <img 
                src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                alt={user.displayName || 'User'} 
                className="w-9 h-9 rounded-full object-cover ring-2 ring-white shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user.displayName || 'Signed-in User'}
                </p>
                <p className="text-[11px] text-slate-500 truncate font-medium">
                  {user.email || 'Google Account'}
                </p>
              </div>
            </div>

            {/* Confirmation Action Buttons */}
            <div className="w-full flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleSignOut();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Diagnostic & Error Modal */}
      {authErrorInfo && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-[modalPop_0.2s_ease-out]"
          onClick={() => setAuthErrorInfo(null)}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl relative border border-slate-100 flex flex-col gap-3"
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
    </>
  );
}
