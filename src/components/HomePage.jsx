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
import { formatDisplayName } from '../utils/formatUtils';

const SONGS_PER_PAGE = 8;

export default function HomePage({
  tracks = [],
  currentTrack,
  isBottomPlayerActive = false,
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

  // Touch swipe to dismiss "All Movie Soundtracks" overlay
  const movieSwipeStartXRef = useRef(0);
  const movieSwipeStartYRef = useRef(0);

  const handleMovieTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      movieSwipeStartXRef.current = e.touches[0].clientX;
      movieSwipeStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleMovieTouchEnd = (e) => {
    if (e.changedTouches && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - movieSwipeStartXRef.current;
      const deltaY = e.changedTouches[0].clientY - movieSwipeStartYRef.current;
      // If horizontal swipe distance > 50px and predominantly horizontal (swipe left OR right)
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
        setShowAllMovies(false);
        setIsMovieSearchOpen(false);
        setMovieSearchQuery('');
      }
    }
  };

  // Dynamically extract and curate lead male actors, singers, and composers from DB tracks
  const dynamicSpotlights = useMemo(() => {
    if (!tracks || tracks.length === 0) return [];

    // Filter out female names to satisfy: "only show the male actress and the singers only"
    const FEMALE_NAMES = new Set([
      'tabu', 'aishwarya rai', 'aishwarya', 'nayanthara', 'sunaina', 'laila',
      'sneha', 'sayyeshaa', 'trisha', 'samantha', 'tamannaah', 'kajal aggarwal',
      'keerthy suresh', 'hansika', 'priya bhavani shankar', 'anushka', 'anushka shetty',
      'jyothika', 'simran', 'meena', 'ramya krishnan', 'shruti haasan', 'pooja hegde',
      'rashmika', 'rashmika mandanna', 'bhavatharini'
    ]);

    const peopleMap = new Map();

    const addPerson = (rawName, type, track) => {
      if (!rawName) return;
      const clean = rawName.trim();
      if (clean.length < 2 || clean.toLowerCase() === 'featured stars' || clean.toLowerCase() === 'various artists') return;

      const key = clean.toLowerCase();
      if (!peopleMap.has(key)) {
        peopleMap.set(key, {
          id: key.replace(/[^a-z0-9]/g, '-'),
          name: clean,
          query: clean,
          type,
          trackCount: 0,
          coverUrl: track?.coverUrl || '',
          sampleMovie: track?.movie || ''
        });
      }
      const entry = peopleMap.get(key);
      entry.trackCount += 1;
      if (!entry.coverUrl && track?.coverUrl) {
        entry.coverUrl = track.coverUrl;
      }
    };

    tracks.forEach(track => {
      // 1. Male Actors from DB:
      // Pick only the primary/lead male actor for this movie/track,
      // so movies like Kandukondain are never duplicated across Abbas, Ajith, Aishwarya Rai, etc.
      if (track.actors) {
        const validMaleActors = track.actors
          .split(',')
          .map(a => a.trim())
          .filter(a => a.length >= 2 && a.toLowerCase() !== 'featured stars' && !FEMALE_NAMES.has(a.toLowerCase()));

        if (validMaleActors.length > 0) {
          // The first entry is the primary lead male actor (e.g., Ajith Kumar for Kandukondain, Suriya for Unnai Ninaithu, Dhanush for Yaaradi Nee Mohini, etc.)
          addPerson(validMaleActors[0], 'actor', track);
        }
      }

      // 2. Singers / Artists from DB (non-female)
      if (track.artist) {
        track.artist.split(/[,&]/).forEach(art => {
          const clean = art.trim();
          if (clean.length >= 2 && !FEMALE_NAMES.has(clean.toLowerCase())) {
            addPerson(clean, 'singer', track);
          }
        });
      }

      // 3. Music Directors / Composers from DB
      if (track.composer) {
        track.composer.split(',').forEach(comp => {
          const clean = comp.trim();
          if (clean.length >= 2) {
            addPerson(clean, 'composer', track);
          }
        });
      }
    });

    const list = Array.from(peopleMap.values());
    // Sort by highest count first, as explicitly requested ("based on the highest count")
    list.sort((a, b) => b.trackCount - a.trackCount || a.name.localeCompare(b.name));

    const visualStyles = [
      { gradient: 'from-blue-600 via-indigo-700 to-slate-950', border: 'border-blue-400/40', icon: Star },
      { gradient: 'from-amber-500 via-orange-600 to-slate-950', border: 'border-amber-400/40', icon: Flame },
      { gradient: 'from-rose-600 via-red-700 to-slate-950', border: 'border-rose-400/40', icon: Zap },
      { gradient: 'from-emerald-600 via-teal-700 to-slate-950', border: 'border-emerald-400/40', icon: Sparkles },
      { gradient: 'from-fuchsia-600 via-purple-700 to-slate-950', border: 'border-fuchsia-400/40', icon: Headphones },
      { gradient: 'from-yellow-600 via-amber-700 to-stone-950', border: 'border-yellow-400/40', icon: Disc3 },
      { gradient: 'from-indigo-600 via-purple-800 to-slate-950', border: 'border-purple-400/40', icon: Radio },
      { gradient: 'from-cyan-600 via-teal-700 to-slate-950', border: 'border-cyan-400/40', icon: Music },
      { gradient: 'from-teal-600 via-emerald-800 to-slate-950', border: 'border-teal-400/40', icon: Users }
    ];

    return list.slice(0, 14).map((item, index) => {
      const style = visualStyles[index % visualStyles.length];
      const badge = item.type === 'actor' ? 'Actor' : item.type === 'composer' ? 'Composer' : 'Singer';
      const subtitle = item.sampleMovie ? `${formatDisplayName(item.sampleMovie)}` : `${item.trackCount} ${item.trackCount === 1 ? 'track' : 'tracks'}`;

      return {
        ...item,
        badge,
        subtitle,
        gradient: style.gradient,
        border: style.border,
        icon: style.icon
      };
    });
  }, [tracks]);

  // Curated 6 Dynamic Genre & Vibe Stations combining user-requested Genres and Moods
  const dynamicGenreStations = useMemo(() => {
    const stations = [
      {
        id: 'love-melody',
        name: 'காதல் & மெலடி',
        englishTitle: 'Love & Melody',
        subtitle: 'Romantic Melodies & Pure Soul',
        query: 'Love',
        genreMatch: 'Melody',
        moodMatch: 'காதல்',
        gradient: 'from-rose-600 via-pink-600 to-purple-950',
        glow: 'shadow-rose-500/20 group-hover:shadow-rose-500/40',
        border: 'border-rose-400/30',
        icon: Heart
      },
      {
        id: 'breakup-soul',
        name: 'பிரிவு & மெலடி',
        englishTitle: 'Breakup & Soul',
        subtitle: 'Heartbreak, Longing & Memories',
        query: 'Breakup',
        genreMatch: 'Melody',
        moodMatch: 'பிரிவு',
        gradient: 'from-indigo-600 via-purple-700 to-slate-950',
        glow: 'shadow-indigo-500/20 group-hover:shadow-indigo-500/40',
        border: 'border-indigo-400/30',
        icon: Disc3
      },
      {
        id: 'mass-kuthu',
        name: 'மாஸ் & குத்து',
        englishTitle: 'Mass & Kuthu / Pop',
        subtitle: 'High Voltage Beats & Dance',
        query: 'Mass',
        genreMatch: 'Kuthu',
        moodMatch: 'மாஸ்',
        gradient: 'from-amber-500 via-orange-600 to-stone-950',
        glow: 'shadow-amber-500/20 group-hover:shadow-amber-500/40',
        border: 'border-amber-400/30',
        icon: Flame
      },
      {
        id: 'chill-folk',
        name: 'அமைதி & நாட்டுப்புறம்',
        englishTitle: 'Chill & Folk / Classical',
        subtitle: 'Peaceful Bliss & Traditional Roots',
        query: 'Chill',
        genreMatch: 'Folk',
        moodMatch: 'அமைதி',
        gradient: 'from-emerald-600 via-teal-700 to-stone-950',
        glow: 'shadow-emerald-500/20 group-hover:shadow-emerald-500/40',
        border: 'border-emerald-400/30',
        icon: Sparkles
      },
      {
        id: 'motivation-rap',
        name: 'ஊக்கம் & ராப்',
        englishTitle: 'Motivation & Rap / Gaana',
        subtitle: 'Fire Anthems & Energy Boost',
        query: 'Motivation',
        genreMatch: 'Rap',
        moodMatch: 'ஊக்கம்',
        gradient: 'from-cyan-600 via-blue-700 to-slate-950',
        glow: 'shadow-cyan-500/20 group-hover:shadow-cyan-500/40',
        border: 'border-cyan-400/30',
        icon: TrendingUp
      },
      {
        id: 'devotional-grace',
        name: 'பக்தி & தெய்வீகம்',
        englishTitle: 'Devotional & Classical',
        subtitle: 'Spiritual Peace & Sacred Chants',
        query: 'Devotional',
        genreMatch: 'Classical',
        moodMatch: 'பக்தி',
        gradient: 'from-yellow-600 via-amber-600 to-red-950',
        glow: 'shadow-yellow-500/20 group-hover:shadow-yellow-500/40',
        border: 'border-yellow-400/30',
        icon: Star
      }
    ];

    return stations.map(station => {
      const count = tracks.filter(t => {
        const g = (t.genre || '').toLowerCase();
        const m = (t.mood || '').toLowerCase();
        return (
          m.includes(station.moodMatch.toLowerCase()) ||
          m.includes(station.query.toLowerCase()) ||
          g.includes(station.genreMatch.toLowerCase()) ||
          g.includes(station.query.toLowerCase())
        );
      }).length;

      return {
        ...station,
        count
      };
    });
  }, [tracks]);

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
      onSelectTrack(unheardTracks[0], false);
      if (onAddToQueue && unheardTracks.length > 1) {
        unheardTracks.slice(1).forEach(t => onAddToQueue(t));
      }
    }
  };

  // Helper to count tracks matching a search keyword
  const getMatchCount = (keyword) => {
    if (!keyword) return 0;
    const q = keyword.toLowerCase();
    return tracks.filter(t =>
      t.actors?.toLowerCase().includes(q) ||
      t.composer?.toLowerCase().includes(q) ||
      t.artist?.toLowerCase().includes(q) ||
      t.movie?.toLowerCase().includes(q) ||
      t.title?.toLowerCase().includes(q) ||
      t.genre?.toLowerCase().includes(q) ||
      t.mood?.toLowerCase().includes(q)
    ).length;
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between mt-6 gap-5 select-none">

      {/* 1. Dynamic Welcome Hero Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-black p-5 text-white shadow-xl border border-white/10">
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3.5">

          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight font-display text-white">
              Hello, {userName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5 leading-snug">
              Fresh songs waiting for you.
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
              onClick={() => tracks[0] && onSelectTrack(tracks[0], false)}
              className="w-full py-2.5 px-4 rounded-2xl bg-white/15 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Replay Vault Catalog</span>
            </button>
          )}
        </div>
      </section>

      {/* 4. Genres & Vibes Stations (DYNAMIC 6 GENRE & MOOD COMBINATIONS) */}
      <section className="flex flex-col gap-3 px-1 pb-3 -mt-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-display flex items-center gap-1.5">
              <span>Genres & Vibes</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Curated mood portals & sonic atmospheres
            </p>
          </div>
        </div>

        {/* 2-Column Responsive Bento Grid with Stylish Gradient Glass Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {dynamicGenreStations.map(station => {
            const Icon = station.icon;
            const count = station.count;

            return (
              <div
                key={station.id}
                onClick={() => onNavigateToSearch?.(station.query)}
                className={`relative p-3.5 rounded-2xl bg-gradient-to-br ${station.gradient} border ${station.border} shadow-md ${station.glow} hover:scale-[1.02] hover:shadow-xl transition-all duration-200 active:scale-95 cursor-pointer flex flex-col justify-between gap-3 group overflow-hidden`}
              >
                {/* Decorative Ambient Radial Spot */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-300" />

                {/* Top Row: Glowing Icon Badge + Count Tag */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xs group-hover:bg-white/25 transition-all">
                    <Icon size={16} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-bold text-white/95 bg-black/30 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15 shadow-2xs">
                    {count > 0 ? `${count} ${count === 1 ? 'song' : 'songs'}` : 'Explore'}
                  </span>
                </div>

                {/* Bottom Row: Title, Subtitle, and Soundwave Graphic */}
                <div className="relative z-10">
                  <h4 className="text-xs sm:text-sm font-black font-display text-white tracking-wide truncate drop-shadow-xs group-hover:translate-x-0.5 transition-transform">
                    {station.englishTitle || station.subtitle}
                  </h4>
                  <p className="text-[10px] text-white/80 font-medium truncate mt-0.5">
                    {station.name}
                  </p>

                  {/* Micro Visual Soundwave Indicator */}
                  <div className="flex items-end gap-0.5 h-2 mt-2 opacity-100 group-hover:opacity-100 transition-opacity">
                    <span className="w-0.5 h-1.5 bg-white/90 rounded-full animate-pulse" />
                    <span className="w-0.5 h-2 bg-white/90 rounded-full animate-pulse [animation-delay:150ms]" />
                    <span className="w-0.5 h-1 bg-white/90 rounded-full animate-pulse [animation-delay:300ms]" />
                    <span className="w-0.5 h-2 bg-white/90 rounded-full animate-pulse [animation-delay:75ms]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Refined Exploration Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-lg -mt-1">
        <button
          onClick={() => handleFilterChange('unheard')}
          className={`flex-1 py-2 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${selectedFilter === 'unheard'
            ? 'bg-black text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <Sparkles size={14} className={selectedFilter === 'unheard' ? 'text-amber-400' : ''} />
          <span>Unheard ({unheardTracks.length})</span>
        </button>

        <button
          onClick={() => handleFilterChange('heard')}
          className={`flex-1 py-2 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${selectedFilter === 'heard'
            ? 'bg-black text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <CheckCircle2 size={14} />
          <span>Heard ({heardTracks.length})</span>
        </button>

        <button
          onClick={() => handleFilterChange('all')}
          className={`flex-1 py-2 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${selectedFilter === 'all'
            ? 'bg-black text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <Music size={14} />
          <span>All ({tracks.length})</span>
        </button>


      </div>

      {/* 6. Paginated Tracklist Section */}
      <section className="flex-1 flex flex-col justify-between gap-2 mt-1">
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
            <p className="text-xs text-slate-500 font-medium mb-2">
              Page {currentPage} of {totalPages} • {displayedTracks.length} total songs
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {paginatedTracks.length === 0 ? (
            <div className="p-8 mb-3 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
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
              const isPlayingCurrent = isCurrent && isPlaying;

              return (
                <div
                  key={track.id}
                  onClick={() => onSelectTrack(track, true)}
                  className={`p-2.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] ${isPlayingCurrent
                    ? 'bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 border-amber-400/80 ring-2 ring-amber-400/30 shadow-md shadow-amber-500/10'
                    : isCurrent
                      ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-400/40 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-100 shadow-2xs'
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-12 h-12 shrink-0">
                      <img
                        src={track.coverUrl || FALLBACK_ARTWORK}
                        alt={track.title}
                        className={`w-12 h-12 rounded-xl object-cover shrink-0 shadow-lg ring-1 ring-black/5 transition-all ${isPlayingCurrent ? 'ring-2 ring-amber-500 rounded-2xl animate-[spinDisc_10s_linear_infinite]' : ''
                          }`}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = FALLBACK_ARTWORK;
                        }}
                      />
                      {/* Dancing Equalizer Overlay while playing */}
                      {isPlayingCurrent && (
                        <div className="absolute inset-0 bg-black/45 backdrop-blur-[0.5px] rounded-xl flex items-center justify-center gap-0.5">
                          <span className="w-1 bg-amber-400 rounded-full animate-[stemPulse_0.6s_ease-in-out_infinite] h-3.5" />
                          <span className="w-1 bg-amber-400 rounded-full animate-[stemPulse_0.9s_ease-in-out_infinite] h-5 [animation-delay:150ms]" />
                          <span className="w-1 bg-amber-400 rounded-full animate-[stemPulse_0.7s_ease-in-out_infinite] h-3 [animation-delay:300ms]" />
                          <span className="w-1 bg-amber-400 rounded-full animate-[stemPulse_1.1s_ease-in-out_infinite] h-4.5 [animation-delay:450ms]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className={`text-sm font-bold truncate leading-snug ${isPlayingCurrent ? 'text-amber-900 font-black' : 'text-slate-900'}`}>
                          {track.title}
                        </h4>
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
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${isFav ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-500 hover:bg-slate-50'
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
                        if (isCurrent) onPlayPause('bar');
                        else onSelectTrack(track, false, 'bar');
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${isPlayingCurrent
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105'
                        : isCurrent
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      title={isPlayingCurrent ? "Pause" : "Play"}
                    >
                      {isPlayingCurrent ? (
                        <Volume2 size={15} className="animate-pulse" />
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

        {/* Pagination Controls - Always display page number even if only 1 page */}
        {displayedTracks.length > 0 && (
          <div className="flex flex-col items-center gap-2 pt-3 pb-4 mt-auto">
            <div className="flex items-center justify-between w-full px-0.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1 cursor-pointer ${currentPage === 1
                  ? 'opacity-100 cursor-not-allowed text-white bg-black'
                  : 'bg-black text-white hover:bg-slate-800 active:scale-95 shadow-xs'
                  }`}
              >
                <ChevronLeft size={15} />
                <span>Prev</span>
              </button>

              {/* Numbered Page Buttons & Badge */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((pageNum, idx, arr) => (
                    <React.Fragment key={pageNum}>
                      {idx > 0 && arr[idx - 1] !== pageNum - 1 && (
                        <span className="text-slate-400 text-xs px-0.5">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center ${currentPage === pageNum
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
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1 cursor-pointer ${currentPage >= totalPages
                  ? 'opacity-100 cursor-not-allowed text-white bg-black'
                  : 'bg-black text-white hover:bg-slate-800 active:scale-95 shadow-xs'
                  }`}
              >
                <span>Next</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. Actor & Artist Spotlight Playlists (HORIZONTAL SLIDER - CLEARLY VISIBLE X-AXIS SCROLL) */}
      <section className="flex flex-col gap-3 px-1">
        <div className="flex items-center justify-between -mt-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-display flex items-center gap-1.5">
              <span>Artist & Actor Playlists</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Curated collections from iconic stars
            </p>
          </div>
        </div>

        {/* Horizontal Slider with free, smooth x-axis scrolling */}
        <div
          ref={sliderRef}
          onScroll={handleSliderScroll}
          className="flex gap-4.5 overflow-x-auto pb-2 scroll-smooth touch-pan-x overscroll-x-contain custom-slider-track"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {dynamicSpotlights.map(artist => {
            const Icon = artist.icon;
            const count = artist.trackCount;

            return (
              <div
                key={artist.id}
                onClick={() => onNavigateToSearch?.(artist.query)}
                className={`shrink-0 w-41 h-52 rounded-3xl py-4 px-4 flex flex-col justify-between relative overflow-hidden cursor-pointer select-none active:scale-95 transition-all duration-200 bg-gradient-to-br ${artist.gradient} border ${artist.border} shadow-lg group`}
              >
                {/* Dynamic Artist / Actor Artwork from Vault DB */}
                <img
                  src={artist.coverUrl || FALLBACK_ARTWORK}
                  alt={artist.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-95"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_ARTWORK;
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

                  <div className="flex items-center justify-between mt-1.5 text-[11px] font-bold text-amber-300">
                    <span>{count > 0 ? `${count} ${count === 1 ? 'song' : 'songs'}` : 'Vault Star'}</span>
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


      {/* 2. Cinema Soundtracks - Featured 1st Two Albums in One Row (Two Columns) */}
      <section className="flex flex-col gap-3 pb-3">
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
                      {formatDisplayName(movie.name)}
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
                      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-xs border ${isSaved
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

      {/* 7. Show All Movie Soundtracks Full-Screen View with Search & Save Album */}
      {showAllMovies && (
        <div
          onTouchStart={handleMovieTouchStart}
          onTouchEnd={handleMovieTouchEnd}
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
                    title="Close Window (or swipe left/right)"
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

          {/* Movies Grid (Full Screen Height Scrollable Container with conditional clearance for BottomPlayer) */}
          <div className={`flex-1 overflow-y-auto p-4 ${isBottomPlayerActive ? 'pb-42 sm:pb-40' : 'pb-18'} no-scrollbar`}>
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
                            {formatDisplayName(movie.name)}
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
                            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-xs border ${isSaved
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
