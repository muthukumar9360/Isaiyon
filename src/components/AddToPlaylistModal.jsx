import React, { useState } from 'react';
import { X, Plus, Check, ListMusic, Music2, FolderPlus } from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

export default function AddToPlaylistModal({
  track,
  onClose,
  playlists = [],
  user,
  onToggleTrackInPlaylist,
  onCreatePlaylistWithTrack
}) {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!track) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    setIsCreating(true);
    try {
      await onCreatePlaylistWithTrack(newPlaylistName.trim(), track.id);
      setNewPlaylistName('');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-[90] select-none animate-[modalPop_0.2s_ease-out]"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto relative border-t sm:border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
        >
          <X size={15} />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2 pr-8">
          <FolderPlus size={18} className="text-amber-600 shrink-0" />
          <h3 className="text-sm font-extrabold text-slate-900 font-display">
            Add to Playlist
          </h3>
        </div>

        {/* Selected Track Banner */}
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
          <img 
            src={track.coverUrl || FALLBACK_ARTWORK} 
            alt={track.title} 
            className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-2xs"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = FALLBACK_ARTWORK;
            }}
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-900 truncate">
              {track.title}
            </h4>
            <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
              {track.movie ? `${track.movie} • ` : ''}{track.artist}
            </p>
          </div>
        </div>

        {/* Inline Create New Playlist Section */}
        {user ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-1.5 pt-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Create New Playlist
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Playlist name..."
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 rounded-xl border border-transparent focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-hidden transition-all"
              />
              <button 
                type="submit" 
                disabled={isCreating || !newPlaylistName.trim()}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Plus size={13} strokeWidth={3} />
                <span>Create</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/60 text-[11px] text-amber-800">
            Please <strong>Sign In</strong> to sync custom playlists to your sound vault.
          </div>
        )}

        {/* Playlists List */}
        <div className="flex flex-col gap-2 pt-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Your Playlists ({playlists.length})
          </label>

          {playlists.length === 0 ? (
            <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <ListMusic size={28} className="mx-auto mb-1.5 opacity-30" />
              <p className="text-xs font-medium">No playlists created yet. Type a name above to create one!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-0.5">
              {playlists.map(pl => {
                const isInPlaylist = pl.trackIds?.includes(track.id);

                return (
                  <div 
                    key={pl.id}
                    onClick={() => onToggleTrackInPlaylist(pl.id, track.id)}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] ${
                      isInPlaylist 
                        ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400/40 text-emerald-950' 
                        : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-800 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isInPlaylist ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Music2 size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold truncate">
                          {pl.name}
                        </h5>
                        <p className="text-[10px] opacity-70 font-medium">
                          {pl.trackIds?.length || 0} tracks
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isInPlaylist ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                          <Check size={12} strokeWidth={3} />
                          <span>Added</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-full">
                          <Plus size={12} strokeWidth={2.5} />
                          <span>Add</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
