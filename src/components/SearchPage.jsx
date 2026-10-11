import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  Play, 
  Heart, 
  Volume2, 
  Users, 
  Sparkles, 
  Music, 
  ListMusic, 
  Film,
  ListPlus,
  FolderPlus,
  Clock,
  History,
  Trash2
} from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

export default function SearchPage({
  tracks = [],
  currentTrack,
  isPlaying,
  onSelectTrack,
  onPlayPause,
  favorites = [],
  onToggleFavorite,
  playlists = [],
  onOpenMovieModal,
  onAddToQueue,
  onOpenPlaylistModal,
  searchHistory = [],
  onAddSearchHistory,
  onRemoveSearchHistory,
  onClearAllSearchHistory,
  searchQuery = '',
  onSearchQueryChange,
  user
}) {
  const [query, setQuery] = useState(searchQuery || '');
  const [filterType, setFilterType] = useState('songs'); // 'songs' | 'playlists'

  React.useEffect(() => {
    if (searchQuery !== undefined) {
      setQuery(searchQuery);
    }
  }, [searchQuery]);

  const handleQueryChange = (val) => {
    setQuery(val);
    onSearchQueryChange?.(val);
  };

  // Extract unique movie albums from tracks
  const movieAlbums = useMemo(() => {
    const map = {};
    tracks.forEach(t => {
      const m = t.movie?.trim();
      if (m) {
        if (!map[m]) {
          map[m] = {
            id: `movie-${m.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            name: m,
            year: t.year || 'Cinema',
            composer: t.composer || 'Soundtrack',
            actors: t.actors || '',
            coverUrl: t.coverUrl,
            tracks: []
          };
        }
        map[m].tracks.push(t);
      }
    });
    return Object.values(map);
  }, [tracks]);

  // Filter songs by search query
  const filteredSongs = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return tracks.filter(t => (
      t.title?.toLowerCase().includes(q) ||
      t.movie?.toLowerCase().includes(q) ||
      t.actors?.toLowerCase().includes(q) ||
      t.artist?.toLowerCase().includes(q) ||
      t.composer?.toLowerCase().includes(q) ||
      t.genre?.toLowerCase().includes(q) ||
      t.mood?.toLowerCase().includes(q)
    ));
  }, [tracks, query]);

  // Filter playlists & movie collections by search query
  const filteredMovies = useMemo(() => {
    if (!query.trim()) return movieAlbums;
    const q = query.toLowerCase();
    return movieAlbums.filter(m => (
      m.name?.toLowerCase().includes(q) ||
      m.composer?.toLowerCase().includes(q) ||
      m.actors?.toLowerCase().includes(q) ||
      m.tracks.some(t => t.title?.toLowerCase().includes(q))
    ));
  }, [movieAlbums, query]);

  const filteredPlaylists = useMemo(() => {
    if (!query.trim()) return playlists;
    const q = query.toLowerCase();
    return playlists.filter(p => p.name?.toLowerCase().includes(q));
  }, [playlists, query]);

  const totalPlaylistMatches = filteredMovies.length + filteredPlaylists.length;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onAddSearchHistory?.(query.trim());
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 select-none mt-6">
      {/* 1. Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <Search size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
        <input 
          type="text" 
          placeholder="Songs, movies, actors ..."
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-slate-100 hover:bg-slate-100/90 focus:bg-white text-sm font-semibold text-slate-800 placeholder-slate-400 rounded-2xl border border-transparent focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 outline-hidden transition-all shadow-inner"
          autoFocus
        />
        {query && (
          <button 
            type="button"
            onClick={() => handleQueryChange('')}
            className="absolute right-3 w-6 h-6 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </form>

      {/* 2. Filter Tabs: Songs vs Playlists */}
      <div className="flex p-1 py-1.5 bg-slate-100 border border-black/30 rounded-2xl gap-1">
        <button 
          onClick={() => setFilterType('songs')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            filterType === 'songs' 
              ? 'bg-black text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Music size={13} className={filterType === 'songs' ? 'text-white' : ''} />
          <span>Songs {query.trim() ? `(${filteredSongs.length})` : ''}</span>
        </button>

        <button 
          onClick={() => setFilterType('playlists')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            filterType === 'playlists' 
              ? 'bg-black text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListMusic size={13} className={filterType === 'playlists' ? 'text-white' : ''} />
          <span>Playlists {query.trim() ? `(${totalPlaylistMatches})` : ''}</span>
        </button>
      </div>

      {/* 3. Empty Search State (Recent Searches / Albums) */}
      {!query.trim() ? (
        filterType === 'songs' ? (
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 font-display flex items-center gap-1.5">
                <Clock size={14} className="text-amber-500" />
                <span>Recent Searches</span>
              </h4>
              {searchHistory.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAllSearchHistory}
                  className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {searchHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <History size={30} className="mx-auto mb-2 opacity-35 text-slate-400" />
                <p className="text-xs font-semibold text-slate-600">No recent searches</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Search for your favorite songs, movies, or artists above.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleQueryChange(item)}
                    className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer transition-all active:scale-95 group border border-slate-200/60 shadow-2xs"
                  >
                    <Search size={12} className="text-slate-400 group-hover:text-amber-600 transition-colors" />
                    <span>{item}</span>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSearchHistory?.(item);
                      }}
                      className="w-4 h-4 rounded-full hover:bg-slate-300 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                      title={`Remove "${item}" from history`}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Empty Search + Playlists tab: show all available movie albums / playlists */
          <div className="flex flex-col gap-3 mt-1">
            <h4 className="text-sm font-extrabold text-slate-900 tracking-tight font-display">
              Movie Soundtracks & Albums
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {movieAlbums.map((movie, idx) => (
                <div 
                  key={idx}
                  onClick={() => onOpenMovieModal?.(movie)}
                  className="bg-white rounded-2xl border border-black/30 p-2 shadow-2xs flex flex-col cursor-pointer group active:scale-95 transition-all duration-150"
                >
                  <div className="w-full rounded-xl overflow-hidden bg-slate-100 mb-2 relative">
                    <img 
                      src={movie.coverUrl || FALLBACK_ARTWORK} 
                      alt={movie.name} 
                      className="w-full h-25 object-fit group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = FALLBACK_ARTWORK;
                      }} 
                    />
                    <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-900 shadow-md">
                      <Film size={13} className="text-amber-600" />
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {movie.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                    {movie.tracks.length} tracks • {movie.composer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        /* 4. Active Search Results based on selected filter */
        <div className="flex flex-col gap-3">
          {/* A. SONGS FILTER */}
          {filterType === 'songs' && (
            <>
              <div className="text-xs font-semibold text-slate-500">
                Found {filteredSongs.length} songs for <span className="text-slate-900 font-bold">"{query}"</span>
              </div>

              <div className="flex flex-col gap-2">
                {filteredSongs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Music size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-medium">No songs found for "{query}". Try searching by movie or artist.</p>
                  </div>
                ) : (
                  filteredSongs.map(track => {
                    const isCurrent = currentTrack?.id === track.id;
                    const isFav = favorites.includes(track.id);

                    return (
                      <div 
                        key={track.id}
                        onClick={() => {
                          if (query.trim()) onAddSearchHistory?.(query.trim());
                          onSelectTrack(track);
                        }}
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
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-snug">
                              {track.title}
                            </h4>
                            <p className="text-[11px] font-medium text-slate-500 truncate leading-tight mt-0.5">
                              {track.movie ? <span className="font-semibold text-amber-700">[{track.movie}] </span> : null}
                              {track.artist}
                            </p>
                            {track.actors && track.actors !== 'Featured Cast' && (
                              <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                <Users size={10} className="shrink-0" />
                                <span className="truncate">{track.actors}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              if (isCurrent) onPlayPause();
                              else onSelectTrack(track);
                            }}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                              isCurrent && isPlaying
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title={isCurrent && isPlaying ? "Pause" : "Play"}
                          >
                            {isCurrent && isPlaying ? (
                              <Volume2 size={14} />
                            ) : (
                              <Play size={14} className="ml-0.5" />
                            )}
                          </button>

                          <button 
                            onClick={() => onAddToQueue?.(track)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-90 cursor-pointer"
                            title="Add to Queue"
                          >
                            <ListPlus size={15} />
                          </button>

                          <button 
                            onClick={() => onOpenPlaylistModal?.(track)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-90 cursor-pointer"
                            title="Add to Playlist"
                          >
                            <FolderPlus size={15} />
                          </button>

                          {user && (
                            <button 
                              onClick={() => onToggleFavorite(track.id)}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                                isFav ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-500 hover:bg-slate-50'
                              }`}
                              title={isFav ? "Remove Favorite" : "Favorite"}
                            >
                              <Heart size={15} fill={isFav ? '#e11d48' : 'none'} color={isFav ? '#e11d48' : 'currentColor'} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* B. PLAYLISTS & MOVIE ALBUMS FILTER */}
          {filterType === 'playlists' && (
            <>
              <div className="text-xs font-semibold text-slate-500">
                Found {totalPlaylistMatches} playlists / albums for <span className="text-slate-900 font-bold">"{query}"</span>
              </div>

              {totalPlaylistMatches === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <ListMusic size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">No playlists or movie albums found for "{query}".</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Matching Custom Playlists */}
                  {filteredPlaylists.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Custom Playlists ({filteredPlaylists.length})
                      </h5>
                      {filteredPlaylists.map(pl => (
                        <div 
                          key={pl.id}
                          className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 shadow-2xs flex items-center justify-between gap-3 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/50">
                              <ListMusic size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {pl.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {pl.trackIds?.length || 0} songs
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Matching Movie Soundtracks */}
                  {filteredMovies.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Movie Albums ({filteredMovies.length})
                      </h5>
                      <div className="grid grid-cols-2 gap-3">
                        {filteredMovies.map((movie, idx) => (
                          <div 
                            key={idx}
                            onClick={() => onOpenMovieModal?.(movie)}
                            className="bg-white rounded-2xl border border-black/30 p-2 shadow-2xs flex flex-col cursor-pointer group active:scale-95 transition-all duration-150"
                          >
                            <div className="w-full rounded-xl overflow-hidden bg-slate-100 mb-2 relative">
                              <img 
                                src={movie.coverUrl || FALLBACK_ARTWORK} 
                                alt={movie.name} 
                                className="w-full h-25 object-fit group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = FALLBACK_ARTWORK;
                                }} 
                              />
                              <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-900 shadow-md">
                                <Film size={13} className="text-amber-600" />
                              </div>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {movie.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                              {movie.tracks.length} tracks • {movie.composer}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
