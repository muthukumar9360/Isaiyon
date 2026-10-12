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
import { Home, Search, ListMusic, Library, Disc3, History as HistoryIcon, Download, LogOut, AlertCircle } from 'lucide-react';
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
      return saved !== null ? parseFloat(saved) : 0.9;
    } catch (_) {
      return 0.9;
    }
  });
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(() => {
    try {
      return localStorage.getItem('isaiyon_repeat_mode') || 'all';
    } catch (_) {
      return 'all';
    }
  });
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
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef(null);

  // Mobile Back Button / Edge Swipe Navigation & Exit Confirm
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

  const isExitModalOpenRef = useRef(isExitModalOpen);
  isExitModalOpenRef.current = isExitModalOpen;

  const lastBackActionTimeRef = useRef(0);

  const handleNavigationBackAction = () => {
    // 1. If Exit Confirmation dialog is open -> close it
    if (isExitModalOpenRef.current) {
      setIsExitModalOpen(false);
      return;
    }

    // 2. If any modal is open -> close it
    if (isAdminModalOpenRef.current) {
      setIsAdminModalOpen(false);
      return;
    }
    if (isManageModalOpenRef.current) {
      setIsManageModalOpen(false);
      return;
    }
    if (playlistModalTrackRef.current) {
      setPlaylistModalTrack(null);
      return;
    }
    if (selectedMovieRef.current) {
      setSelectedMovie(null);
      return;
    }

    // 3. If expanded VinylPlayer is open -> minimize to previous view
    if (activePageRef.current === 'nowplaying') {
      setActivePage(lastActivePageRef.current || 'home');
      return;
    }

    // 4. If on any other page (search, library, queue, history) -> return directly to home
    if (activePageRef.current !== 'home') {
      setActivePage('home');
      return;
    }

    // 5. If on home page (whether bottom player is ON or OFF!) -> prompt exit confirmation dialog
    setIsExitModalOpen(true);
  };

  const triggerBackAction = () => {
    const now = Date.now();
    if (now - lastBackActionTimeRef.current < 400) return; // Debounce duplicate triggers from OS gesture & touch
    lastBackActionTimeRef.current = now;
    handleNavigationBackAction();
  };

  useEffect(() => {
    // Keep history trap alive so browser doesn't close abruptly
    window.history.pushState({ isaiyonApp: true }, '');

    const handlePopState = () => {
      window.history.pushState({ isaiyonApp: true }, '');
      triggerBackAction();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Mobile edge swipe detection: swiping inward from left or right screen edge triggers unified in-app back
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e) => {
      if (e.changedTouches.length !== 1) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const elapsedTime = Date.now() - touchStartTime;

      const screenWidth = window.innerWidth;
      // Edge swipe: touch begins within 45px of screen edge and swipes inward > 60px
      const isFromLeftEdge = touchStartX <= 45 && deltaX > 60;
      const isFromRightEdge = touchStartX >= screenWidth - 45 && deltaX < -60;

      if ((isFromLeftEdge || isFromRightEdge) && Math.abs(deltaY) < Math.abs(deltaX) * 0.8 && elapsedTime < 500) {
        triggerBackAction();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Globally prevent browser pull-to-refresh when dragging down at top of page across all screens
  useEffect(() => {
    let startY = 0;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length !== 1) return;
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      // Only cancel if pulling DOWN from the top of the viewport
      if (deltaY > 0) {
        const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        if (scrollTop <= 0) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const handleConfirmExitApp = () => {
    setIsExitModalOpen(false);
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
    try {
      window.close();
    } catch (_) {}
    setTimeout(() => {
      try {
        window.history.go(-2);
      } catch (_) {}
    }, 120);
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
    }, 3800);
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

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch {}
  }, [isPlaying]);

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
        const loadedTracks = snapshot.docs.map(d => {
          const data = d.data();
          const trk = {
            id: d.id,
            ...data,
            title: cleanDisplay(data.title),
            movie: cleanDisplay(data.movie),
            artist: cleanDisplay(data.artist),
            composer: cleanDisplay(data.composer),
            actors: cleanDisplay(data.actors)
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
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsAudioBuffering(true);
    const handlePlaying = () => {
      setIsAudioBuffering(false);
      setIsPlaying(true);
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
        audio.load();
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setIsAudioBuffering(false);
            })
            .catch(() => {});
        }
        return;
      }

      setIsPlaying(false);
      setIsAudioBuffering(false);
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

  // 7. Track change & Lock-screen Media Session setup with Instant Buffering Display
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
          audio.load();
          audio.play().then(() => {
            setIsAudioBuffering(false);
            try { audio.currentTime = 0; } catch (_) {}
            setCurrentTime(0);
          }).catch((err) => {
            console.warn("Track change play error:", err);
            handleError();
          });
        }
      }
    }

    if ('mediaSession' in navigator) {
      try {
        const cleanTitle = (currentTrack.title || '').replace(/_+/g, ' ');
        const cleanMovie = (currentTrack.movie || '').replace(/_+/g, ' ');
        const cleanArtist = (currentTrack.artist || 'Pure Sound').replace(/_+/g, ' ');
        const titleText = isAudioBuffering ? `⏳ Loading: ${cleanTitle}` : cleanTitle;
        navigator.mediaSession.metadata = new MediaMetadata({
          title: titleText,
          artist: `${cleanArtist}${cleanMovie ? ` (${cleanMovie})` : ''}`,
          album: cleanMovie || 'Isaiyon Sound Vault',
          artwork: [
            { src: currentTrack.coverUrl || FALLBACK_ARTWORK, sizes: '96x96', type: 'image/jpeg' },
            { src: currentTrack.coverUrl || FALLBACK_ARTWORK, sizes: '128x128', type: 'image/jpeg' },
            { src: currentTrack.coverUrl || FALLBACK_ARTWORK, sizes: '192x192', type: 'image/jpeg' },
            { src: currentTrack.coverUrl || FALLBACK_ARTWORK, sizes: '512x512', type: 'image/jpeg' }
          ]
        });

        navigator.mediaSession.setActionHandler('play', () => audio.play());
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
        navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
        navigator.mediaSession.setActionHandler('nexttrack', handleNext);
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          handleSkipSeconds(-(details.seekOffset || 10));
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          handleSkipSeconds(details.seekOffset || 10);
        });
      } catch (err) {
        console.warn("MediaSession error:", err);
      }
    }
  }, [currentTrack, isAudioBuffering]);

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

  // 8. Sleep Timer Countdown Logic
  useEffect(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    if (sleepTimer && typeof sleepTimer === 'number' && sleepTimer > 0) {
      sleepTimerRef.current = setTimeout(() => {
        const audio = audioRef.current;
        audio.pause();
        setIsPlaying(false);
        setSleepTimer(0);
        alert('Sleep timer completed. Audio paused.');
      }, sleepTimer * 60 * 1000);
    }

    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, [sleepTimer]);

  // Playback Control Handlers
  const handlePlayPause = (targetViewMode = 'bar') => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
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
          audio.load();
        }
      }
      setIsAudioBuffering(true);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsAudioBuffering(false);
          })
          .catch((err) => {
            console.warn("Play error, trying auto-failover:", err);
            handleError();
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
    const index = tracks.findIndex(t => t.id === track.id);
    if (index !== -1) {
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
        audio.src = primaryUrl;
        audio.playbackRate = playbackRate;
        try {
          audio.currentTime = 0;
        } catch (_) {}
        setIsAudioBuffering(true);
        audio.load();
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setIsAudioBuffering(false);
              try { audio.currentTime = 0; } catch (_) {}
              setCurrentTime(0);
            })
            .catch((err) => {
              console.warn("Mobile audio autoplay restriction, trying auto-failover:", err);
              handleError();
            });
        }
      }
    }
    handleRecordHeardTrack(track);
    setIsBottomPlayerDismissed(false);
    try {
      localStorage.setItem('isaiyon_last_track_id', track.id);
    } catch (_) {}
    if (openBig) {
      setActivePage('nowplaying');
    } else if (targetViewMode) {
      setPlayerViewMode(targetViewMode);
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

  const handleToggleQueueMode = () => {
    setIsQueueMode(prev => {
      const next = !prev;
      showToast(next ? "Queue ON" : "Queue OFF");
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
      <div className="w-full max-w-md min-h-screen bg-white shadow-2xl relative flex flex-col border-x border-slate-200/60 overflow-x-hidden">
        {/* Top Mobile App Header */}
        <Navbar 
          user={user} 
          onOpenAdminModal={() => setIsAdminModalOpen(true)} 
          onOpenManageModal={() => setIsManageModalOpen(true)}
          onRefresh={handleRefreshData}
          isRefreshing={isRefreshing}
        />

        {/* Main Screen Router */}
        <main className={`w-full pt-16 ${
          activePage === 'nowplaying' 
            ? 'flex-1 min-h-screen pb-20 px-3 flex flex-col justify-between' 
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
              queueCount={queue.length}
              onCollapsePlayer={() => {
                setActivePage(lastActivePageRef.current || 'home');
              }}
              onClosePlayer={handleCloseEntireApp}
              user={user}
            />
          )}
        </main>

        {/* Persistent Bottom Bar Player */}
        {activePage !== 'nowplaying' && currentTrack && !isBottomPlayerDismissed && (
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
            onOpenFullPlayer={() => setActivePage('nowplaying')}
            onClose={handleCloseEntireApp}
          />
        )}

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-xl border-t border-slate-300 px-3 py-2 pb-4 flex items-center justify-around z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] select-none">
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



        {/* Mobile PWA Exit Confirmation Modal */}
        {isExitModalOpen && (
          <div 
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-[modalPop_0.2s_ease-out]"
            onClick={() => setIsExitModalOpen(false)}
          >
            <div 
              className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center gap-3 border border-slate-100"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                <LogOut size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 font-display">Exit Isaiyon?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to exit the application?
                </p>
              </div>
              <div className="flex gap-2 w-full mt-1">
                <button
                  type="button"
                  onClick={() => setIsExitModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExitApp}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  Exit App
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Quick Toast */}
        {toastMessage && (
          <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur-md border border-white/10 animate-[modalPop_0.2s_ease-out] pointer-events-none whitespace-nowrap text-center">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
