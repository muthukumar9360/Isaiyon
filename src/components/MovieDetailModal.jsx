import React from 'react';
import { X, Play, Heart, Film, Users, Music2, Volume2 } from 'lucide-react';
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
  onPlayAlbum,
  user
}) {
  if (!movie) return null;

  const movieTracks = tracks.filter(t => 
    t.movie?.toLowerCase().includes(movie.name.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content movie-modal-content" onClick={e => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        {/* Hero Header */}
        <div className="movie-modal-hero">
          <img 
            src={movie.coverUrl || FALLBACK_ARTWORK} 
            alt={movie.name} 
            className="movie-modal-poster"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = FALLBACK_ARTWORK;
            }} 
          />
          <div className="movie-modal-hero-text">
            <span className="movie-badge">Soundtrack Album</span>
            <h2 className="movie-modal-title">{movie.name}</h2>
            <div className="movie-modal-details">
              <span>{movie.year}</span> • <span>Music: {movie.composer}</span>
            </div>
            <div className="movie-modal-cast">
              <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
              <strong>Starring:</strong> {movie.actors}
            </div>

            <button 
              className="btn-play-album"
              onClick={() => onPlayAlbum(movieTracks)}
            >
              <Play size={16} fill="#ffffff" style={{ marginLeft: 2 }} />
              <span>Play All ({movieTracks.length})</span>
            </button>
          </div>
        </div>

        {/* Tracklist */}
        <div className="movie-tracklist-section">
          <h4 className="movie-tracklist-heading">Album Tracks</h4>
          <div className="track-list">
            {movieTracks.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                No uploaded tracks found for this movie yet. Use the Vault button to import from YouTube.
              </p>
            ) : (
              movieTracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                const isFav = favorites.includes(track.id);

                return (
                  <div 
                    key={track.id || idx}
                    className={`track-row ${isCurrent ? 'active' : ''}`}
                    onClick={() => onSelectTrack(track)}
                  >
                    <div className="track-left">
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)', width: 20 }}>
                        {idx + 1}
                      </span>
                      <div className="track-meta">
                        <span className="track-name">{track.title}</span>
                        <span className="track-sub">{track.artist}</span>
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
                        {isCurrent && isPlaying ? (
                          <Volume2 size={17} color="var(--accent-gold)" />
                        ) : (
                          <Play size={17} />
                        )}
                      </button>

                      {user && (
                        <button 
                          className={`fav-btn ${isFav ? 'favorited' : ''}`}
                          onClick={() => onToggleFavorite(track.id)}
                        >
                          <Heart size={16} fill={isFav ? '#e11d48' : 'none'} />
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
