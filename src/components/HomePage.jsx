import React, { useState, useMemo, useRef } from 'react';
import { 
  Play, 
  Heart, 
  Film, 
  Users, 
  Volume2, 
  Shuffle, 
  ListPlus, 
  FolderPlus,
  Sparkles,
  CheckCircle2,
  Music,
  Disc3,
  TrendingUp,
  Compass,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  Flame,
  Radio,
  Star,
  Zap,
  Headphones,
  ArrowRight,
  Eye,
  Bookmark
} from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

// Curated Actor & Artist Playlists with Verified Portrait Images
const ARTIST_SPOTLIGHTS = [
  {
    id: 'suriya',
    name: 'Suriya Hits',
    subtitle: 'Romance & Mass Anthems',
    query: 'Suriya',
    badge: 'Spotlight',
    icon: Star,
    imageUrl: '/actors/suriya.jpg',
    gradient: 'from-blue-600 via-indigo-700 to-slate-950',
    border: 'border-blue-400/40'
  },
  {
    id: 'dhanush',
    name: 'Dhanush Hits',
    subtitle: 'Soulful Folk & Classics',
    query: 'Dhanush',
    badge: 'Spotlight',
    icon: Flame,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    gradient: 'from-amber-500 via-orange-600 to-slate-950',
    border: 'border-amber-400/40'
  },
  {
    id: 'vijay',
    name: 'Thalapathy Vijay',
    subtitle: 'Celebration & High Energy',
    query: 'Vijay',
    badge: 'Blockbuster',
    icon: Zap,
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
    gradient: 'from-rose-600 via-red-700 to-slate-950',
    border: 'border-rose-400/40'
  },
  {
    id: 'ajith',
    name: 'Ajith Kumar',
    subtitle: 'Ultimate Style & Swag',
    query: 'Ajith',
    badge: 'Classics',
    icon: Sparkles,
    imageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500&auto=format&fit=crop&q=80',
    gradient: 'from-emerald-600 via-teal-700 to-slate-950',
    border: 'border-emerald-400/40'
  },
  {
    id: 'anirudh',
    name: 'Anirudh Waves',
    subtitle: 'Viral Beats & Party Hits',
    query: 'Anirudh',
    badge: 'Rockstar',
    icon: Headphones,
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    gradient: 'from-fuchsia-600 via-purple-700 to-slate-950',
    border: 'border-fuchsia-400/40'
  },
  {
    id: 'rahman',
    name: 'A.R. Rahman Magic',
    subtitle: 'Oscar-Winning Masterpieces',
    query: 'Rahman',
    badge: 'Maestro',
    icon: Disc3,
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    gradient: 'from-yellow-600 via-amber-700 to-stone-950',
    border: 'border-yellow-400/40'
  },
  {
    id: 'yuvan',
    name: 'Yuvan Drugs',
    subtitle: 'Late Night Soul & BGM King',
    query: 'Yuvan',
    badge: 'BGM King',
    icon: Radio,
    imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=500&auto=format&fit=crop&q=80',
    gradient: 'from-indigo-600 via-purple-800 to-slate-950',
    border: 'border-purple-400/40'
  },
  {
    id: 'harris',
    name: 'Harris Jayaraj',
    subtitle: 'Acoustic Bliss & Melodies',
    query: 'Harris',
    badge: 'Melody King',
    icon: Music,
    imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500&auto=format&fit=crop&q=80',
    gradient: 'from-cyan-600 via-teal-700 to-slate-950',
    border: 'border-cyan-400/40'
  }
];

// Curated Genre & Vibe Stations (Grid Layout)
const GENRE_STATIONS = [
  {
    id: 'melody',
    name: 'Melody & Soul',
    subtitle: 'Calm & Heartfelt',
    query: 'Melody',
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50/70',
    border: 'border-rose-200/80',
    text: 'text-rose-950',
    icon: Heart
  },
  {
    id: 'mass',
    name: 'Mass & Folk',
    subtitle: 'High Energy Anthems',
    query: 'Mass',
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50/70',
    border: 'border-amber-200/80',
    text: 'text-amber-950',
    icon: Flame
  },
  {
    id: 'love',
    name: 'Love & Romance',
    subtitle: 'Soulful Moments',
    query: 'Love',
    gradient: 'from-red-500 to-rose-600',
    bg: 'bg-red-50/70',
    border: 'border-red-200/80',
    text: 'text-red-950',
    icon: Sparkles
  },
  {
    id: 'failure',
    name: 'Soul Therapy',
    subtitle: 'Deep Emotions',
    query: 'Failure',
    gradient: 'from-indigo-500 to-purple-600',
    bg: 'bg-indigo-50/70',
    border: 'border-indigo-200/80',
    text: 'text-indigo-950',
    icon: TrendingUp
  },
  {
    id: 'retro',
    name: '2000s Nostalgia',
    subtitle: 'Golden Vault Hits',
    query: '200',
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200/80',
    text: 'text-emerald-950',
    icon: Disc3
  },
  {
    id: 'acoustic',
    name: 'Acoustic Bliss',
    subtitle: 'Breeze & Guitar Strings',
    query: 'Acoustic',
    gradient: 'from-cyan-500 to-blue-600',
    bg: 'bg-cyan-50/70',
    border: 'border-cyan-200/80',
    text: 'text-cyan-950',
    icon: Music
  }
];

const SONGS_PER_PAGE = 7;

export default function HomePage({
  tracks = [],
  currentTrack,
  isPlaying,
  onSelectTrack,
  onPlayPause,
  favorites = [],
  onToggleFavorite,
  savedAlbums = [],
  onToggleSaveAlbum,
  onOpenMovieModal,
  onAddToQueue,
  onOpenPlaylistModal,
  listenedHistory = [],
  onPlayUnheard,
  onNavigateToSearch,
  user
}) {
  const [selectedFilter, setSelectedFilter] = useState('unheard'); // 'unheard' | 'all' | 'heard'
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllMovies, setShowAllMovies] = useState(false);
  const [isMovieSearchOpen, setIsMovieSearchOpen] = useState(false);
  const [movieSearchQuery, setMovieSearchQuery] = useState('');
  const [sliderScrollProgress, setSliderScrollProgress] = useState(0);
  const sliderRef = useRef(null);

  const handleSliderScroll = (e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      setSliderScrollProgress(Math.max(0, Math.min(1, scrollLeft / maxScroll)));
    }
  };

  const handleTrackClick = (e) => {
    if (!sliderRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const maxScroll = sliderRef.current.scrollWidth - sliderRef.current.clientWidth;
    sliderRef.current.scrollTo({ left: ratio * maxScroll, behavior: 'smooth' });
  };

  // Reset page when filter changes
  const handleFilterChange = (newFilter) => {
    setSelectedFilter(newFilter);
    setCurrentPage(1);
  };

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', icon: '🌅' };
    if (hour < 17) return { text: 'Good Afternoon', icon: '☀️' };
    return { text: 'Good Evening', icon: '🌙' };
  }, []);

  const userName = user?.displayName ? user.displayName.split(' ')[0] : 'Music Lover';

  // Set of track IDs already heard by this user
  const heardTrackIds = useMemo(() => {
    return new Set(listenedHistory.map(h => h.trackId));
  }, [listenedHistory]);

  // Tracks not yet heard by this user
  const unheardTracks = useMemo(() => {
    return tracks.filter(t => !heardTrackIds.has(t.id));
  }, [tracks, heardTrackIds]);

  // Tracks already heard by this user
  const heardTracks = useMemo(() => {
    return tracks.filter(t => heardTrackIds.has(t.id));
  }, [tracks, heardTrackIds]);

  // Dynamically group tracks into Movie Soundtracks from the database
  const movieCollections = useMemo(() => {
    const map = {};
    tracks.forEach(t => {
      const movieKey = t.movie?.trim() || 'Singles';
      if (!map[movieKey]) {
        map[movieKey] = {
          id: `movie-${movieKey.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: movieKey,
          year: t.year || 'Cinema',
          composer: t.composer || 'Soundtrack',
          actors: t.actors || 'Featured Cast',
          coverUrl: t.coverUrl,
          trackCount: 0
        };
      }
      map[movieKey].trackCount++;
    });
    return Object.values(map);
  }, [tracks]);

  // Filtered movies inside the Show All modal
  const filteredAllMovies = useMemo(() => {
    if (!movieSearchQuery.trim()) return movieCollections;
    const q = movieSearchQuery.toLowerCase();
    return movieCollections.filter(m => 
      m.name?.toLowerCase().includes(q) ||
      m.composer?.toLowerCase().includes(q) ||
      m.actors?.toLowerCase().includes(q) ||
      m.year?.toString().includes(q)
    );
  }, [movieCollections, movieSearchQuery]);

  // Tracks to display based on selected filter
  const displayedTracks = useMemo(() => {
    if (selectedFilter === 'unheard') {
      return unheardTracks;
    }
    if (selectedFilter === 'heard') {
      return heardTracks;
    }
    return tracks;
  }, [selectedFilter, unheardTracks, heardTracks, tracks]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(displayedTracks.length / SONGS_PER_PAGE));
  const paginatedTracks = useMemo(() => {
    const start = (currentPage - 1) * SONGS_PER_PAGE;
    return displayedTracks.slice(start, start + SONGS_PER_PAGE);
  }, [displayedTracks, currentPage]);

  // Quick action: Play all unheard tracks continuously
  const handlePlayAllUnheard = () => {
    if (unheardTracks.length === 0) return;
    if (onPlayUnheard) {
      onPlayUnheard(unheardTracks);
    } else {
      onSelectTrack(unheardTracks[0]);
      if (onAddToQueue && unheardTracks.length > 1) {
        unheardTracks.slice(1).forEach(t => onAddToQueue(t));
      }
    }
  };

  // Helper to count tracks matching a search keyword
  const getMatchCount = (keyword) => {
    const q = keyword.toLowerCase();
    return tracks.filter(t => 
      t.actors?.toLowerCase().includes(q) ||
      t.composer?.toLowerCase().includes(q) ||
      t.movie?.toLowerCase().includes(q) ||
      t.title?.toLowerCase().includes(q) ||
      t.genre?.toLowerCase().includes(q) ||
      t.mood?.toLowerCase().includes(q)
    ).length;
  };

  return (
    <div className="w-full mt-6 flex flex-col gap-5 select-none">
      
      {/* 1. Dynamic Welcome Hero Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-black p-5 text-white shadow-xl border border-white/10">
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <span>{greeting.icon}</span>
              <span>{greeting.text}</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight font-display text-white">
              Hello, {userName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5 leading-snug">
              Fresh songs waiting for you. Hear all without repeating.
            </p>
          </div>

          {unheardTracks.length > 0 ? (
            <button
              onClick={handlePlayAllUnheard}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play size={14} fill="#ffffff" />
              <span>Play Random Songs</span>
            </button>
          ) : (
            <button
              onClick={() => tracks[0] && onSelectTrack(tracks[0])}
              className="w-full py-2.5 px-4 rounded-2xl bg-white/15 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>Replay Vault Catalog</span>
            </button>
          )}
        </div>
      </section>

      {/* 2. Cinema Soundtracks - Featured 1st Two Albums in One Row (Two Columns) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-display">
              Movie Soundtracks
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Featured albums ({movieCollections.length} total)
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAllMovies(true);
              setIsMovieSearchOpen(false);
              setMovieSearchQuery('');
            }}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 border border-amber-200/60 shadow-2xs"
            title="View all movie soundtracks"
          >
            <Eye size={14} className="text-amber-600" />
            <span>Show All</span>
          </button>
        </div>

        {/* First two albums displayed in one row of 2 columns */}
        <div className="grid grid-cols-2 gap-2">
          {movieCollections.slice(0, 2).map(movie => {
            const isSaved = (savedAlbums || []).some(
              s => s?.trim().toLowerCase() === movie.name?.trim().toLowerCase()
            );
            return (
              <div 
                key={movie.id} 
                onClick={() => onOpenMovieModal(movie)}
                className="flex flex-col cursor-pointer group active:scale-[0.98] transition-all duration-150 bg-slate-50 border border-black/40 rounded-2xl p-2.5 hover:shadow-md hover:border-amber-400"
              >
                <div className="w-full h-30 rounded-xl overflow-hidden relative shadow-md shadow-slate-900/5 bg-slate-100">
                  <img 
                    src={movie.coverUrl || FALLBACK_ARTWORK} 
                    alt={movie.name} 
                    className="w-full h-full object-fit group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_ARTWORK;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end justify-start p-2">
                    <div className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-900 shadow-md">
                      <Film size={13} className="text-amber-600" />
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                      {movie.name}
                    </h4>
                    <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                      {movie.trackCount} {movie.trackCount === 1 ? 'song' : 'songs'} • {movie.composer}
                    </p>
                    {movie.actors && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {movie.actors}
                      </p>
                    )}
                  </div>
                  {onToggleSaveAlbum && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSaveAlbum(movie.name);
                      }}
                      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-xs border ${
                        isSaved 
                          ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      title={isSaved ? "Saved in Library" : "Save Album"}
                    >
                      <Bookmark size={17} fill={isSaved ? "#ffffff" : "none"} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Actor & Artist Spotlight Playlists (HORIZONTAL SLIDER - CLEARLY VISIBLE X-AXIS SCROLL) */}
      <section className="flex flex-col gap-3 px-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-display flex items-center gap-1.5">
              <span>Artist & Actor Playlists</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Curated collections from iconic stars
            </p>
          </div>
        </div>

        {/* Horizontal Slider with visibly active x-axis scrollbar */}
        <div 
          ref={sliderRef}
          onScroll={handleSliderScroll}
          className="flex gap-3.5 overflow-x-auto pb-2 snap-x scroll-smooth custom-slider-track"
        >
          {ARTIST_SPOTLIGHTS.map(artist => {
            const Icon = artist.icon;
            const count = getMatchCount(artist.query);

            return (
              <div
                key={artist.id}
                onClick={() => onNavigateToSearch?.(artist.query)}
                className={`shrink-0 w-42 h-52 rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden cursor-pointer select-none snap-start active:scale-95 transition-all duration-200 bg-gradient-to-br ${artist.gradient} border ${artist.border} shadow-lg group`}
              >
                {/* Real Actor Portrait Photo from Internet / Public Vault */}
                <img 
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-95"
                  onError={(e) => {
                    const fallbackTrack = tracks.find(t => 
                      t.actors?.toLowerCase().includes(artist.query.toLowerCase()) || 
                      t.composer?.toLowerCase().includes(artist.query.toLowerCase())
                    );
                    if (fallbackTrack?.coverUrl && e.currentTarget.src !== fallbackTrack.coverUrl) {
                      e.currentTarget.src = fallbackTrack.coverUrl;
                    } else {
                      e.currentTarget.src = FALLBACK_ARTWORK;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-black/25 pointer-events-none" />

                {/* Top Bar with Badge & Icon */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-amber-300 border border-white/10 shadow-xs">
                    {artist.badge}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-xs">
                    <Icon size={13} />
                  </div>
                </div>

                {/* Bottom Details */}
                <div className="relative z-10 flex flex-col gap-0.5 pt-6">
                  <h4 className="text-sm font-black font-display tracking-tight text-white leading-tight truncate drop-shadow-sm">
                    {artist.name}
                  </h4>
                  <p className="text-[11px] text-slate-200 font-medium truncate drop-shadow-sm">
                    {artist.subtitle}
                  </p>
                  <div className="flex items-center justify-between mt-1.5 text-[11px] font-bold text-amber-300">
                    <span>{count > 0 ? `${count} tracks` : 'Curated'}</span>
                    <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center group-hover:translate-x-0.5 transition-transform shadow-xs">
                      <ArrowRight size={12} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Genres & Vibes Stations (UNIQUE NON-SLIDER BENTO GRID) */}
      <section className="flex flex-col gap-3 px-1 pb-5 border-b border-black">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-display flex items-center gap-1.5">
              <Radio size={18} className="text-rose-500" />
              <span>Genres & Vibes</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Tap any vibe to explore songs
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">All Vibes</span>
        </div>

        {/* 2-Column Responsive Bento Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {GENRE_STATIONS.map(station => {
            const Icon = station.icon;
            const count = getMatchCount(station.query);

            return (
              <div
                key={station.id}
                onClick={() => onNavigateToSearch?.(station.query)}
                className={`p-3 rounded-2xl border ${station.border} ${station.bg} hover:shadow-md transition-all active:scale-95 cursor-pointer flex flex-col justify-between gap-3 group shadow-2xs relative overflow-hidden`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${station.gradient} flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform`}>
                    <Icon size={15} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-200/60">
                    {count > 0 ? `${count} songs` : 'Curated'}
                  </span>
                </div>

                <div>
                  <h4 className={`text-xs sm:text-sm font-black font-display truncate ${station.text}`}>
                    {station.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                    {station.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Refined Exploration Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-2xs">
        <button
          onClick={() => handleFilterChange('unheard')}
          className={`flex-1 py-2 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedFilter === 'unheard'
              ? 'bg-black text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles size={14} className={selectedFilter === 'unheard' ? 'text-amber-400' : ''} />
          <span>Unheard ({unheardTracks.length})</span>
        </button>

         <button
          onClick={() => handleFilterChange('heard')}
          className={`flex-1 py-2 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedFilter === 'heard'
              ? 'bg-black text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 size={14} />
          <span>Heard ({heardTracks.length})</span>
        </button>

        <button
          onClick={() => handleFilterChange('all')}
          className={`flex-1 py-2 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedFilter === 'all'
              ? 'bg-black text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Music size={14} />
          <span>All ({tracks.length})</span>
        </button>

       
      </div>

      {/* 6. Paginated Tracklist Section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-display -mt-2">
              {selectedFilter === 'unheard' 
                ? 'Unheard Songs' 
                : selectedFilter === 'heard' 
                ? 'Already Heard Songs' 
                : 'All Vault Songs'
              }
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Page {currentPage} of {totalPages} • {displayedTracks.length} total songs
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {paginatedTracks.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Sparkles size={32} className="mx-auto mb-2 opacity-30 text-amber-500" />
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                {selectedFilter === 'unheard' 
                  ? "🎉 You have heard all available songs!" 
                  : "No songs found for this filter."
                }
              </p>
              {selectedFilter === 'unheard' && (
                <p className="text-xs text-slate-400 mt-1">
                  Switch to "All" or "Heard" tab to replay your favorite tracks.
                </p>
              )}
            </div>
          ) : (
            paginatedTracks.map(track => {
              const isCurrent = currentTrack?.id === track.id;
              const isFav = favorites.includes(track.id);
              const isHeard = heardTrackIds.has(track.id);

              return (
                <div 
                  key={track.id} 
                  onClick={() => onSelectTrack(track)}
                  className={`p-2.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] ${
                    isCurrent 
                      ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-400/40 shadow-xs' 
                      : 'bg-white hover:bg-slate-50 border-slate-100 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img 
                      src={track.coverUrl || FALLBACK_ARTWORK} 
                      alt={track.title} 
                      className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-2xs ring-1 ring-black/5"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = FALLBACK_ARTWORK;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900 truncate leading-snug">
                          {track.title}
                        </h4>
                        {isHeard ? (
                          <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200 shrink-0">
                            Heard ✓
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200 shrink-0">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                        {track.movie ? <span className="font-semibold text-amber-700">[{track.movie}] </span> : null}
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  
                    {user && (
                      <button 
                        onClick={() => onToggleFavorite(track.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                          isFav ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-500 hover:bg-slate-50'
                        }`}
                        title={isFav ? "Unlike" : "Like"}
                      >
                        <Heart size={16} fill={isFav ? '#e11d48' : 'none'} color={isFav ? '#e11d48' : 'currentColor'} />
                      </button>
                    )}

                    {onAddToQueue && (
                      <button 
                        onClick={() => onAddToQueue(track)}
                        className="w-8 h-8 rounded-full text-slate-400 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                        title="Add to queue"
                      >
                        <ListPlus size={16} />
                      </button>
                    )}

                    {onOpenPlaylistModal && (
                      <button 
                        onClick={() => onOpenPlaylistModal(track)}
                        className="w-8 h-8 rounded-full text-slate-400 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                        title="Add to playlist"
                      >
                        <FolderPlus size={16} />
                      </button>
                    )}

                     <button 
                      onClick={() => {
                        if (isCurrent) onPlayPause();
                        else onSelectTrack(track);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                        isCurrent && isPlaying
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                      title={isCurrent && isPlaying ? "Pause" : "Play"}
                    >
                      {isCurrent && isPlaying ? (
                        <Volume2 size={15} />
                      ) : (
                        <Play size={15} className="ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center gap-2 pt-3 pb-1">
            <div className="flex items-center justify-between w-full px-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  currentPage === 1
                    ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-100'
                    : 'bg-black text-white hover:bg-slate-800 active:scale-95 shadow-xs'
                }`}
              >
                <ChevronLeft size={15} />
                <span>Previous</span>
              </button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((pageNum, idx, arr) => (
                    <React.Fragment key={pageNum}>
                      {idx > 0 && arr[idx - 1] !== pageNum - 1 && (
                        <span className="text-slate-400 text-xs px-0.5">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                          currentPage === pageNum
                            ? 'bg-amber-500 text-white shadow-xs font-black'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  currentPage === totalPages
                    ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-100'
                    : 'bg-black text-white hover:bg-slate-800 active:scale-95 shadow-xs'
                }`}
              >
                <span>Next</span>
                <ChevronRight size={15} />
              </button>
            </div>

            <p className="text-xs font-medium text-slate-400">
              Showing {(currentPage - 1) * SONGS_PER_PAGE + 1} - {Math.min(currentPage * SONGS_PER_PAGE, displayedTracks.length)} of {displayedTracks.length} songs
            </p>
          </div>
        )}
      </section>

      {/* 7. Show All Movie Soundtracks Full-Screen View with Search & Save Album */}
      {showAllMovies && (
        <div 
          className="fixed inset-0 z-[60] bg-white flex flex-col h-full w-full max-w-md mx-auto sm:border-x sm:border-slate-200 select-none animate-[fadeIn_0.15s_ease-out]"
        >
          {/* Top Bar Header: Only search button and close button occur until search button is clicked */}
          <div className="p-3.5 sm:p-4 border-b border-black/20 flex items-center justify-between bg-white shrink-0 shadow-2xs">
            {isMovieSearchOpen ? (
              <div className="relative flex-1 flex items-center w-full">
                <Search size={16} className="absolute left-3 text-amber-600 pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Search movies"
                  value={movieSearchQuery}
                  onChange={e => setMovieSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-3 bg-slate-100 focus:bg-white text-md sm:text-sm font-semibold text-slate-800 placeholder-slate-400 rounded-full border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-hidden transition-all shadow-inner"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsMovieSearchOpen(false);
                    setMovieSearchQuery('');
                  }}
                  className="absolute right-2.5 w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                  title="Close Search"
                >
                  <X size={17} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAllMovies(false);
                      setIsMovieSearchOpen(false);
                      setMovieSearchQuery('');
                    }}
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-all"
                    title="Close Window"
                  >
                    <X size={20} />
                  </button>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <Film size={22} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 font-display">
                      All Movie Soundtracks
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {movieCollections.length} soundtrack albums
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMovieSearchOpen(true)}
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                  title="Search movie soundtracks"
                >
                  <Search size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Movies Grid (Full Screen Height Scrollable Container) */}
          <div className="flex-1 overflow-y-auto p-4 pb-28 no-scrollbar">
            {filteredAllMovies.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Film size={32} className="mx-auto mb-2 opacity-35 text-slate-400" />
                <p className="text-xs sm:text-sm font-bold text-slate-700">No movies match "{movieSearchQuery}"</p>
                <p className="text-xs text-slate-400 mt-1">Try another movie title, composer, or cast member.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredAllMovies.map(movie => {
                  const isSaved = (savedAlbums || []).some(
                    s => s?.trim().toLowerCase() === movie.name?.trim().toLowerCase()
                  );
                  return (
                    <div 
                      key={movie.id}
                      onClick={() => {
                        onOpenMovieModal(movie);
                      }}
                      className="flex flex-col rounded-2xl bg-white border border-black/30 p-2.5 hover:border-amber-400 hover:shadow-md transition-all active:scale-95 cursor-pointer group shadow-2xs"
                    >
                      <div className="w-full h-36 rounded-xl overflow-hidden relative bg-slate-100 shadow-2xs">
                        <img 
                          src={movie.coverUrl || FALLBACK_ARTWORK} 
                          alt={movie.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={e => {
                            e.target.onerror = null;
                            e.target.src = FALLBACK_ARTWORK;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end justify-start p-2">
                          <span className="text-[10px] font-bold text-amber-300 bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-md">
                            {movie.trackCount} {movie.trackCount === 1 ? 'song' : 'songs'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                            {movie.name}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                            {movie.composer} • {movie.year}
                          </p>
                          {movie.actors && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {movie.actors}
                            </p>
                          )}
                        </div>
                        {onToggleSaveAlbum && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSaveAlbum(movie.name);
                            }}
                            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-xs border ${
                              isSaved 
                                ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            title={isSaved ? "Saved" : "Save Album"}
                          >
                            <Bookmark size={17} fill={isSaved ? "#ffffff" : "none"} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
