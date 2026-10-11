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
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

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
    <div className="library-container">
      {/* Library Filter Tabs */}
      <div className="lib-nav-tabs">
        <button 
          className={`lib-nav-tab ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('favorites');
            setSelectedPlaylist(null);
          }}
        >
          <Heart size={14} />
          <span>Liked ({likedTracks.length})</span>
        </button>

        <button 
          className={`lib-nav-tab ${activeTab === 'playlists' ? 'active' : ''}`}
          onClick={() => setActiveTab('playlists')}
        >
          <ListMusic size={14} />
          <span>Playlists ({playlists.length})</span>
        </button>

        <button 
          className={`lib-nav-tab ${activeTab === 'movies' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('movies');
            setSelectedPlaylist(null);
          }}
        >
          <Film size={14} />
          <span>Movie Albums ({movieAlbums.length})</span>
        </button>
      </div>

      {/* 1. FAVORITES TAB */}
      {activeTab === 'favorites' && (
        <div className="lib-section">
          <div className="liked-hero-card">
            <div className="liked-hero-icon">
              <Heart size={28} fill="#ffffff" color="#ffffff" />
            </div>
            <div>
              <h3 className="liked-hero-title">Liked Songs</h3>
              <span className="liked-hero-sub">{likedTracks.length} auto-saved songs</span>
            </div>
          </div>

          <div className="track-list" style={{ marginTop: 14 }}>
            {likedTracks.length === 0 ? (
              <div className="empty-results">
                <Heart size={32} opacity={0.3} style={{ margin: '0 auto 10px' }} />
                <p>No favorited tracks yet. Tap the heart icon on any song to save it here!</p>
              </div>
            ) : (
              likedTracks.map(track => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div 
                    key={track.id}
                    className={`track-row ${isCurrent ? 'active' : ''}`}
                    onClick={() => onSelectTrack(track)}
                  >
                    <div className="track-left">
                      <img src={track.coverUrl} alt={track.title} className="track-thumb" />
                      <div className="track-meta">
                        <span className="track-name">{track.title}</span>
                        <span className="track-sub">{track.movie || track.artist}</span>
                      </div>
                    </div>

                    <div className="track-actions" onClick={e => e.stopPropagation()}>
                      <button 
                        className="ctrl-btn"
                        onClick={() => {
                          if (isCurrent) onPlayPause();
                          else onSelectTrack(track);
                        }}
                      >
                        {isCurrent && isPlaying ? <Volume2 size={16} color="var(--accent-gold)" /> : <Play size={16} />}
                      </button>

                      <button 
                        className="fav-btn favorited"
                        onClick={() => onToggleFavorite(track.id)}
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

      {/* 2. PLAYLISTS TAB */}
      {activeTab === 'playlists' && (
        <div className="lib-section">
          {/* Create Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>Custom Playlists</h4>
            {user && (
              <button className="btn-secondary" onClick={() => setShowCreateModal(true)}>
                <Plus size={14} />
                <span>New Playlist</span>
              </button>
            )}
          </div>

          {playlists.length === 0 ? (
            <div className="empty-results">
              <ListMusic size={32} opacity={0.3} style={{ margin: '0 auto 10px' }} />
              <p>No custom playlists yet. Tap "New Playlist" to create one!</p>
            </div>
          ) : (
            <div className="playlist-cards-grid">
              {playlists.map(pl => (
                <div 
                  key={pl.id}
                  className="custom-playlist-card"
                  onClick={() => setSelectedPlaylist(pl)}
                >
                  <div className="playlist-icon-wrap">
                    <Music2 size={24} color="var(--accent-gold)" />
                  </div>
                  <div className="playlist-card-info">
                    <span className="playlist-card-title">{pl.name}</span>
                    <span className="playlist-card-sub">{pl.trackIds?.length || 0} songs</span>
                  </div>
                  <button 
                    className="ctrl-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePlaylist(pl.id);
                    }}
                    title="Delete playlist"
                  >
                    <Trash2 size={14} color="var(--accent-rose)" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. MOVIES / ALBUMS TAB */}
      {activeTab === 'movies' && (
        <div className="lib-section">
          <div className="movie-grid-view">
            {movieAlbums.map((movie, idx) => (
              <div 
                key={idx}
                className="movie-grid-card"
                onClick={() => onOpenMovieModal(movie)}
              >
                <img src={movie.coverUrl} alt={movie.name} className="movie-grid-poster" />
                <div className="movie-grid-title">{movie.name}</div>
                <div className="movie-grid-sub">{movie.tracks.length} tracks • {movie.composer}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 12 }}>Create New Playlist</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Playlist Name</label>
                <input 
                  type="text" 
                  className="form-input"
                  required
                  placeholder="e.g. My Midnight Melodies"
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button type="button" className="ctrl-btn" onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: 8 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
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
