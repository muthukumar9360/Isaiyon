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
import { Home, Search, ListMusic, Library, Disc3, History as HistoryIcon, Download } from 'lucide-react';
import { FALLBACK_ARTWORK } from './constants/fallbackArt';
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
  const [volume, setVolume] = useState(0.9);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('all'); // 'off' | 'all' | 'one'
  const [favorites, setFavorites] = useState([]);
  const [savedAlbums, setSavedAlbums] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [listenedHistory, setListenedHistory] = useState([]);
  const [isQueueMode, setIsQueueMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation: 'home' | 'search' | 'queue' | 'history' | 'library' | 'nowplaying'
  const [activePage, setActivePage] = useState('home');
  const [isBottomPlayerDismissed, setIsBottomPlayerDismissed] = useState(false);
  const [playerViewMode, setPlayerViewMode] = useState('mini'); // 'mini' | 'bar'

  // Queue state (Up Next) and history stack
  const [queue, setQueue] = useState([]);
  const [queueHistory, setQueueHistory] = useState([]);
  const [miniPosition, setMiniPosition] = useState({ x: 0, y: 0 });

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


  const handleNavigateToSearch = (queryTerm) => {
    setSearchQuery(queryTerm || '');
    setActivePage('search');
  };

  // Audio element reference
  const audioRef = useRef(new Audio());
  const sleepTimerRef = useRef(null);

  // 5-Second Splash Loading Screen Timer
  const [isSplashDone, setIsSplashDone] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashDone(true);
    }, 5000); // exactly 5 seconds
    return () => clearTimeout(timer);
  }, []);

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

  // Background Audio & Mobile Lock-Screen Notification Support via MediaSession
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentTrack) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title || 'Untitled Track',
          artist: currentTrack.artist || currentTrack.composer || 'Sound Vault',
          album: currentTrack.movie || 'IsaiVault',
          artwork: [
            { src: currentTrack.coverUrl || '/logo.png', sizes: '96x96', type: 'image/jpeg' },
            { src: currentTrack.coverUrl || '/logo.png', sizes: '128x128', type: 'image/jpeg' },
            { src: currentTrack.coverUrl || '/logo.png', sizes: '192x192', type: 'image/jpeg' },
            { src: currentTrack.coverUrl || '/logo.png', sizes: '512x512', type: 'image/jpeg' }
          ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
          audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          audioRef.current?.pause();
          setIsPlaying(false);
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          handlePrev();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          handleNext();
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
            setCurrentTime(details.seekTime);
          }
        });
      } catch (err) {
        console.warn("MediaSession error:", err);
      }
    } else {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      } catch {}
    }
  }, [currentTrack]);

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
        const loadedTracks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setTracks(loadedTracks);

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
      showToast("Listening history cleared");
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
    audio.volume = volume;
    audio.playbackRate = playbackRate;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || currentTrack?.duration || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
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
          // Warning/intimation toast: queue is empty!
          showToast("⚠️ Queue is empty!");
          const randomTrack = getRandomTrack();
          if (randomTrack) handleSelectTrack(randomTrack, false);
        }
      } else {
        // Queue mode disabled -> auto-play random songs from DB
        const randomTrack = getRandomTrack();
        if (randomTrack) handleSelectTrack(randomTrack, false);
      }
    };
    const handleError = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentTrack, queue, repeatMode, volume, playbackRate, sleepTimer, isQueueMode, tracks, listenedHistory, isBottomPlayerDismissed]);

  // 7. Track change & Lock-screen Media Session setup
  useEffect(() => {
    if (!currentTrack?.audioUrl) return;

    const audio = audioRef.current;
    if (!audio.src.endsWith(currentTrack.audioUrl)) {
      audio.src = currentTrack.audioUrl;
      audio.playbackRate = playbackRate;
      if (isPlaying) {
        audio.play().catch(() => {});
      }
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: `${currentTrack.artist}${currentTrack.movie ? ` (${currentTrack.movie})` : ''}`,
        album: currentTrack.movie || 'Isaiyon Music',
        artwork: [
          { 
            src: currentTrack.coverUrl || FALLBACK_ARTWORK, 
            sizes: '512x512', 
            type: 'image/png' 
          }
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
    }
  }, [currentTrack]);

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
    } else {
      if (!audio.src && currentTrack?.audioUrl) {
        audio.src = currentTrack.audioUrl;
      }
      audio.play().catch(() => {});
      setIsBottomPlayerDismissed(false);
      if (targetViewMode) {
        setPlayerViewMode(targetViewMode);
      }
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
      const audio = audioRef.current;
      audio.src = track.audioUrl;
      audio.playbackRate = playbackRate;
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
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
        showToast("⚠️ Queue is empty!");
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
      showToast(next 
        ? `Queue Mode ON (${queue.length} songs in queue)` 
        : "Queue Mode OFF (Auto-playing random songs from vault)"
      );
      return next;
    });
  };

  const handlePlayUnheard = (unheardList) => {
    if (!unheardList || unheardList.length === 0) return;
    handleSelectTrack(unheardList[0], false);
    if (unheardList.length > 1) {
      setQueue(unheardList.slice(1));
      setIsQueueMode(true);
      showToast(`Playing unheard tracks (${unheardList.length} songs)!`);
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
        showToast("⚠️ Queue is empty!");
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
      showToast(`Added "${track.title}" to queue`);
    } else {
      showToast(`"${track.title}" is already in queue`);
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
      showToast(`Playlist "${name}" created!`);
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

      showToast(isIn ? `Removed from "${targetPl.name}"` : `Added to "${targetPl.name}"!`);
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
      showToast(`Created "${name}" & added song!`);
    } catch (err) {
      console.error('Error creating playlist with track:', err);
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!user || !confirm('Delete this playlist?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'playlists', playlistId));
      showToast('Playlist deleted');
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
    showToast(isSaved ? `Removed "${trimmedName}" from saved albums` : `Saved "${trimmedName}" album to Library!`);

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
      showToast('Track permanently saved to Vault!');
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
      showToast('Track updated in vault successfully!');
    } catch (err) {
      alert('Error updating track: ' + err.message);
      throw err;
    }
  };

  const handleDeleteTrack = async (trackId) => {
    try {
      await deleteDoc(doc(db, 'tracks', trackId));
      showToast('Track removed from vault.');
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
      <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-amber-50/40 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
        {/* Soft Background Radial Lighting */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Glowing Logo Centerpiece */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Outer Pulsing Aura Ring */}
          <div className="absolute w-28 h-28 rounded-3xl bg-amber-400/25 animate-ping opacity-75" />
          <div className="absolute w-26 h-26 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-200 blur-xl opacity-60 animate-pulse" />
          
          <div className="relative w-20 h-20 rounded-3xl bg-white p-2.5 shadow-2xl shadow-amber-500/25 border border-amber-200/80 flex items-center justify-center transform hover:scale-105 transition-transform animate-[modalPop_0.6s_ease-out]">
            <img 
              src="/logo.png" 
              alt="Isaiyon" 
              className="w-full h-full rounded-2xl object-cover animate-pulse" 
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
          </div>
        </div>

        {/* Brand Title */}
        <div className="flex flex-col items-center gap-1.5 z-10 text-center">
          <h1 className="text-xl font-black tracking-tight text-slate-900 font-display">
            ISAIYON
          </h1>
          <p className="text-[15px] font-black tracking-widest text-amber-600 uppercase">
            Sound Vault
          </p>
        </div>

        {/* Dynamic Animated Equalizer Wave */}
        <div className="flex items-end justify-center gap-1.5 h-8 mt-5 mb-3">
          <span className="w-1.5 bg-amber-500 rounded-full animate-[stemPulse_0.6s_ease-in-out_infinite] h-4" />
          <span className="w-1.5 bg-slate-800 rounded-full animate-[stemPulse_0.9s_ease-in-out_infinite] h-7 [animation-delay:150ms]" />
          <span className="w-1.5 bg-amber-500 rounded-full animate-[stemPulse_0.7s_ease-in-out_infinite] h-5 [animation-delay:300ms]" />
          <span className="w-1.5 bg-slate-800 rounded-full animate-[stemPulse_1.1s_ease-in-out_infinite] h-8 [animation-delay:450ms]" />
          <span className="w-1.5 bg-amber-500 rounded-full animate-[stemPulse_0.8s_ease-in-out_infinite] h-3.5 [animation-delay:200ms]" />
        </div>

        <p className="text-xs font-semibold text-slate-400 animate-pulse tracking-wide">
          Tuning audio stream...
        </p>

        {/* Install / Download App button (Only shown when opened in browser, NOT in installed PWA) */}
        {!isStandalone && (
          <button
            type="button"
            onClick={handleInstallApp}
            className="mt-6 py-2 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95 transition-all cursor-pointer z-10"
          >
            <Download size={14} className="text-amber-400" />
            <span>Install App on Device</span>
          </button>
        )}
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
        />

        {/* Main Screen Router */}
        <main className={`w-full pt-16 ${
          activePage === 'nowplaying' 
            ? 'flex-1 min-h-screen pb-20 px-3 flex flex-col justify-between' 
            : `flex-1 flex flex-col px-4 ${
                currentTrack && !isBottomPlayerDismissed && playerViewMode === 'bar'
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
                setPlayerViewMode('mini');
                setActivePage(lastActivePageRef.current || 'home');
              }}
              user={user}
            />
          )}
        </main>

        {/* Floating Bottom Mini Player / Draggable Widget */}
        {activePage !== 'nowplaying' && currentTrack && !isBottomPlayerDismissed && (
          <BottomPlayer 
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onPrev={handlePrev}
            onNext={handleNext}
            isFavorite={currentTrack ? favorites.includes(currentTrack.id) : false}
            onToggleFavorite={handleToggleFavorite}
            user={user}
            onOpenFullPlayer={() => setActivePage('nowplaying')}
            playerViewMode={playerViewMode}
            onSetPlayerViewMode={setPlayerViewMode}
            position={miniPosition}
            onPositionChange={setMiniPosition}
            onClose={() => {
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current.removeAttribute('src');
                audioRef.current.load();
              }
              if ('mediaSession' in navigator) {
                try {
                  navigator.mediaSession.metadata = null;
                  navigator.mediaSession.playbackState = 'none';
                } catch {}
              }
              setIsPlaying(false);
              setCurrentTrackIndex(null);
              setIsBottomPlayerDismissed(true);
              try {
                localStorage.removeItem('isaiyon_last_track_id');
              } catch (_) {}
            }}
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

        {/* Floating Quick Toast */}
        {toastMessage && (
          <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur-md border border-white/10 animate-[modalPop_0.2s_ease-out] pointer-events-none">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
