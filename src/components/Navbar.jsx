import React, { useState, useEffect } from 'react';
import { Disc3, LogIn, LogOut, Download, Plus } from 'lucide-react';
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
    <header className="mobile-header">
      <div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <img src="/logo.png" alt="Isaiyon Logo" className="brand-logo-img" />
        <div>
          <span className="brand-title">Isaiyon</span>
        </div>
        <span className="brand-badge">PRO</span>
      </div>

      <div className="nav-actions">
        {/* PWA Install Button on mobile */}
        {installPrompt && !isInstalled && (
          <button className="ctrl-btn" onClick={handleInstallClick} title="Install mobile app" style={{ color: 'var(--accent-gold)' }}>
            <Download size={18} />
          </button>
        )}

        {/* Discreet Admin Button: ONLY visible for perumpatayans@gmail.com */}
        {isAdmin && (
          <button 
            className="discreet-admin-btn" 
            onClick={onOpenAdminModal}
            title="Import YouTube track to Archive.org"
          >
            <Plus size={13} />
            <span>Vault</span>
          </button>
        )}

        {/* Google Authentication */}
        {user ? (
          <div className="user-profile" onClick={handleSignOut} title="Sign Out">
            <img 
              src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
              alt={user.displayName || 'User'} 
              className="user-avatar"
            />
            <LogOut size={12} color="#64748b" />
          </div>
        ) : (
          <button className="btn-google" onClick={handleGoogleSignIn}>
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
