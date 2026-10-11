import React from 'react';
import { X, Play, Heart, Users, Volume2, PauseCircle, Pause, ListPlus, FolderPlus, Bookmark } from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

export default function MovieDetailModal({
  movie,
  onClose,
  tracks,
  currentTrack,
  isPlaying,
  onSelectTrack,
  onPlayPause,
  favorites,
  onToggleFavorite,
  savedAlbums = [],
  onToggleSaveAlbum,
  onPlayAlbum,
  onAddToQueue,
  onOpenPlaylistModal,
  user
}) {
  if (!movie) return null;

  const isSaved = (savedAlbums || []).some(
    s => s?.trim().toLowerCase() === movie.name?.trim().toLowerCase()
  );
  const movieTracks = tracks.filter(t => 
    t.movie?.toLowerCase().includes(movie.name.toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-[80] select-none animate-[modalPop_0.2s_ease-out]" 
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl relative border-t sm:border border-slate-100 pb-3 pt-3" 
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90 z-20"
        >
          <X size={20} />
        </button>

        {/* Hero Header */}
        <div className="p-4 sm:p-5 flex gap-4 border-b border-black/30 bg-gradient-to-b from-slate-50 to-white">
          <img 
            src={movie.coverUrl || FALLBACK_ARTWORK} 
            alt={movie.name} 
            className="w-35 h-25 rounded-2xl object-fit shadow-md shrink-0 border border-slate-200/60"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = FALLBACK_ARTWORK;
            }} 
          />
          <div className="flex flex-col justify-between min-w-0 flex-1 pr-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight truncate font-display">
                {movie.name}
              </h2>
              <div className="text-xs text-slate-500 font-medium mt-1">
                <span>{movie.year}</span> • <span>{movie.composer}</span>
              </div>
              {movie.actors && (
                <div className="text-[10px] text-slate-400 font-medium mt-1 truncate flex items-center gap-1">
                  <Users size={12} className="shrink-0" />
                  <span className="truncate">{movie.actors}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button 
                onClick={() => onPlayAlbum(movieTracks)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Play size={13} fill="#ffffff" />
                <span>Play ({movieTracks.length})</span>
              </button>

              {user && onToggleSaveAlbum && (
                <button 
                  onClick={() => onToggleSaveAlbum(movie.name)}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border ${
                    isSaved 
                      ? 'bg-amber-50 text-amber-700 border-amber-300' 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title={isSaved ? "Remove from Library" : "Save Album to Library"}
                >
                  <Bookmark size={13} fill={isSaved ? "#b45309" : "none"} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tracklist */}
        <div className="p-4 flex flex-col gap-2.5">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-black font-display">
            Album Tracks
          </h4>

          <div className="flex flex-col gap-2">
            {movieTracks.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                No uploaded tracks found for this movie yet. Use the Vault button to import from YouTube.
              </p>
            ) : (
              movieTracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                const isFav = favorites.includes(track.id);

                return (
                  <div 
                    key={track.id || idx}
                    onClick={() => {
                      onSelectTrack(track, true);
                      onClose?.();
                    }}
                    className={`p-2.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] ${
                      isCurrent 
                        ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-400/40 shadow-xs' 
                        : 'bg-white hover:bg-slate-50 border-slate-100 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-5 min-w-0 flex-1">
                      <span className="text-md font-bold text-slate-400 w-4 text-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-md font-bold text-slate-900 truncate leading-snug">
                          {track.title}
                        </h5>
                        <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          if (isCurrent) onPlayPause('bar');
                          else onSelectTrack(track, false, 'bar');
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                          isCurrent && isPlaying
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'hover:bg-slate-200 text-black'
                        }`}
                      >
                        {isCurrent && isPlaying ? (
                          <Pause size={15} />
                        ) : (
                          <Play size={15} />
                        )}
                      </button>

                      {user && (
                        <button 
                          onClick={() => onToggleFavorite(track.id)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                            isFav ? 'text-rose-600 bg-rose-50' : 'text-black hover:bg-slate-200'
                          }`}
                          title={isFav ? "Unlike" : "Like"}
                        >
                          <Heart size={16} fill={isFav ? '#e11d48' : 'none'} color={isFav ? '#e11d48' : 'currentColor'} />
                        </button>
                      )}

                      {onAddToQueue && (
                        <button 
                          onClick={() => onAddToQueue(track)}
                          className="w-8 h-8 rounded-full text-slate-500 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-all active:scale-90"
                          title="Add to queue"
                        >
                          <ListPlus size={16} />
                        </button>
                      )}

                      {onOpenPlaylistModal && (
                        <button 
                          onClick={() => onOpenPlaylistModal(track)}
                          className="w-8 h-8 rounded-full text-slate-500 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-all active:scale-90"
                          title="Add to playlist"
                        >
                          <FolderPlus size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
