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
import { Home, Search, ListMusic, Library, Disc3 } from 'lucide-react';
import { FALLBACK_ARTWORK } from './constants/fallbackArt';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  serverTimestamp 
} from './firebase/config';

export default function App() {
  const [user, setUser] = useState(null);
  
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
  const [playlists, setPlaylists] = useState([]);
  
  // Navigation: 'home' | 'search' | 'queue' | 'library' | 'nowplaying'
  const [activePage, setActivePage] = useState('home');

  // Queue state (Up Next)
  const [queue, setQueue] = useState([]);

  // Modals
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Audio element reference
  const audioRef = useRef(new Audio());
  const sleepTimerRef = useRef(null);

  const currentTrack = tracks[currentTrackIndex] || tracks[0] || null;

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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

  // 5. Initialize Queue when current track changes
  useEffect(() => {
    if (!currentTrack || tracks.length === 0) return;
    const suggestions = tracks.filter(t => t.id !== currentTrack.id);
    if (queue.length === 0 && suggestions.length > 0) {
      setQueue(suggestions.slice(0, 5));
    }
  }, [currentTrackIndex, tracks]);

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
      if (sleepTimer === 'track') {
        setIsPlaying(false);
        setSleepTimer(0);
        return;
      }
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else if (queue.length > 0) {
        const nextTrack = queue[0];
        setQueue(prev => prev.slice(1));
        handleSelectTrack(nextTrack);
      } else {
        handleNext();
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
  }, [currentTrack, queue, repeatMode, volume, playbackRate, sleepTimer]);

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
    const index = tracks.findIndex(t => t.id === track.id);
    if (index !== -1) {
      setCurrentTrackIndex(index);
      const audio = audioRef.current;
      audio.src = track.audioUrl;
      audio.playbackRate = playbackRate;
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleNext = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      setQueue(prev => prev.slice(1));
      handleSelectTrack(nextTrack);
      return;
    }
    if (tracks.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      setCurrentTrackIndex(randomIndex);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    }
    const audio = audioRef.current;
    setTimeout(() => {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }, 50);
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
  const handleAddToQueue = (track) => {
    setQueue(prev => [...prev, track]);
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!user || !confirm('Delete this playlist?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'playlists', playlistId));
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

  // Admin YouTube Import
  const handleSaveTrack = async (trackData) => {
    try {
      await addDoc(collection(db, 'tracks'), {
        ...trackData,
        createdAt: serverTimestamp()
      });
      setIsAdminModalOpen(false);
    } catch (err) {
      alert('Error saving track: ' + err.message);
    }
  };

  const suggestedTracks = tracks.filter(t => 
    t.id !== currentTrack?.id && !queue.some(q => q.id === t.id)
  );

  return (
    <div className="mobile-app-shell">
      {/* Top Mobile App Header */}
      <Navbar 
        user={user} 
        onOpenAdminModal={() => setIsAdminModalOpen(true)} 
      />

      {/* Main Screen Router */}
      <main className="mobile-content">
        {activePage === 'home' && (
          <HomePage 
            tracks={tracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onSelectTrack={handleSelectTrack}
            onPlayPause={handlePlayPause}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onOpenMovieModal={setSelectedMovie}
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

        {activePage === 'library' && (
          <LibraryPage 
            tracks={tracks}
            favorites={favorites}
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
            user={user}
          />
        )}
      </main>

      {/* Floating Bottom Mini Player (when browsing other pages) */}
      {activePage !== 'nowplaying' && currentTrack && (
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
        />
      )}

      {/* Bottom Navigation Bar (Spotify & YouTube Music Parity) */}
      <nav className="mobile-bottom-nav">
        <button 
          className={`nav-tab-item ${activePage === 'home' ? 'active' : ''}`}
          onClick={() => setActivePage('home')}
        >
          <Home size={19} />
          <span>Home</span>
        </button>

        <button 
          className={`nav-tab-item ${activePage === 'search' ? 'active' : ''}`}
          onClick={() => setActivePage('search')}
        >
          <Search size={19} />
          <span>Search</span>
        </button>

        <button 
          className={`nav-tab-item ${activePage === 'queue' ? 'active' : ''}`}
          onClick={() => setActivePage('queue')}
        >
          <ListMusic size={19} />
          <span>Queue ({queue.length})</span>
        </button>

        <button 
          className={`nav-tab-item ${activePage === 'library' ? 'active' : ''}`}
          onClick={() => setActivePage('library')}
        >
          <Library size={19} />
          <span>Library</span>
        </button>

        <button 
          className={`nav-tab-item ${activePage === 'nowplaying' ? 'active' : ''}`}
          onClick={() => setActivePage('nowplaying')}
        >
          <Disc3 size={19} />
          <span>Player</span>
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
        onPlayAlbum={handlePlayAlbum}
        user={user}
      />

      {/* Secret Admin YouTube Importer Modal */}
      <AdminModal 
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSaveTrack={handleSaveTrack}
      />
    </div>
  );
}
