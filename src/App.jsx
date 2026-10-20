import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import SearchPage from './components/SearchPage';
import QueueDrawer from './components/QueueDrawer';
import LibraryPage from './components/LibraryPage';
import VinylPlayer from './components/VinylPlayer';
import BottomPlayer from './components/BottomPlayer';
import MovieDetailModal from './components/MovieDetailModal';
import AdminModal from './components/AdminModal';
import ManageSongsModal from './components/ManageSongsModal';
import AddToPlaylistModal from './components/AddToPlaylistModal';
import LoginView from './components/LoginView';
import HistoryPage from './components/HistoryPage';
import { Home, Search, ListMusic, Library, Disc3, History as HistoryIcon, Download, LogOut, AlertCircle, X } from 'lucide-react';
import { FALLBACK_ARTWORK } from './constants/fallbackArt';
import { 
  resolveDirectArchiveUrl, 
  getAudioStreamCandidates, 
  normalizeTrack, 
  refreshStorageNode 
} from './utils/mediaUrlResolver';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  getRedirectResult,
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc,
  deleteDoc, 
  serverTimestamp 
} from './firebase/config';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Dynamic tracks from Firestore only
  const [tracks, setTracks] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('isaiyon_volume');
      if (saved !== null) {
        const parsed = parseFloat(saved);
        // Migrate legacy 0.9 (90%) to 1.0 (100% default)
        if (parsed === 0.9 || isNaN(parsed)) {
          localStorage.setItem('isaiyon_volume', '1');
          return 1.0;
        }
        return parsed;
      }
      return 1.0;
    } catch (_) {
      return 1.0;
    }
  });
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(() => {
    try {
      const saved = localStorage.getItem('isaiyon_repeat_mode');
      return saved === 'one' ? 'one' : 'off';
    } catch (_) {
      return 'off';
    }
  });
  const [isSuggestedOpen, setIsSuggestedOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [savedAlbums, setSavedAlbums] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [listenedHistory, setListenedHistory] = useState([]);
  const [isQueueMode, setIsQueueMode] = useState(() => {
    try {
      const saved = localStorage.getItem('isaiyon_queue_mode');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation: 'home' | 'search' | 'queue' | 'history' | 'library' | 'nowplaying'
  const [activePage, setActivePage] = useState(() => {
    try {
      return sessionStorage.getItem('isaiyon_active_page') || 'home';
    } catch (_) {
      return 'home';
    }
  });
  const [isBottomPlayerDismissed, setIsBottomPlayerDismissed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync activePage across refreshes
  useEffect(() => {
    try {
      sessionStorage.setItem('isaiyon_active_page', activePage);
    } catch (_) {}
    if (activePage !== 'nowplaying') {
      setIsSuggestedOpen(false);
    }
  }, [activePage]);

  // Queue state (Up Next) and history stack
  const [queue, setQueue] = useState([]);
  const [queueHistory, setQueueHistory] = useState([]);

  // Sync player preferences and queue changes to localStorage
  useEffect(() => {
    try {
      if (queue.length > 0) {
        localStorage.setItem('isaiyon_saved_queue', JSON.stringify(queue.map(t => t.id)));
      } else {
        localStorage.removeItem('isaiyon_saved_queue');
      }
    } catch (_) {}
  }, [queue]);

  useEffect(() => {
    try {
      localStorage.setItem('isaiyon_queue_mode', String(isQueueMode));
    } catch (_) {}
  }, [isQueueMode]);

  useEffect(() => {
    try {
      localStorage.setItem('isaiyon_volume', String(volume));
    } catch (_) {}
  }, [volume]);

  useEffect(() => {
    try {
      localStorage.setItem('isaiyon_repeat_mode', repeatMode);
    } catch (_) {}
  }, [repeatMode]);

  // Track previous active page so minimizing VinylPlayer returns back to where user was
  const lastActivePageRef = useRef('home');
  useEffect(() => {
    if (activePage !== 'nowplaying') {
      lastActivePageRef.current = activePage;
    }
  }, [activePage]);

  // Modals & Toasts
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [playlistModalTrack, setPlaylistModalTrack] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef(null);

  // Mobile Back Button / Edge Swipe Navigation
  const activePageRef = useRef(activePage);
  activePageRef.current = activePage;

  const isAdminModalOpenRef = useRef(isAdminModalOpen);
  isAdminModalOpenRef.current = isAdminModalOpen;

  const isManageModalOpenRef = useRef(isManageModalOpen);
  isManageModalOpenRef.current = isManageModalOpen;

  const playlistModalTrackRef = useRef(playlistModalTrack);
  playlistModalTrackRef.current = playlistModalTrack;

  const selectedMovieRef = useRef(selectedMovie);
  selectedMovieRef.current = selectedMovie;

  // Robust multi-layer history buffer to permanently prevent Android from exiting on back swipe
  useEffect(() => {
    try {
      window.history.replaceState({ isaiyonApp: true, depth: 0 }, '', window.location.href);
      window.history.pushState({ isaiyonApp: true, depth: 1 }, '', window.location.href);
      window.history.pushState({ isaiyonApp: true, depth: 2 }, '', window.location.href);
    } catch (_) {}

    let lastReplenish = 0;
    const replenishHistoryCushion = () => {
      const now = Date.now();
      if (now - lastReplenish > 250) {
        lastReplenish = now;
        try {
          window.history.pushState({ isaiyonApp: true, depth: now }, '', window.location.href);
        } catch (_) {}
      }
    };

    window.addEventListener('pointerdown', replenishHistoryCushion, { passive: true });
    window.addEventListener('touchstart', replenishHistoryCushion, { passive: true });
    window.addEventListener('click', replenishHistoryCushion, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', replenishHistoryCushion);
      window.removeEventListener('touchstart', replenishHistoryCushion);
      window.removeEventListener('click', replenishHistoryCushion);
    };
  }, []);

  // When activePage changes (nowplaying, search, library, queue, history), push history entry so back gesture collapses or navigates back smoothly
  useEffect(() => {
    if (activePage !== 'home') {
      try {
        window.history.pushState({ isaiyonApp: true, page: activePage }, '', window.location.href);
      } catch (_) {}
    }
  }, [activePage]);



  // Intercept back gesture (popstate): NEVER close app, NEVER kill music!
  useEffect(() => {
    const handlePopState = () => {
      // ALWAYS re-push immediately so the stack never drains and Android never exits
      try {
        window.history.pushState({ isaiyonApp: true, time: Date.now() }, '', window.location.href);
      } catch (_) {}

      // 1. If any modal is open -> close it
      if (isAdminModalOpenRef.current) {
        setIsAdminModalOpen(false);
        isAdminModalOpenRef.current = false;
        return;
      }
      if (isManageModalOpenRef.current) {
        setIsManageModalOpen(false);
        isManageModalOpenRef.current = false;
        return;
      }
      if (playlistModalTrackRef.current) {
        setPlaylistModalTrack(null);
        playlistModalTrackRef.current = null;
        return;
      }
      if (selectedMovieRef.current) {
        setSelectedMovie(null);
        selectedMovieRef.current = null;
        return;
      }

      // 2. If expanded VinylPlayer is open -> minimize to home (audio continues playing in background!)
      if (activePageRef.current === 'nowplaying') {
        setActivePage('home');
        activePageRef.current = 'home';
        return;
      }

      // 3. If on any other page (search, library, queue, history) -> return to home (audio continues!)
      if (activePageRef.current !== 'home') {
        setActivePage('home');
        activePageRef.current = 'home';
        return;
      }

      // 4. If on home page -> keep playing! The app never exits on swipe gesture!
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);


  const handleClosePlayer = () => {
    // Closes player and stops notification card
    setIsBottomPlayerDismissed(true);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      } catch (_) {}
    }
  };

  const handleNavigateToSearch = (queryTerm) => {
    setSearchQuery(queryTerm || '');
    setActivePage('search');
  };

  // Audio element reference & track tracking with auto-failover
  const audioRef = useRef(new Audio());
  const activeTrackIdRef = useRef(null);
  const streamCandidatesRef = useRef([]);
  const candidateIndexRef = useRef(0);
  const sleepTimerRef = useRef(null);
  const [isAudioBuffering, setIsAudioBuffering] = useState(false);
  const isTransitioningRef = useRef(false);
  const handleNextRef = useRef(null);
  const handlePrevRef = useRef(null);
  const handlePlayRef = useRef(null);
  const handlePauseRef = useRef(null);
  const currentTrackRef = useRef(null);
  const handleErrorRef = useRef(null);

  // Auto-refresh Archive storage cluster nodes for high-speed streaming
  useEffect(() => {
    refreshStorageNode();
  }, []);

  // Splash Loading Screen Timer (only runs on first session launch, skipped on page refresh)
  const [isSplashDone, setIsSplashDone] = useState(() => {
    try {
      return sessionStorage.getItem('isaiyon_session_active') === 'true';
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    if (isSplashDone) {
      try {
        sessionStorage.setItem('isaiyon_session_active', 'true');
      } catch (_) {}
      return;
    }
    const timer = setTimeout(() => {
      setIsSplashDone(true);
      try {
        sessionStorage.setItem('isaiyon_session_active', 'true');
      } catch (_) {}
    }, 2000);
    return () => clearTimeout(timer);
  }, [isSplashDone]);

  // Smooth in-app refresh handler for navbar refresh button
  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToastMessage('Library Synced');
      toastTimeoutRef.current = setTimeout(() => setToastMessage(''), 2200);
    }, 700);
  };

  // PWA Standalone Detection & Install Prompt
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches 
        || window.navigator.standalone === true 
        || document.referrer.includes('android-app://');
      setIsStandalone(standalone);
    };
    checkStandalone();

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsStandalone(true);
      }
    } else {
      alert("To install on mobile: Tap Chrome menu (⋮) -> 'Install app' (or 'Add to Home screen'). On iPhone: Tap Share -> 'Add to Home Screen'.");
    }
  };

  const currentTrack = (currentTrackIndex !== null && currentTrackIndex >= 0 && tracks[currentTrackIndex]) 
    ? tracks[currentTrackIndex] 
    : null;
  currentTrackRef.current = currentTrack;

  // Rotating disc animation frames for mobile lock screen & notification title
  const ROTATING_DISC_FRAMES = ['◐', '◓', '◑', '◒'];
  const [discFrameIndex, setDiscFrameIndex] = useState(0);

  // Rotate spinner frame while buffering or transitioning
  useEffect(() => {
    if (!isAudioBuffering && !isTransitioningRef.current) {
      setDiscFrameIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setDiscFrameIndex(prev => (prev + 1) % ROTATING_DISC_FRAMES.length);
    }, 280);
    return () => clearInterval(interval);
  }, [isAudioBuffering]);

  // Immediate MediaSession updater to preserve notification card on Android lock screen & notification shade
  const updateMediaSession = (track, isBuffering = false, isPlayingState = true) => {
    if (!('mediaSession' in navigator) || !track) return;
    try {
      const cleanTitle = (track.title || '').replace(/_+/g, ' ');
      const cleanMovie = (track.movie || '').replace(/_+/g, ' ');
      const cleanArtist = (track.artist || 'Pure Sound').replace(/_+/g, ' ');
      const resolvedCover = resolveDirectArchiveUrl(track.coverUrl) || track.coverUrl || FALLBACK_ARTWORK;
      const titleText = isBuffering ? `${ROTATING_DISC_FRAMES[discFrameIndex]} ${cleanTitle}` : cleanTitle;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: titleText,
        artist: `${cleanArtist}${cleanMovie ? ` (${cleanMovie})` : ''}`,
        album: cleanMovie || 'Isaiyon Sound Vault',
        artwork: [
          { src: resolvedCover, sizes: '96x96', type: 'image/jpeg' },
          { src: resolvedCover, sizes: '128x128', type: 'image/jpeg' },
          { src: resolvedCover, sizes: '192x192', type: 'image/jpeg' },
          { src: resolvedCover, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      // Keep playbackState 'playing' during transitions so OS never dismisses the lock screen notification
      navigator.mediaSession.playbackState = (isPlayingState || isBuffering || isTransitioningRef.current) ? 'playing' : 'paused';
    } catch (err) {
      console.warn("MediaSession update error:", err);
    }
  };

  // Mutate lock screen title dynamically during buffering to animate the disc on Android notification & lock screen
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    try {
      const cleanTitle = (currentTrack.title || '').replace(/_+/g, ' ');
      if (isAudioBuffering || isTransitioningRef.current) {
        if (navigator.mediaSession.metadata) {
          navigator.mediaSession.metadata.title = `${ROTATING_DISC_FRAMES[discFrameIndex]} ${cleanTitle}`;
        }
      } else {
        if (navigator.mediaSession.metadata && navigator.mediaSession.metadata.title !== cleanTitle) {
          navigator.mediaSession.metadata.title = cleanTitle;
        }
      }
    } catch (_) {}
  }, [discFrameIndex, isAudioBuffering, currentTrack]);

  // Keep global audio references and track states for service worker and background playback
  useEffect(() => {
    if (audioRef.current) {
      window.__isaiyonAudio = audioRef.current;
    }
    window.__isaiyonHasTrack = Boolean(currentTrack);
  }, [currentTrack]);

  // 1. Auth Listener
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.warn("Firebase redirect sign-in error:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
        setFavorites([]);
        setPlaylists([]);
        setSearchHistory([]);
        setListenedHistory([]);
        setQueue([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Completely close player and shut down playback immediately without confirmation
  const handleCloseEntireApp = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      try {
        audioRef.current.currentTime = 0;
      } catch (_) {}
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      } catch {}
    }
    activeTrackIdRef.current = null;
    setIsPlaying(false);
    setCurrentTrackIndex(null);
    setCurrentTime(0);
    setDuration(0);
    setIsBottomPlayerDismissed(true);
    setActivePage(prev => (prev === 'nowplaying' ? 'home' : prev));
    try {
      localStorage.removeItem('isaiyon_last_track_id');
    } catch (_) {}
  };

  // Register MediaSession action handlers once on mount
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        handlePlayRef.current?.();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        handlePauseRef.current?.();
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        handlePauseRef.current?.();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handlePrevRef.current?.();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleNextRef.current?.();
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        handleSkipSeconds(-(details.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        handleSkipSeconds(details.seekOffset || 10);
      });
      if ('setActionHandler' in navigator.mediaSession) {
        try {
          navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined && details.seekTime !== null) {
              handleSeek(details.seekTime);
            }
          });
        } catch (_) {}
      }
    } catch (err) {
      console.warn("MediaSession handler registration error:", err);
    }
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState?.({
        duration: duration || 0,
        playbackRate: playbackRate || 1,
        position: Math.min(currentTime, duration) || 0
      });
    } catch {}
  }, [currentTime, duration, playbackRate]);

  // If no track is playing and user is on nowplaying view, auto-return to home
  useEffect(() => {
    if (activePage === 'nowplaying' && !currentTrack) {
      setActivePage('home');
    }
  }, [activePage, currentTrack]);

  // 2. Real-time Tracks from Firestore (100% Dynamic DB)
  useEffect(() => {
    const tracksCol = collection(db, 'tracks');
    const unsubscribe = onSnapshot(tracksCol, (snapshot) => {
      if (!snapshot.empty) {
        const cleanDisplay = (val) => (typeof val === 'string' ? val.replace(/_+/g, ' ').trim() : val);
        const cleanTamilText = (str) => {
          if (!str || typeof str !== 'string') return str;
          if (/[\u0B80-\u0BFF]/.test(str)) {
            const parts = str.split('—').map(p => p.trim());
            const eng = parts.find(p => !/[\u0B80-\u0BFF]/.test(p) && p.length > 0);
            if (eng) return eng;
            return str.replace(/[\u0B80-\u0BFF]/g, '').replace(/\s*—\s*/g, '').trim();
          }
          return str;
        };

        const loadedTracks = snapshot.docs.map(d => {
          const data = d.data();
          const cleanG = cleanTamilText(cleanDisplay(data.genre));
          const cleanM = cleanTamilText(cleanDisplay(data.mood));

          // Auto-sanitize and update database document in Firestore if Tamil was present
          if (/[\u0B80-\u0BFF]/.test(data.genre || '') || /[\u0B80-\u0BFF]/.test(data.mood || '')) {
            updateDoc(doc(db, 'tracks', d.id), {
              genre: cleanG || 'Melody / Romantic',
              mood: cleanM || 'Love'
            }).catch(() => {});
          }

          const trk = {
            id: d.id,
            ...data,
            title: cleanTamilText(cleanDisplay(data.title)),
            movie: cleanTamilText(cleanDisplay(data.movie)),
            artist: cleanTamilText(cleanDisplay(data.artist)),
            composer: cleanTamilText(cleanDisplay(data.composer)),
            actors: cleanTamilText(cleanDisplay(data.actors)),
            genre: cleanG,
            mood: cleanM
          };
          return normalizeTrack(trk);
        });
        setTracks(loadedTracks);

        // Preload all cover images into browser cache for instant rendering
        loadedTracks.forEach(t => {
          if (t.coverUrl && !t.coverUrl.startsWith('data:')) {
            const img = new Image();
            img.src = t.coverUrl;
          }
        });

        // Restore last played song when user hasn't clicked the X button
        try {
          const lastSavedId = localStorage.getItem('isaiyon_last_track_id');
          if (lastSavedId) {
            const idx = loadedTracks.findIndex(t => t.id === lastSavedId);
            if (idx !== -1) {
              setCurrentTrackIndex((prev) => (prev === null ? idx : prev));
              setIsBottomPlayerDismissed(false);
            }
          }

          // Restore queue from localStorage
          const savedQueueRaw = localStorage.getItem('isaiyon_saved_queue');
          if (savedQueueRaw) {
            const savedIds = JSON.parse(savedQueueRaw);
            if (Array.isArray(savedIds)) {
              const restoredQueue = savedIds
                .map(id => loadedTracks.find(t => t.id === id))
                .filter(Boolean);
              setQueue(prev => prev.length === 0 ? restoredQueue : prev);
            }
          }
        } catch (_) {}
      } else {
        // If firestore is initially empty, we keep an empty catalog until first song is saved
        setTracks([]);
      }
    }, (err) => {
      console.warn("Firestore tracks error:", err.message);
    });

    return () => unsubscribe();
  }, []);

  // 3. User Favorites from Firestore
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }

    const favDocRef = doc(db, 'users', user.uid, 'settings', 'favorites');
    const unsubscribe = onSnapshot(favDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setFavorites(docSnap.data().trackIds || []);
      } else {
        setFavorites([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // 3b. Saved Albums from Firestore & localStorage
  useEffect(() => {
    if (!user) {
      setSavedAlbums([]);
      return;
    }

    try {
      const local = JSON.parse(localStorage.getItem(`isaiyon_albums_${user.uid}`) || '[]');
      setSavedAlbums(local);
    } catch (_) {}

    const albumDocRef = doc(db, 'users', user.uid, 'settings', 'savedAlbums');
    const unsubscribe = onSnapshot(albumDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().albumNames) {
        setSavedAlbums(docSnap.data().albumNames);
        try {
          localStorage.setItem(`isaiyon_albums_${user.uid}`, JSON.stringify(docSnap.data().albumNames));
        } catch (_) {}
      } else {
        setSavedAlbums([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // 4. User Playlists from Firestore
  useEffect(() => {
    if (!user) {
      setPlaylists([]);
      return;
    }

    const playlistsCol = collection(db, 'users', user.uid, 'playlists');
    const unsubscribe = onSnapshot(playlistsCol, (snapshot) => {
      if (!snapshot.empty) {
        setPlaylists(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        setPlaylists([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // 4b. User Search History from Firestore & localStorage
  useEffect(() => {
    if (!user) {
      setSearchHistory([]);
      return;
    }

    try {
      const local = JSON.parse(localStorage.getItem(`isaiyon_history_${user.uid}`) || '[]');
      setSearchHistory(local);
    } catch (_) {}

    const historyDocRef = doc(db, 'users', user.uid, 'settings', 'searchHistory');
    const unsubscribe = onSnapshot(historyDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().queries) {
        setSearchHistory(docSnap.data().queries);
        try {
          localStorage.setItem(`isaiyon_history_${user.uid}`, JSON.stringify(docSnap.data().queries));
        } catch (_) {}
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddSearchHistory = async (queryText) => {
    const q = queryText?.trim();
    if (!q || !user) return;
    const updated = [q, ...searchHistory.filter(item => item.toLowerCase() !== q.toLowerCase())].slice(0, 15);
    setSearchHistory(updated);
    try {
      localStorage.setItem(`isaiyon_history_${user.uid}`, JSON.stringify(updated));
      const historyDocRef = doc(db, 'users', user.uid, 'settings', 'searchHistory');
      await setDoc(historyDocRef, { queries: updated, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.warn("Failed saving search history:", err);
    }
  };

  const handleRemoveSearchHistory = async (queryToRemove) => {
    if (!user) return;
    const updated = searchHistory.filter(item => item !== queryToRemove);
    setSearchHistory(updated);
    try {
      localStorage.setItem(`isaiyon_history_${user.uid}`, JSON.stringify(updated));
      const historyDocRef = doc(db, 'users', user.uid, 'settings', 'searchHistory');
      await setDoc(historyDocRef, { queries: updated, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.warn("Failed removing search history:", err);
    }
  };

  const handleClearAllSearchHistory = async () => {
    if (!user) return;
    setSearchHistory([]);
    try {
      localStorage.removeItem(`isaiyon_history_${user.uid}`);
      const historyDocRef = doc(db, 'users', user.uid, 'settings', 'searchHistory');
      await setDoc(historyDocRef, { queries: [], updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.warn("Failed clearing search history:", err);
    }
  };

  // 4c. User Listened History from Firestore & localStorage
  useEffect(() => {
    if (!user) {
      setListenedHistory([]);
      return;
    }

    try {
      const local = JSON.parse(localStorage.getItem(`isaiyon_listened_${user.uid}`) || '[]');
      setListenedHistory(local);
    } catch (_) {}

    const historyDocRef = doc(db, 'users', user.uid, 'settings', 'listenedHistory');
    const unsubscribe = onSnapshot(historyDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().items) {
        setListenedHistory(docSnap.data().items);
        try {
          localStorage.setItem(`isaiyon_listened_${user.uid}`, JSON.stringify(docSnap.data().items));
        } catch (_) {}
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleRecordHeardTrack = async (track) => {
    if (!track || !user) return;
    const newItem = {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      movie: track.movie || '',
      coverUrl: track.coverUrl || '',
      timestamp: Date.now()
    };
    const updated = [newItem, ...listenedHistory.filter(h => h.trackId !== track.id)].slice(0, 100);
    setListenedHistory(updated);
    try {
      localStorage.setItem(`isaiyon_listened_${user.uid}`, JSON.stringify(updated));
      const historyDocRef = doc(db, 'users', user.uid, 'settings', 'listenedHistory');
      await setDoc(historyDocRef, { items: updated, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.warn("Failed saving listened history:", err);
    }
  };

  const handleClearListenedHistory = async () => {
    if (!user) return;
    setListenedHistory([]);
    try {
      localStorage.removeItem(`isaiyon_listened_${user.uid}`);
      const historyDocRef = doc(db, 'users', user.uid, 'settings', 'listenedHistory');
      await setDoc(historyDocRef, { items: [], updatedAt: serverTimestamp() }, { merge: true });
      showToast("History Cleared");
    } catch (err) {
      console.warn("Failed clearing listened history:", err);
    }
  };

  // Helper: Pick a random track from DB avoiding current track (prioritizing unheard tracks)
  const getRandomTrack = () => {
    if (tracks.length === 0) return null;
    const heardSet = new Set(listenedHistory.map(h => h.trackId));
    const unheard = tracks.filter(t => !heardSet.has(t.id) && t.id !== currentTrack?.id);
    const candidateList = unheard.length > 0 ? unheard : tracks.filter(t => t.id !== currentTrack?.id);
    const pool = candidateList.length > 0 ? candidateList : tracks;
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  };

  // 6. Audio Engine & Events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.preload = 'metadata';
    audio.volume = volume;
    audio.playbackRate = playbackRate;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || currentTrack?.duration || 0);
      setIsAudioBuffering(false);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'playing';
        } catch (_) {}
      }
    };
    const handlePause = () => {
      if (isTransitioningRef.current) return;
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'paused';
        } catch (_) {}
      }
    };
    const handleWaiting = () => {
      setIsAudioBuffering(true);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'playing';
        } catch (_) {}
      }
    };
    const handlePlaying = () => {
      isTransitioningRef.current = false;
      setIsAudioBuffering(false);
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'playing';
          if (currentTrackRef.current && navigator.mediaSession.metadata) {
            navigator.mediaSession.metadata.title = (currentTrackRef.current.title || '').replace(/_+/g, ' ');
          }
        } catch (_) {}
      }
    };
    const handleCanPlay = () => setIsAudioBuffering(false);
    const handleError = () => {
      const candidates = streamCandidatesRef.current || [];
      const nextIdx = candidateIndexRef.current + 1;
      if (nextIdx < candidates.length) {
        candidateIndexRef.current = nextIdx;
        const nextUrl = candidates[nextIdx];
        console.warn(`[AudioEngine] Stream failed (${audio.error?.code}). Auto-failing over to candidate ${nextIdx + 1}/${candidates.length}: ${nextUrl}`);
        setIsAudioBuffering(true);
        audio.src = nextUrl;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              isTransitioningRef.current = false;
              setIsPlaying(true);
              setIsAudioBuffering(false);
            })
            .catch(() => {});
        }
        return;
      }

      isTransitioningRef.current = false;
      setIsPlaying(false);
      setIsAudioBuffering(false);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'paused';
        } catch (_) {}
      }
      console.warn("Audio playback error (all candidates exhausted):", audio.error);
      if (isPlaying) {
        if (audio.error?.code === 2) {
          showToast("Network Error");
        } else if (audio.error?.code === 4) {
          showToast("Stream Error");
        }
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    handleErrorRef.current = handleError;
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentTrack, queue, repeatMode, volume, playbackRate, sleepTimer, isQueueMode, tracks, listenedHistory, isBottomPlayerDismissed]);

  const handleEnded = () => {
    // If user closed the bottom player, do not auto-advance or resurrect player
    if (isBottomPlayerDismissed) {
      setIsPlaying(false);
      return;
    }
    if (sleepTimer === 'track') {
      setIsPlaying(false);
      setSleepTimer(0);
      return;
    }
    if (repeatMode === 'one') {
      const audio = audioRef.current;
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }

    // If Queue Mode is active: play from queue and remove played track
    if (isQueueMode) {
      if (queue.length > 0) {
        const nextTrack = queue[0];
        setQueue(prev => prev.slice(1));
        if (currentTrack) {
          setQueueHistory(prev => [currentTrack, ...prev.filter(t => t.id !== currentTrack.id)].slice(0, 50));
        }
        handleSelectTrack(nextTrack, false);
      } else {
        // Queue finished -> smoothly convert to random mode without any warning
        setIsQueueMode(false);
        const randomTrack = getRandomTrack();
        if (randomTrack) handleSelectTrack(randomTrack, false);
      }
    } else {
      const randomTrack = getRandomTrack();
      if (randomTrack) handleSelectTrack(randomTrack, false);
    }
  };

  // 7. Track change synchronization for Media Session and audio stream
  useEffect(() => {
    if (!currentTrack) return;

    const audio = audioRef.current;
    if (activeTrackIdRef.current !== currentTrack.id) {
      activeTrackIdRef.current = currentTrack.id;
      setCurrentTime(0);
      try { audio.currentTime = 0; } catch (_) {}
      const candidates = getAudioStreamCandidates(currentTrack);
      streamCandidatesRef.current = candidates;
      candidateIndexRef.current = 0;
      const primaryUrl = candidates[0] || currentTrack.audioUrl;

      if (primaryUrl) {
        audio.preload = isPlaying ? 'auto' : 'none';
        audio.src = primaryUrl;
        audio.playbackRate = playbackRate;
        try { audio.currentTime = 0; } catch (_) {}
        if (isPlaying) {
          setIsAudioBuffering(true);
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              setIsAudioBuffering(false);
              try { audio.currentTime = 0; } catch (_) {}
              setCurrentTime(0);
            }).catch((err) => {
              console.warn("Track change play error:", err);
              handleErrorRef.current?.();
            });
          }
        }
      }
    }

    if (!isTransitioningRef.current) {
      updateMediaSession(currentTrack, isAudioBuffering, isPlaying);
    }
  }, [currentTrack]);

  // Keep track of positionState in MediaSession for background lock screen timeline
  useEffect(() => {
    if ('mediaSession' in navigator && typeof navigator.mediaSession.setPositionState === 'function' && currentTrack) {
      try {
        if (duration > 0 && !isNaN(duration) && isFinite(duration) && currentTime >= 0 && currentTime <= duration) {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: playbackRate || 1,
            position: currentTime
          });
        }
      } catch (_) {}
    }
  }, [currentTime, duration, playbackRate, currentTrack]);

  // 7b. Preload Next Track Audio & Cover for instantaneous playback transition
  useEffect(() => {
    let nextTrackToPreload = null;
    if (isQueueMode && queue.length > 0) {
      nextTrackToPreload = queue[0];
    } else if (tracks.length > 1 && currentTrackIndex !== null) {
      const nextIdx = (currentTrackIndex + 1) % tracks.length;
      nextTrackToPreload = tracks[nextIdx];
    }

    if (nextTrackToPreload) {
      // Preload cover artwork so notification image is cached
      if (nextTrackToPreload.coverUrl) {
        const img = new Image();
        img.src = nextTrackToPreload.coverUrl;
      }
      // Preload audio buffer so next song starts without delay
      if (nextTrackToPreload.audioUrl) {
        const preloader = new Audio();
        preloader.preload = 'auto';
        preloader.src = nextTrackToPreload.audioUrl;
      }
    }
  }, [currentTrack, queue, isQueueMode, tracks, currentTrackIndex]);

  // 8. Sleep Timer Countdown Logic - Applies globally to entire app
  useEffect(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    if (sleepTimer && typeof sleepTimer === 'number' && sleepTimer > 0) {
      sleepTimerRef.current = setTimeout(() => {
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
        }
        setIsPlaying(false);
        setSleepTimer(0);
        showToast("Sleep Timer Done");
      }, sleepTimer * 60 * 1000);
    }

    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, [sleepTimer]);

  // Global Volume & Playback Rate Sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleToggleRepeatMode = () => {
    setRepeatMode(prev => {
      const next = prev === 'one' ? 'off' : 'one';
      showToast(next === 'one' ? "Repeat ON" : "Repeat OFF");
      return next;
    });
  };

  // Playback Control Handlers
  const handleUserPlay = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.play().catch(() => {});
    }
    setIsPlaying(true);
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'playing';
      } catch (_) {}
    }
  };

  const handleUserPause = () => {
    isTransitioningRef.current = false;
    setIsAudioBuffering(false);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    setIsPlaying(false);
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'paused';
      } catch (_) {}
    }
  };

  handlePlayRef.current = handleUserPlay;
  handlePauseRef.current = handleUserPause;

  const handlePlayPause = (targetViewMode = 'bar') => {
    try {
      window.history.pushState({ isaiyonApp: true, userActivated: Date.now() }, '', window.location.href);
    } catch (_) {}
    if (isPlaying) {
      handleUserPause();
    } else {
      const audio = audioRef.current;
      if ((!audio.src || audio.error || activeTrackIdRef.current !== currentTrack?.id || audio.readyState === 0) && currentTrack) {
        activeTrackIdRef.current = currentTrack.id;
        const candidates = getAudioStreamCandidates(currentTrack);
        streamCandidatesRef.current = candidates;
        candidateIndexRef.current = 0;
        const primaryUrl = candidates[0] || currentTrack.audioUrl;
        if (primaryUrl) {
          audio.src = primaryUrl;
          audio.playbackRate = playbackRate;
          try { audio.currentTime = currentTime || 0; } catch (_) {}
        }
      }
      setIsAudioBuffering(true);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsAudioBuffering(false);
            if ('mediaSession' in navigator) {
              try { navigator.mediaSession.playbackState = 'playing'; } catch (_) {}
            }
          })
          .catch((err) => {
            console.warn("Play error, trying auto-failover:", err);
            handleErrorRef.current?.();
          });
      }
      setIsBottomPlayerDismissed(false);
    }
  };

  const handleSeek = (newTime) => {
    const audio = audioRef.current;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSkipSeconds = (delta) => {
    const audio = audioRef.current;
    const target = Math.max(0, Math.min(audio.currentTime + delta, audio.duration || 9999));
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const handleChangePlaybackRate = (rate) => {
    setPlaybackRate(rate);
    audioRef.current.playbackRate = rate;
  };

  const handleSelectTrack = (track, openBig = false, targetViewMode = null) => {
    if (!track) return;
    try {
      window.history.pushState({ isaiyonApp: true, userActivated: Date.now() }, '', window.location.href);
    } catch (_) {}
    const index = tracks.findIndex(t => t.id === track.id);
    if (index !== -1) {
      // Preserve user playback intent
      const shouldPlay = isPlaying || isTransitioningRef.current || true;

      // Keep lock screen / floating notification visible with loading state
      isTransitioningRef.current = true;
      if (shouldPlay) {
        setIsAudioBuffering(true);
        setIsPlaying(true);
      }
      updateMediaSession(track, shouldPlay, shouldPlay);

      setCurrentTrackIndex(index);
      setCurrentTime(0);
      setDuration(track.duration || 0);
      const audio = audioRef.current;
      const candidates = getAudioStreamCandidates(track);
      streamCandidatesRef.current = candidates;
      candidateIndexRef.current = 0;
      const primaryUrl = candidates[0] || track.audioUrl;

      if (audio && primaryUrl) {
        activeTrackIdRef.current = track.id;
        // Directly set src without audio.load() so Android keeps audio focus alive
        audio.src = primaryUrl;
        audio.playbackRate = playbackRate;
        try {
          audio.currentTime = 0;
        } catch (_) {}

        if (shouldPlay) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                isTransitioningRef.current = false;
                setIsPlaying(true);
                setIsAudioBuffering(false);
                try { audio.currentTime = 0; } catch (_) {}
                setCurrentTime(0);
                if (navigator.mediaSession?.metadata) {
                  navigator.mediaSession.metadata.title = (track.title || '').replace(/_+/g, ' ');
                }
              })
              .catch((err) => {
                console.warn("Mobile audio autoplay restriction, trying auto-failover:", err);
                handleErrorRef.current?.();
              });
          }
        }
      }
    }
    handleRecordHeardTrack(track);
    setIsBottomPlayerDismissed(false);
    try {
      localStorage.setItem('isaiyon_last_track_id', track.id);
    } catch (_) {}
    if (openBig || targetViewMode === 'full') {
      setActivePage('nowplaying');
    }
  };

  const handleNext = () => {
    if (isQueueMode) {
      if (queue.length > 0) {
        const nextTrack = queue[0];
        setQueue(prev => prev.slice(1));
        if (currentTrack) {
          setQueueHistory(prev => [currentTrack, ...prev.filter(t => t.id !== currentTrack.id)].slice(0, 50));
        }
        handleSelectTrack(nextTrack, false);
        return;
      } else {
        setIsQueueMode(false);
        const randomTrack = getRandomTrack();
        if (randomTrack) {
          handleSelectTrack(randomTrack, false);
        }
        return;
      }
    }

    // Queue mode is OFF: only then random
    const randomTrack = getRandomTrack();
    if (randomTrack) {
      handleSelectTrack(randomTrack, false);
    } else if (tracks.length > 0) {
      const nextIndex = ((currentTrackIndex !== null && currentTrackIndex !== undefined ? currentTrackIndex : -1) + 1) % tracks.length;
      handleSelectTrack(tracks[nextIndex], false);
    }
  };
  handleNextRef.current = handleNext;

  const handleToggleQueueMode = () => {
    setIsQueueMode(prev => {
      const next = !prev;
      if (next) {
        setIsShuffle(false);
      }
      showToast(next ? "Queue ON" : "Queue OFF");
      return next;
    });
  };

  const handleToggleShuffle = () => {
    setIsShuffle(prev => {
      const next = !prev;
      if (next) {
        setIsQueueMode(false);
      }
      showToast(next ? "Shuffle ON" : "Shuffle OFF");
      return next;
    });
  };

  const handlePlayUnheard = (unheardList) => {
    if (!unheardList || unheardList.length === 0) return;
    handleSelectTrack(unheardList[0], false);
    if (unheardList.length > 1) {
      setQueue(unheardList.slice(1));
      setIsQueueMode(true);
      showToast("Playing Unheard");
    }
  };

  const handlePrev = () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    if (isQueueMode) {
      if (queueHistory.length > 0) {
        const prevTrack = queueHistory[0];
        setQueueHistory(prev => prev.slice(1));
        if (currentTrack) {
          setQueue(prev => [currentTrack, ...prev]);
        }
        handleSelectTrack(prevTrack, false);
        return;
      } else {
        setIsQueueMode(false);
        const randomTrack = getRandomTrack();
        if (randomTrack) {
          handleSelectTrack(randomTrack, false);
        }
        return;
      }
    }

    // Queue mode is OFF: only then random
    const randomTrack = getRandomTrack();
    if (randomTrack) {
      handleSelectTrack(randomTrack, false);
    } else if (tracks.length > 0) {
      const prevIndex = ((currentTrackIndex !== null && currentTrackIndex !== undefined ? currentTrackIndex : 0) - 1 + tracks.length) % tracks.length;
      handleSelectTrack(tracks[prevIndex], false);
    }
  };
  handlePrevRef.current = handlePrev;

  // Queue Operations
  const handleReorderQueue = (newQueue) => setQueue(newQueue);
  const handlePlayQueueTrack = (index) => {
    const selected = queue[index];
    const newQueue = queue.filter((_, i) => i !== index);
    setQueue(newQueue);
    if (currentTrack) {
      setQueueHistory(prev => [currentTrack, ...prev.filter(t => t.id !== currentTrack.id)].slice(0, 50));
    }
    handleSelectTrack(selected, false);
  };
  const handleRemoveFromQueue = (index) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };
  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(''), 2200);
  };

  const handleAddToQueue = (track) => {
    if (!queue.some(q => q.id === track.id)) {
      setQueue(prev => [...prev, track]);
      showToast("Queue Added");
    } else {
      showToast("Already Queued");
    }
  };

  // Playlists Management
  const handleCreatePlaylist = async (name) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'playlists'), {
        name,
        trackIds: [],
        createdAt: serverTimestamp()
      });
      showToast("Playlist Created");
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTrackInPlaylist = async (playlistId, trackId) => {
    if (!user) {
      alert('Please Sign In with Google to manage playlists!');
      return;
    }
    try {
      const targetPl = playlists.find(p => p.id === playlistId);
      if (!targetPl) return;
      const currentTrackIds = targetPl.trackIds || [];
      const isIn = currentTrackIds.includes(trackId);
      const updatedTrackIds = isIn
        ? currentTrackIds.filter(id => id !== trackId)
        : [...currentTrackIds, trackId];

      await setDoc(doc(db, 'users', user.uid, 'playlists', playlistId), {
        ...targetPl,
        trackIds: updatedTrackIds,
        updatedAt: serverTimestamp()
      }, { merge: true });

      showToast(isIn ? "Track Removed" : "Track Added");
    } catch (err) {
      console.error('Error updating playlist track:', err);
    }
  };

  const handleCreatePlaylistWithTrack = async (name, trackId) => {
    if (!user) {
      alert('Please Sign In with Google to create playlists!');
      return;
    }
    try {
      await addDoc(collection(db, 'users', user.uid, 'playlists'), {
        name,
        trackIds: trackId ? [trackId] : [],
        createdAt: serverTimestamp()
      });
      showToast("Playlist Created");
    } catch (err) {
      console.error('Error creating playlist with track:', err);
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!user || !confirm('Delete this playlist?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'playlists', playlistId));
      showToast("Playlist Deleted");
    } catch (err) {
      console.error(err);
    }
  };

  // Album Play All
  const handlePlayAlbum = (albumTracks) => {
    if (!albumTracks || albumTracks.length === 0) return;
    handleSelectTrack(albumTracks[0]);
    setQueue(albumTracks.slice(1));
    setSelectedMovie(null);
    setActivePage('nowplaying');
  };

  // Favorites
  const handleToggleFavorite = async (trackId) => {
    if (!user) {
      alert('Please Sign In with Google to save favorites!');
      return;
    }
    const isFav = favorites.includes(trackId);
    const updated = isFav ? favorites.filter(id => id !== trackId) : [...favorites, trackId];
    setFavorites(updated);

    try {
      const favDocRef = doc(db, 'users', user.uid, 'settings', 'favorites');
      await setDoc(favDocRef, { trackIds: updated, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  // Saved Albums
  const handleToggleSaveAlbum = async (movieName) => {
    if (!user) {
      alert('Please Sign In with Google to save albums to your Library!');
      return;
    }
    const trimmedName = movieName?.trim();
    if (!trimmedName) return;

    const isSaved = (savedAlbums || []).some(
      name => name?.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    const updated = isSaved 
      ? savedAlbums.filter(name => name?.trim().toLowerCase() !== trimmedName.toLowerCase()) 
      : [...savedAlbums.filter(name => name?.trim().toLowerCase() !== trimmedName.toLowerCase()), trimmedName];
    
    setSavedAlbums(updated);
    showToast(isSaved ? "Album Removed" : "Album Saved");

    try {
      localStorage.setItem(`isaiyon_albums_${user.uid}`, JSON.stringify(updated));
      const albumDocRef = doc(db, 'users', user.uid, 'settings', 'savedAlbums');
      await setDoc(albumDocRef, { albumNames: updated, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error('Error saving album:', err);
    }
  };

  // Share Track
  const handleShareTrack = (track) => {
    if (!track) return;
    const shareText = `Listening to "${track.title}" from "${track.movie || 'Sound Vault'}" on Isaiyon!`;
    if (navigator.share) {
      navigator.share({
        title: track.title,
        text: shareText,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText} - ${window.location.href}`);
      alert('Song details copied to clipboard!');
    }
  };

  // Admin YouTube Import (Keep modal open so user sees completion / details)
  const handleSaveTrack = async (trackData) => {
    try {
      await addDoc(collection(db, 'tracks'), {
        ...trackData,
        createdAt: serverTimestamp()
      });
      showToast('Track Saved');
    } catch (err) {
      alert('Error saving track: ' + err.message);
      throw err;
    }
  };

  // Admin Manage & Edit Vault Tracks
  const handleUpdateTrack = async (trackId, updatedFields) => {
    try {
      await updateDoc(doc(db, 'tracks', trackId), {
        ...updatedFields,
        updatedAt: serverTimestamp()
      });
      showToast('Track Updated');
    } catch (err) {
      alert('Error updating track: ' + err.message);
      throw err;
    }
  };

  const handleDeleteTrack = async (trackId) => {
    try {
      await deleteDoc(doc(db, 'tracks', trackId));
      showToast('Track Deleted');
    } catch (err) {
      alert('Error deleting track: ' + err.message);
      throw err;
    }
  };

  const suggestedTracks = tracks.filter(t => 
    t.id !== currentTrack?.id && !queue.some(q => q.id === t.id)
  );

  // Splash loading screen while checking auth state or completing 5-sec intro
  if (authLoading || !isSplashDone) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
        {/* Soft Background Radial Black Lighting Shadows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-black/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-slate-900/5 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Glowing Logo Centerpiece */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Outer Pulsing Black Aura Ring */}
          <div className="absolute w-40 h-40 rounded-3xl bg-black/10 animate-ping opacity-60" />
          <div className="absolute w-26 h-26 rounded-3xl bg-slate-900/10 blur-xl opacity-50" />
          
          <div className="relative w-40 h-40 rounded-3xl bg-white p-2.5 shadow-2xl shadow-black/25 border border-slate-200 flex items-center justify-center ">
            <img 
              src="/logo.png" 
              alt="Isaiyon" 
              className="w-full h-full rounded-2xl object-cover " 
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
          </div>
        </div>

        {/* Brand Title */}
        <div className="flex flex-col items-center gap-1.5 z-10 text-center mt-10">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 font-display">
            ISAIYON
          </h1>
          <p className="text-[14px] font-black tracking-widest text-slate-800 uppercase">
            Sound Vault
          </p>
        </div>

        {/* Dynamic Animated Equalizer Wave in Sleek Slate/Black */}
        <div className="flex items-end justify-center gap-1.5 h-15 mb-3 mt-14">
          <span className="w-1.5 bg-slate-900 rounded-full animate-[stemPulse_0.6s_ease-in-out_infinite] h-8" />
          <span className="w-1.5 bg-slate-700 rounded-full animate-[stemPulse_0.9s_ease-in-out_infinite] h-15 [animation-delay:150ms]" />
          <span className="w-1.5 bg-slate-900 rounded-full animate-[stemPulse_0.7s_ease-in-out_infinite] h-8 [animation-delay:300ms]" />
          <span className="w-1.5 bg-slate-700 rounded-full animate-[stemPulse_1.1s_ease-in-out_infinite] h-12 [animation-delay:450ms]" />
          <span className="w-1.5 bg-slate-900 rounded-full animate-[stemPulse_0.8s_ease-in-out_infinite] h-5 [animation-delay:200ms]" />
        </div>

      </div>
    );
  }

  // Not logged in -> gate entire app with LoginView
  if (!user) {
    return <LoginView isStandalone={isStandalone} onInstallApp={handleInstallApp} />;
  }

  return (
    <div className="min-h-screen bg-slate-950/5 flex justify-center text-slate-900 antialiased selection:bg-amber-100 selection:text-amber-800">
      <div className="w-full max-w-md min-h-screen bg-white shadow-2xl relative flex flex-col border-x border-slate-200/60 overflow-x-clip">
        {/* Top Mobile App Header */}
        <Navbar 
          user={user} 
          onOpenAdminModal={() => setIsAdminModalOpen(true)} 
          onOpenManageModal={() => setIsManageModalOpen(true)}
          onRefresh={handleRefreshData}
          isRefreshing={isRefreshing}
          isBuffering={isAudioBuffering}
        />

        {/* Main Screen Router */}
        <main className={`w-full pt-16 ${
          activePage === 'nowplaying' 
            ? 'flex-1 pb-20 px-3 flex flex-col justify-between' 
            : `flex-1 flex flex-col px-4 ${
                currentTrack && !isBottomPlayerDismissed
                  ? 'pb-40' 
                  : 'pb-20'
              }`
        }`}>
          {activePage === 'home' && (
            <HomePage 
              tracks={tracks}
              currentTrack={currentTrack}
              isBottomPlayerActive={Boolean(currentTrack && !isBottomPlayerDismissed)}
              isPlaying={isPlaying}
              onSelectTrack={handleSelectTrack}
              onPlayPause={handlePlayPause}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              savedAlbums={savedAlbums}
              onToggleSaveAlbum={handleToggleSaveAlbum}
              onOpenMovieModal={setSelectedMovie}
              onAddToQueue={handleAddToQueue}
              onOpenPlaylistModal={setPlaylistModalTrack}
              listenedHistory={listenedHistory}
              onPlayUnheard={handlePlayUnheard}
              onNavigateToSearch={handleNavigateToSearch}
              user={user}
            />
          )}

          {activePage === 'search' && (
            <SearchPage 
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onSelectTrack={handleSelectTrack}
              onPlayPause={handlePlayPause}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              playlists={playlists}
              onOpenMovieModal={setSelectedMovie}
              onAddToQueue={handleAddToQueue}
              onOpenPlaylistModal={setPlaylistModalTrack}
              searchHistory={searchHistory}
              onAddSearchHistory={handleAddSearchHistory}
              onRemoveSearchHistory={handleRemoveSearchHistory}
              onClearAllSearchHistory={handleClearAllSearchHistory}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              user={user}
            />
          )}

          {activePage === 'queue' && (
            <QueueDrawer 
              currentTrack={currentTrack}
              queue={queue}
              onReorderQueue={handleReorderQueue}
              onPlayQueueTrack={handlePlayQueueTrack}
              onRemoveFromQueue={handleRemoveFromQueue}
              suggestedTracks={suggestedTracks}
              onAddToQueue={handleAddToQueue}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
            />
          )}

          {activePage === 'history' && (
            <HistoryPage 
              listenedHistory={listenedHistory}
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onSelectTrack={handleSelectTrack}
              onPlayPause={handlePlayPause}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onAddToQueue={handleAddToQueue}
              onOpenPlaylistModal={setPlaylistModalTrack}
              onClearHistory={handleClearListenedHistory}
              user={user}
            />
          )}

          {activePage === 'library' && (
            <LibraryPage 
              tracks={tracks}
              favorites={favorites}
              savedAlbums={savedAlbums}
              onToggleSaveAlbum={handleToggleSaveAlbum}
              user={user}
              playlists={playlists}
              onCreatePlaylist={handleCreatePlaylist}
              onDeletePlaylist={handleDeletePlaylist}
              onSelectTrack={handleSelectTrack}
              onPlayPause={handlePlayPause}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onToggleFavorite={handleToggleFavorite}
              onOpenMovieModal={setSelectedMovie}
              onAddToQueue={handleAddToQueue}
              onOpenPlaylistModal={setPlaylistModalTrack}
            />
          )}

          {activePage === 'nowplaying' && (
            <VinylPlayer 
              currentTrack={currentTrack}
              isBottomPlayerActive={Boolean(currentTrack && !isBottomPlayerDismissed)}
              isPlaying={isPlaying}
              isBuffering={isAudioBuffering}
              currentTime={currentTime}
              duration={duration}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onPrev={handlePrev}
              onNext={handleNext}
              isFavorite={currentTrack ? favorites.includes(currentTrack.id) : false}
              onToggleFavorite={handleToggleFavorite}
              onAddToQueue={handleAddToQueue}
              onOpenPlaylistModal={setPlaylistModalTrack}
              isQueueMode={isQueueMode}
              onToggleQueueMode={handleToggleQueueMode}
              onOpenQueue={() => setActivePage('queue')}
              queueCount={queue.length}
              suggestedTracks={suggestedTracks}
              onSelectTrack={handleSelectTrack}
              onCollapsePlayer={() => {
                setActivePage(lastActivePageRef.current || 'home');
              }}
              onClosePlayer={handleClosePlayer}
              onOpenMovieModal={setSelectedMovie}
              sleepTimer={sleepTimer}
              onSetSleepTimer={setSleepTimer}
              playbackRate={playbackRate}
              onSetPlaybackRate={setPlaybackRate}
              onShareTrack={handleShareTrack}
              volume={volume}
              onSetVolume={setVolume}
              repeatMode={repeatMode}
              onToggleRepeatMode={handleToggleRepeatMode}
              isShuffle={isShuffle}
              onToggleShuffle={handleToggleShuffle}
              isSuggestedOpen={isSuggestedOpen}
              onToggleSuggestions={setIsSuggestedOpen}
              user={user}
            />
          )}
        </main>

        {/* Persistent Bottom Bar Player */}
        {((activePage !== 'nowplaying') || isSuggestedOpen) && currentTrack && !isBottomPlayerDismissed && !isAdminModalOpen && !isManageModalOpen && (
          <BottomPlayer 
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            isBuffering={isAudioBuffering}
            onPlayPause={handlePlayPause}
            onPrev={handlePrev}
            onNext={handleNext}
            isFavorite={currentTrack ? favorites.includes(currentTrack.id) : false}
            onToggleFavorite={handleToggleFavorite}
            user={user}
            onOpenFullPlayer={() => {
              setIsSuggestedOpen(false);
              setActivePage('nowplaying');
            }}
            onClose={handleClosePlayer}
          />
        )}

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-xl border-t border-slate-300 px-3 py-2 pb-4 flex items-center justify-around z-[70] shadow-[0_-4px_20px_rgba(0,0,0,0.03)] select-none">
          <button 
            className={`flex flex-col items-center justify-center py-2 px-2.5 rounded-2xl text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
              activePage === 'home' 
                ? 'text-white bg-black font-extrabold scale-105 shadow-xs' 
                : 'text-slate-700 hover:text-black'
            }`}
            onClick={() => setActivePage('home')}
          >
            <Home size={18} />
            <span className="mt-0.5">Home</span>
          </button>

          <button 
            className={`flex flex-col items-center justify-center py-2 px-2.5 rounded-2xl text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
              activePage === 'search' 
                ? 'text-white bg-black font-extrabold scale-105 shadow-xs' 
                : 'text-slate-700 hover:text-black'
            }`}
            onClick={() => setActivePage('search')}
          >
            <Search size={18} />
            <span className="mt-0.5">Search</span>
          </button>

          <button 
            className={`flex flex-col items-center justify-center py-2 px-2.5 rounded-2xl text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
              activePage === 'queue' 
                ? 'text-white bg-black font-extrabold scale-105 shadow-xs' 
                : 'text-slate-700 hover:text-black'
            }`}
            onClick={() => setActivePage('queue')}
          >
            <ListMusic size={18} />
            <span className="mt-0.5">Queue</span>
          </button>

          <button 
            className={`flex flex-col items-center justify-center py-2 px-2.5 rounded-2xl text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
              activePage === 'history' 
                ? 'text-white bg-black font-extrabold scale-105 shadow-xs' 
                : 'text-slate-700 hover:text-black'
            }`}
            onClick={() => setActivePage('history')}
          >
            <HistoryIcon size={18} />
            <span className="mt-0.5">History</span>
          </button>

          <button 
            className={`flex flex-col items-center justify-center py-2 px-2.5 rounded-2xl text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
              activePage === 'library' 
                ? 'text-white bg-black font-extrabold scale-105 shadow-xs' 
                : 'text-slate-700 hover:text-black'
            }`}
            onClick={() => setActivePage('library')}
          >
            <Library size={18} />
            <span className="mt-0.5">Library</span>
          </button>
        </nav>

        {/* Movie Details Modal */}
        <MovieDetailModal 
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          tracks={tracks}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onSelectTrack={handleSelectTrack}
          onPlayPause={handlePlayPause}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          savedAlbums={savedAlbums}
          onToggleSaveAlbum={handleToggleSaveAlbum}
          onPlayAlbum={handlePlayAlbum}
          onAddToQueue={handleAddToQueue}
          onOpenPlaylistModal={setPlaylistModalTrack}
          user={user}
        />

        {/* Secret Admin YouTube Importer Modal */}
        <AdminModal 
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          onSaveTrack={handleSaveTrack}
          tracks={tracks}
        />

        {/* Admin Manage & Edit Vault Tracks Modal */}
        <ManageSongsModal 
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
          tracks={tracks}
          onUpdateTrack={handleUpdateTrack}
          onDeleteTrack={handleDeleteTrack}
        />

        {/* Add to Playlist Modal */}
        <AddToPlaylistModal 
          track={playlistModalTrack}
          onClose={() => setPlaylistModalTrack(null)}
          playlists={playlists}
          user={user}
          onToggleTrackInPlaylist={handleToggleTrackInPlaylist}
          onCreatePlaylistWithTrack={handleCreatePlaylistWithTrack}
        />



        {/* Floating Quick Toast */}
        {toastMessage && (
          <div className="fixed top-22 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur-md border border-white/10 animate-[modalPop_0.2s_ease-out] pointer-events-none whitespace-nowrap text-center">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
