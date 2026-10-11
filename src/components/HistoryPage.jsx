import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  X, 
  Play, 
  Pause, 
  Heart, 
  ListPlus, 
  FolderPlus, 
  Clock, 
  Trash2,
  Music
} from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Recently';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function HistoryPage({
  listenedHistory = [],
  tracks = [],
  currentTrack,
  isPlaying,
  onSelectTrack,
  onPlayPause,
  favorites = [],
  onToggleFavorite,
  onAddToQueue,
  onOpenPlaylistModal,
  onClearHistory,
  user
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Map listened items to full track objects from DB
  const historyTracksWithMeta = useMemo(() => {
    return listenedHistory.map(item => {
      const dbTrack = tracks.find(t => t.id === item.trackId);
      if (dbTrack) {
        return { ...dbTrack, listenedAt: item.timestamp };
      }
      return {
        id: item.trackId,
        title: item.title || 'Unknown Track',
        artist: item.artist || 'Unknown Artist',
        movie: item.movie || '',
        coverUrl: item.coverUrl || FALLBACK_ARTWORK,
        listenedAt: item.timestamp
      };
    });
  }, [listenedHistory, tracks]);

  // Filter history by search query
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return historyTracksWithMeta;
    const q = searchQuery.toLowerCase();
    return historyTracksWithMeta.filter(t => (
      t.title?.toLowerCase().includes(q) ||
      t.movie?.toLowerCase().includes(q) ||
      t.artist?.toLowerCase().includes(q) ||
      t.actors?.toLowerCase().includes(q)
    ));
  }, [historyTracksWithMeta, searchQuery]);

  return (
    <div className="w-full flex flex-col gap-4 select-none mt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight font-display flex items-center gap-2">
            <History size={22} className="text-amber-500" />
            <span>Listening History</span>
          </h2>
        </div>

        {historyTracksWithMeta.length > 0 && (
          <button
            onClick={onClearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Clear listening history"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* In-page Search Bar */}
      <div className="relative flex items-center">
        <Search size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
        <input 
          type="text" 
          placeholder="Search in your heard songs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 bg-slate-100 hover:bg-slate-100/90 focus:bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 rounded-2xl border border-transparent focus:border-amber-400 focus:ring-3 focus:ring-amber-400/10 outline-hidden transition-all shadow-inner"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* History Track List */}
      <div className="flex flex-col gap-2">
        {historyTracksWithMeta.length === 0 ? (
          <div className="p-10 text-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <History size={36} className="mx-auto mb-2 opacity-30 text-slate-400" />
            <h4 className="text-sm font-bold text-slate-700">No Listening History Yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Songs you play will appear here automatically, helping you avoid repeats and easily re-listen to your favorites.
            </p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Search size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs font-medium">No songs in your history match "{searchQuery}"</p>
          </div>
        ) : (
          filteredHistory.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            const isFav = favorites.includes(track.id);

            return (
              <div
                key={`${track.id}-${idx}`}
                onClick={() => onSelectTrack(track)}
                className={`p-2.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] ${
                  isCurrent
                    ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-400/40 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-100 shadow-2xs'
                }`}
              >
                {/* Artwork & Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-12 h-12 shrink-0">
                    <img 
                      src={track.coverUrl || FALLBACK_ARTWORK} 
                      alt={track.title}
                      className="w-12 h-12 rounded-xl object-cover shadow-2xs ring-1 ring-black/5"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = FALLBACK_ARTWORK;
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-snug">
                      {track.title}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                      {track.movie ? <span className="font-semibold text-amber-700">[{track.movie}] </span> : null}
                      {track.artist}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                      <Clock size={10} className="shrink-0" />
                      <span>{formatTimeAgo(track.listenedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  {/* Play/Pause Button */}
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
                    title={isCurrent && isPlaying ? "Pause" : "Play"}
                  >
                    {isCurrent && isPlaying ? (
                      <Pause size={14} />
                    ) : (
                      <Play size={14} className="ml-0.5" />
                    )}
                  </button>

                  {/* Favorite Button */}
                  {user && (
                    <button
                      onClick={() => onToggleFavorite(track.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                        isFav ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-500 hover:bg-slate-50'
                      }`}
                      title={isFav ? "Unlike" : "Like"}
                    >
                      <Heart size={15} fill={isFav ? '#e11d48' : 'none'} color={isFav ? '#e11d48' : 'currentColor'} />
                    </button>
                  )}

                  {/* Add to Queue Button */}
                  {onAddToQueue && (
                    <button
                      onClick={() => onAddToQueue(track)}
                      className="w-8 h-8 rounded-full text-slate-400 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-all active:scale-90"
                      title="Add to queue"
                    >
                      <ListPlus size={15} />
                    </button>
                  )}

                  {/* Add to Playlist Button */}
                  {onOpenPlaylistModal && (
                    <button
                      onClick={() => onOpenPlaylistModal(track)}
                      className="w-8 h-8 rounded-full text-slate-400 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-all active:scale-90"
                      title="Add to playlist"
                    >
                      <FolderPlus size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
