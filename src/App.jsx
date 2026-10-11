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
import { Home, Search, ListMusic, Library, Disc3, History as HistoryIcon } from 'lucide-react';
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
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
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

  // Queue state (Up Next)
  const [queue, setQueue] = useState([]);

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

  const currentTrack = tracks[currentTrackIndex] || tracks[0] || null;

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

  // 2. Real-time Tracks from Firestore (100% Dynamic DB)
  useEffect(() => {
    const tracksCol = collection(db, 'tracks');
    const unsubscribe = onSnapshot(tracksCol, (snapshot) => {
      if (!snapshot.empty) {
        const loadedTracks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setTracks(loadedTracks);
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
          handleSelectTrack(nextTrack);
        } else {
          // Intimation toast: queue is empty!
          showToast("Queue is empty! Playing random song from vault.");
          const randomTrack = getRandomTrack();
          if (randomTrack) handleSelectTrack(randomTrack);
        }
      } else {
        // Queue mode disabled -> auto-play random songs from DB
        const randomTrack = getRandomTrack();
        if (randomTrack) handleSelectTrack(randomTrack);
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
  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      if (!audio.src && currentTrack?.audioUrl) {
        audio.src = currentTrack.audioUrl;
      }
      audio.play().catch(() => {});
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

  const handleSelectTrack = (track) => {
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
  };

  const handleNext = () => {
    if (isQueueMode && queue.length > 0) {
      const nextTrack = queue[0];
      setQueue(prev => prev.slice(1));
      handleSelectTrack(nextTrack);
      return;
    }
    if (isQueueMode && queue.length === 0) {
      showToast("Queue is empty! Playing a random song from vault.");
    }
    const randomTrack = getRandomTrack();
    if (randomTrack) {
      handleSelectTrack(randomTrack);
    } else if (tracks.length > 0) {
      setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
      const audio = audioRef.current;
      setTimeout(() => {
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }, 50);
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
    handleSelectTrack(unheardList[0]);
    if (unheardList.length > 1) {
      setQueue(unheardList.slice(1));
      setIsQueueMode(true);
      showToast(`Playing unheard tracks (${unheardList.length} songs)!`);
    }
  };

  const handlePrev = () => {
    if (tracks.length === 0) return;
    const audio = audioRef.current;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setTimeout(() => {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }, 50);
  };

  // Queue Operations
  const handleReorderQueue = (newQueue) => setQueue(newQueue);
  const handlePlayQueueTrack = (index) => {
    const selected = queue[index];
    const newQueue = queue.filter((_, i) => i !== index);
    setQueue(newQueue);
    handleSelectTrack(selected);
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

  // Splash loading screen while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex flex-col items-center justify-center p-4 select-none">
        <div className="relative w-16 h-16 mb-4">
          <img 
            src="/logo.png" 
            alt="Isaiyon" 
            className="w-16 h-16 rounded-2xl shadow-xl shadow-amber-500/20 animate-pulse object-cover" 
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
        </div>
        <p className="text-xs font-black tracking-widest text-amber-400 uppercase animate-pulse">Isaiyon Sound Vault</p>
      </div>
    );
  }

  // Not logged in -> gate entire app with LoginView
  if (!user) {
    return <LoginView />;
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
            : `flex-1 flex flex-col ${currentTrack && !isBottomPlayerDismissed ? 'pb-24 px-4' : 'pb-16 px-4'}`
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
              onCollapsePlayer={() => setActivePage('home')}
              user={user}
            />
          )}
        </main>

        {/* Floating Bottom Mini Player (when browsing other pages) */}
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
            onClose={() => {
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current.removeAttribute('src');
                audioRef.current.load();
              }
              setIsPlaying(false);
              setIsBottomPlayerDismissed(true);
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
