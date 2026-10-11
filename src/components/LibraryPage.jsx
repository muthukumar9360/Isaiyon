import React, { useState } from 'react';
import { 
  Heart, 
  Plus, 
  ListMusic, 
  Play, 
  Film, 
  Trash2, 
  Music2, 
  Volume2 
} from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

export default function LibraryPage({
  tracks,
  favorites,
  user,
  playlists,
  onCreatePlaylist,
  onDeletePlaylist,
  onSelectTrack,
  onPlayPause,
  currentTrack,
  isPlaying,
  onToggleFavorite,
  onOpenMovieModal
}) {
  const [activeTab, setActiveTab] = useState('favorites'); // 'favorites' | 'playlists' | 'movies'
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const likedTracks = tracks.filter(t => favorites.includes(t.id));

  // Dynamically group unique movies
  const movieMap = {};
  tracks.forEach(t => {
    if (t.movie) {
      if (!movieMap[t.movie]) {
        movieMap[t.movie] = {
          name: t.movie,
          coverUrl: t.coverUrl,
          composer: t.composer,
          actors: t.actors,
          year: t.year || 'Cinema',
          tracks: []
        };
      }
      movieMap[t.movie].tracks.push(t);
    }
  });
  const movieAlbums = Object.values(movieMap);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    onCreatePlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setShowCreateModal(false);
  };

  return (
    <div className="w-full flex flex-col gap-4 select-none mt-8">
      {/* 1. Segmented Navigation Tabs */}
      <div className="flex p-1 py-2 bg-slate-100 border border-black/30 rounded-2xl gap-1">
        <button 
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-xl transition-all duration-150 ${
            activeTab === 'favorites' 
              ? 'bg-black text-white' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Heart size={13} className={activeTab === 'favorites' ? 'text-white' : ''} />
          <span>Liked ({likedTracks.length})</span>
        </button>

        <button 
          onClick={() => setActiveTab('playlists')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-xl transition-all duration-150 ${
            activeTab === 'playlists' 
              ? 'bg-black text-white' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ListMusic size={13} className={activeTab === 'playlists' ? 'text-white' : ''} />
          <span>Playlists ({playlists.length})</span>
        </button>

        <button 
          onClick={() => setActiveTab('movies')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-xl transition-all duration-150 ${
            activeTab === 'movies' 
              ? 'bg-black text-white' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Film size={13} className={activeTab === 'movies' ? 'text-white' : ''} />
          <span>Albums ({movieAlbums.length})</span>
        </button>
      </div>

      {/* 2. FAVORITES TAB */}
      {activeTab === 'favorites' && (
        <div className="flex flex-col gap-3">
          {/* Hero Banner Card */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 text-white flex items-center gap-3.5 shadow-lg shadow-rose-500/20">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner shrink-0">
              <Heart size={26} fill="#ffffff" color="#ffffff" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight font-display">
                Liked Songs
              </h3>
              <p className="text-xs text-white/80 font-medium">
                {likedTracks.length} tracks in your personal vault
              </p>
            </div>
          </div>

          {/* Track List */}
          <div className="flex flex-col gap-2">
            {likedTracks.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Heart size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No favorited tracks yet. Tap the heart on any track to save it here!</p>
              </div>
            ) : (
              likedTracks.map(track => {
                const isCurrent = currentTrack?.id === track.id;
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
                        {isCurrent && isPlaying ? <Volume2 size={15} /> : <Play size={15} className="ml-0.5" />}
                      </button>

                      <button 
                        onClick={() => onToggleFavorite(track.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-rose-600 bg-rose-50 transition-all active:scale-90"
                      >
                        <Heart size={16} fill="#e11d48" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. PLAYLISTS TAB */}
      {activeTab === 'playlists' && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-extrabold text-slate-900 tracking-tight font-display">
              Custom Playlists
            </h4>
            {user && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus size={13} strokeWidth={3} />
                <span>New Playlist</span>
              </button>
            )}
          </div>

          {playlists.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <ListMusic size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">No custom playlists yet. Tap "New Playlist" to create one!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {playlists.map(pl => (
                <div 
                  key={pl.id}
                  className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 shadow-2xs flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/50">
                      <Music2 size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {pl.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {pl.trackIds?.length || 0} songs
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onDeletePlaylist(pl.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-90"
                    title="Delete playlist"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. MOVIES / ALBUMS TAB */}
      {activeTab === 'movies' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {movieAlbums.map((movie, idx) => (
              <div 
                key={idx}
                onClick={() => onOpenMovieModal(movie)}
                className="bg-white rounded-2xl border border-black/30 p-2 shadow-2xs flex flex-col cursor-pointer group active:scale-95 transition-all duration-150"
              >
                <div className="w-full rounded-xl overflow-hidden bg-slate-100 mb-2 relative">
                  <img 
                    src={movie.coverUrl || FALLBACK_ARTWORK} 
                    alt={movie.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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

      {/* 5. Create Playlist Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-[modalPop_0.2s_ease-out]"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-extrabold text-slate-900 font-display">
              Create New Playlist
            </h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Playlist Name
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. My Midnight Melodies"
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 focus:ring-3 focus:ring-amber-400/10 outline-hidden transition-all"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
