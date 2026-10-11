import React from 'react';
import { 
  Play, 
  Heart, 
  Search, 
  Music, 
  Trash2, 
  Volume2,
  ExternalLink,
  ListPlus,
  FolderPlus
} from 'lucide-react';
import { isAdminUser } from '../firebase/config';

function formatDuration(seconds) {
  if (!seconds) return '3:30';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function SongList({
  tracks,
  currentTrack,
  isPlaying,
  onSelectTrack,
  onPlayPause,
  favorites,
  onToggleFavorite,
  searchQuery,
  onSearchChange,
  user,
  onDeleteTrack,
  onAddToQueue,
  onOpenPlaylistModal
}) {
  const isAdmin = isAdminUser(user);

  const filteredTracks = tracks.filter((t) => {
    return (
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.movie?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.actors?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.genre?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="w-full flex flex-col gap-4 select-none">
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
        <input 
          type="text" 
          placeholder="Search by song, movie, actor, or artist..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-100 hover:bg-slate-100/90 focus:bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 rounded-2xl border border-transparent focus:border-amber-400 focus:ring-3 focus:ring-amber-400/10 outline-hidden transition-all"
        />
      </div>

      {/* Song Rows */}
      <div className="flex flex-col gap-2">
        {filteredTracks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Music size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs font-medium">No songs found.</p>
          </div>
        ) : (
          filteredTracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            const isFav = favorites.includes(track.id);

            return (
              <div 
                key={track.id || idx}
                onClick={() => onSelectTrack(track)}
                className={`p-2.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] ${
                  isCurrent 
                    ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-400/40 shadow-xs' 
                    : 'bg-white hover:bg-slate-50 border-slate-100 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img 
                    src={track.coverUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200'} 
                    alt={track.title}
                    className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-2xs"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">
                      {track.title}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500 truncate leading-tight mt-0.5">
                      {track.movie ? <span className="font-semibold text-amber-700">[{track.movie}] </span> : null}
                      {track.artist}
                    </p>
                    {track.actors && track.actors !== 'Featured Cast' && (
                      <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                        {track.actors}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                    {formatDuration(track.duration)}
                  </span>

                  {/* Play Indicator */}
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

                  {/* Favorite */}
                  {user && (
                    <button 
                      onClick={() => onToggleFavorite(track.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                        isFav ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-500 hover:bg-slate-50'
                      }`}
                      title={isFav ? "Unlike" : "Like"}
                    >
                      <Heart size={16} fill={isFav ? '#e11d48' : 'none'} color={isFav ? '#e11d48' : 'currentColor'} />
                    </button>
                  )}

                  {/* Add to Queue */}
                  {onAddToQueue && (
                    <button 
                      onClick={() => onAddToQueue(track)}
                      className="w-8 h-8 rounded-full text-slate-400 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-all active:scale-90"
                      title="Add to queue"
                    >
                      <ListPlus size={16} />
                    </button>
                  )}

                  {/* Add to Playlist */}
                  {onOpenPlaylistModal && (
                    <button 
                      onClick={() => onOpenPlaylistModal(track)}
                      className="w-8 h-8 rounded-full text-slate-400 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-all active:scale-90"
                      title="Add to playlist"
                    >
                      <FolderPlus size={16} />
                    </button>
                  )}

                  {/* Archive direct link preview */}
                  {track.archiveDetailsUrl && (
                    <a 
                      href={track.archiveDetailsUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
                      title="View Archive.org item files"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}

                  {/* Admin Only Delete */}
                  {isAdmin && (
                    <button 
                      onClick={() => onDeleteTrack(track.id)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                      title="Delete from Vault"
                    >
                      <Trash2 size={13} />
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
