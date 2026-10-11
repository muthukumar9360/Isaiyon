import React from 'react';
import { 
  Play, 
  Pause, 
  Heart, 
  Search, 
  Music, 
  Trash2, 
  Volume2,
  ExternalLink 
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
  onDeleteTrack
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
    <div className="library-panel-mobile">
      {/* Search Input */}
      <div className="search-box">
        <Search size={15} className="search-icon" />
        <input 
          type="text" 
          placeholder="Search by song, movie, actor, or artist..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Song Rows */}
      <div className="track-list" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {filteredTracks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
            <Music size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontSize: '0.85rem' }}>No songs found.</p>
          </div>
        ) : (
          filteredTracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            const isFav = favorites.includes(track.id);

            return (
              <div 
                key={track.id || idx}
                className={`track-row ${isCurrent ? 'active' : ''}`}
                onClick={() => onSelectTrack(track)}
              >
                <div className="track-left">
                  <img 
                    src={track.coverUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200'} 
                    alt={track.title}
                    className="track-thumb"
                  />
                  <div className="track-meta">
                    <span className="track-name">{track.title}</span>
                    <span className="track-sub">
                      {track.movie ? <span className="track-badge-movie">[{track.movie}] </span> : null}
                      {track.artist}
                    </span>
                    {track.actors && track.actors !== 'Featured Cast' && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {track.actors}
                      </span>
                    )}
                  </div>
                </div>

                <div className="track-actions" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                    {formatDuration(track.duration)}
                  </span>

                  {/* Play Indicator */}
                  <button 
                    className="ctrl-btn" 
                    onClick={() => {
                      if (isCurrent) {
                        onPlayPause();
                      } else {
                        onSelectTrack(track);
                      }
                    }}
                    title={isCurrent && isPlaying ? 'Pause' : 'Play'}
                  >
                    {isCurrent && isPlaying ? (
                      <Volume2 size={17} color="var(--accent-gold)" />
                    ) : (
                      <Play size={17} />
                    )}
                  </button>

                  {/* Favorite */}
                  {user && (
                    <button 
                      className={`fav-btn ${isFav ? 'favorited' : ''}`}
                      onClick={() => onToggleFavorite(track.id)}
                      title="Favorite"
                    >
                      <Heart size={17} fill={isFav ? '#e11d48' : 'none'} />
                    </button>
                  )}

                  {/* Archive direct link preview */}
                  {track.archiveDetailsUrl && (
                    <a 
                      href={track.archiveDetailsUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="ctrl-btn"
                      title="View Archive.org item files"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}

                  {/* Admin Only Delete */}
                  {isAdmin && (
                    <button 
                      className="ctrl-btn"
                      onClick={() => onDeleteTrack(track.id)}
                      title="Delete from Vault"
                      style={{ color: 'var(--accent-rose)' }}
                    >
                      <Trash2 size={15} />
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
