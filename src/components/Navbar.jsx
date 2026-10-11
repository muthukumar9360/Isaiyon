import React, { useState, useEffect } from 'react';
import { Download, Plus, LogIn, LogOut } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signOut, isAdminUser } from '../firebase/config';

export default function Navbar({ user, onOpenAdminModal }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

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

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign-in error:', err);
      alert('Google Sign-In failed: ' + err.message);
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
    <header className="fixed top-0 left-0 right-0 max-w-md mx-auto h-18 bg-white/90 backdrop-blur-xl border-b border-slate-300 px-4 flex items-center justify-end z-40 select-none shadow-[0_2px_10px_rgba(0,0,0,0.02)]">

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
          <div 
            className="flex items-center gap-1.5 p-2 rounded-full bg-slate-200 hover:bg-slate-100 border border-slate-200/80 cursor-pointer transition-all active:scale-95" 
            onClick={handleSignOut} 
            title="Sign Out"
          >
            <img 
              src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
              alt={user.displayName || 'User'} 
              className="w-6 h-6 rounded-full object-cover ring-3 ring-white"
            />
            <LogOut size={20} className="text-black" />
          </div>
        ) : (
          <button 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer" 
            onClick={handleGoogleSignIn}
          >
            <LogIn size={13} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
