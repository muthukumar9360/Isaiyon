import React, { useState, useMemo } from 'react';
import { Play, Heart, Film, Users, Volume2, Shuffle } from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

const MOOD_CATEGORIES = [
  { id: "all", name: "✨ All Songs", query: "" },
  { id: "love-failure", name: "💔 Love Failure", query: "Love Failure" },
  { id: "melodies", name: "🎵 Pure Melodies", query: "Melody" },
  { id: "dhanush", name: "⭐ Dhanush Hits", query: "Dhanush" },
  { id: "suriya", name: "🔥 Suriya Specials", query: "Suriya" }
];

export default function HomePage({
  tracks,
  currentTrack,
  isPlaying,
  onSelectTrack,
  onPlayPause,
  favorites,
  onToggleFavorite,
  onOpenMovieModal,
  user
}) {
  const [selectedMood, setSelectedMood] = useState('all');
  const [shuffleSeed, setShuffleSeed] = useState(0);

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

  // Shuffled Discovery Mix so user can play all songs without repeating
  const discoveryTracks = useMemo(() => {
    const copy = [...tracks];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [tracks, shuffleSeed]);

  const filteredTracks = tracks.filter(t => {
    if (selectedMood === 'all') return true;
    const cat = MOOD_CATEGORIES.find(c => c.id === selectedMood);
    if (!cat) return true;
    const q = cat.query?.toLowerCase() || '';
    return (
      t.mood?.toLowerCase().includes(q) ||
      t.actors?.toLowerCase().includes(q) ||
      t.genre?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full flex flex-col gap-6 select-none">
      {/* 1. Mood Filter Pills (Horizontal Scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {MOOD_CATEGORIES.map(cat => {
          const isActive = selectedMood === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedMood(cat.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900' 
                  : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 border border-slate-200/50'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Discovery Mix Section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-display">
              Discovery Mix
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Shuffled tracks across your vault
            </p>
          </div>
          <button 
            onClick={() => setShuffleSeed(prev => prev + 1)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Reshuffle songs"
          >
            <Shuffle size={12} />
            <span>Shuffle</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {discoveryTracks.slice(0, 6).map(track => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div 
                key={track.id} 
                onClick={() => onSelectTrack(track)}
                className={`p-2 rounded-2xl border transition-all duration-150 flex items-center gap-2.5 cursor-pointer group active:scale-[0.98] ${
                  isCurrent 
                    ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-400/40 shadow-xs' 
                    : 'bg-slate-50/80 hover:bg-slate-100/90 border-slate-200/60 shadow-2xs'
                }`}
              >
                <img 
                  src={track.coverUrl || FALLBACK_ARTWORK} 
                  alt={track.title} 
                  className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-2xs ring-1 ring-black/5"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_ARTWORK;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {track.title}
                  </h4>
                  <p className="text-[11px] font-medium text-slate-500 truncate leading-tight mt-0.5">
                    {track.movie || track.artist}
                  </p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isCurrent) onPlayPause();
                    else onSelectTrack(track);
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isCurrent && isPlaying
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:text-amber-600 group-hover:scale-105 shadow-2xs'
                  }`}
                >
                  {isCurrent && isPlaying ? <Volume2 size={13} /> : <Play size={13} className="ml-0.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Movie Soundtracks Carousel */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-display">
              Movie Soundtracks
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {movieCollections.length} Movie Albums generated from database
            </p>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar snap-x">
          {movieCollections.map(movie => (
            <div 
              key={movie.id} 
              onClick={() => onOpenMovieModal(movie)}
              className="shrink-0 w-32 snap-start flex flex-col cursor-pointer group active:scale-95 transition-transform duration-150"
            >
              <div className="w-32 h-44 rounded-2xl overflow-hidden relative shadow-md shadow-slate-900/5 border border-slate-100 bg-slate-100">
                <img 
                  src={movie.coverUrl || FALLBACK_ARTWORK} 
                  alt={movie.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_ARTWORK;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-900 shadow-md">
                    <Film size={13} className="text-amber-600" />
                  </div>
                </div>
              </div>
              <div className="mt-2 min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {movie.name}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                  {movie.trackCount} {movie.trackCount === 1 ? 'song' : 'songs'} • {movie.composer}
                </p>
                {movie.actors && (
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {movie.actors}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. All Tracks List */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-display">
              {selectedMood === 'all' ? 'All Songs' : MOOD_CATEGORIES.find(c => c.id === selectedMood)?.name}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {filteredTracks.length} tracks available
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {filteredTracks.map(track => {
            const isCurrent = currentTrack?.id === track.id;
            const isFav = favorites.includes(track.id);

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
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                      isCurrent && isPlaying
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isCurrent && isPlaying ? (
                      <Volume2 size={15} />
                    ) : (
                      <Play size={15} className="ml-0.5" />
                    )}
                  </button>

                  {user && (
                    <button 
                      onClick={() => onToggleFavorite(track.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                        isFav ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-500 hover:bg-slate-50'
                      }`}
                    >
                      <Heart size={16} fill={isFav ? '#e11d48' : 'none'} color={isFav ? '#e11d48' : 'currentColor'} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
