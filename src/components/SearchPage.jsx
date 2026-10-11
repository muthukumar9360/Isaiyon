import React, { useState } from 'react';
import { Search, X, Play, Heart, Volume2, Users, Sparkles } from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

const BROWSE_GENRES = [
  { name: "💔 Love Failure", query: "Love Failure", bg: "from-rose-500 to-pink-600" },
  { name: "🌙 Midnight Melodies", query: "Melody", bg: "from-indigo-500 to-purple-600" },
  { name: "⭐ Dhanush Anthems", query: "Dhanush", bg: "from-amber-500 to-orange-500" },
  { name: "🔥 Suriya Classics", query: "Suriya", bg: "from-sky-500 to-blue-600" },
  { name: "👑 Vijayakanth Hits", query: "Vijayakanth", bg: "from-emerald-500 to-teal-600" },
  { name: "🎧 Yuvan Drugs", query: "Yuvan", bg: "from-violet-500 to-fuchsia-600" }
];

export default function SearchPage({
  tracks,
  currentTrack,
  isPlaying,
  onSelectTrack,
  onPlayPause,
  favorites,
  onToggleFavorite,
  user
}) {
  const [query, setQuery] = useState('');

  const filtered = query.trim() ? tracks.filter(t => {
    const q = query.toLowerCase();
    return (
      t.title?.toLowerCase().includes(q) ||
      t.movie?.toLowerCase().includes(q) ||
      t.actors?.toLowerCase().includes(q) ||
      t.artist?.toLowerCase().includes(q) ||
      t.composer?.toLowerCase().includes(q) ||
      t.genre?.toLowerCase().includes(q) ||
      t.mood?.toLowerCase().includes(q)
    );
  }) : [];

  return (
    <div className="w-full flex flex-col gap-5 select-none">
      {/* 1. Search Input Bar */}
      <div className="relative flex items-center">
        <Search size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
        <input 
          type="text" 
          placeholder="Songs, movies, actors (Dhanush, Suriya)..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-slate-100 hover:bg-slate-100/90 focus:bg-white text-sm font-semibold text-slate-800 placeholder-slate-400 rounded-2xl border border-transparent focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 outline-hidden transition-all shadow-inner"
          autoFocus
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="absolute right-3 w-6 h-6 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all active:scale-90"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 2. When Query is Empty: Browse Collections */}
      {!query.trim() ? (
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-extrabold text-slate-900 tracking-tight font-display">
            Explore Collections
          </h4>
          <div className="grid grid-cols-2 gap-2.5">
            {BROWSE_GENRES.map((genre, idx) => (
              <div 
                key={idx}
                onClick={() => setQuery(genre.query)}
                className={`p-3.5 rounded-2xl bg-gradient-to-br ${genre.bg} text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-between cursor-pointer active:scale-95 hover:scale-[1.02] transition-transform duration-150`}
              >
                <span className="leading-tight drop-shadow-xs">{genre.name}</span>
                <Sparkles size={16} className="text-white/70 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 3. When Query is Present: Show Matching Results */
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold text-slate-500">
            Found {filtered.length} matches for <span className="text-slate-900 font-bold">"{query}"</span>
          </div>

          <div className="flex flex-col gap-2">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Search size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No songs found for "{query}". Try searching by movie or actor.</p>
              </div>
            ) : (
              filtered.map(track => {
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
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
