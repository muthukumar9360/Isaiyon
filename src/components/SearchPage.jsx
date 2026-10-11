import React, { useState } from 'react';
import { Search, X, Play, Heart, Volume2, Film, Users, Sparkles } from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

const BROWSE_GENRES = [
  { name: "💔 Love Failure", query: "Love Failure", gradient: "linear-gradient(135deg, #f43f5e, #fb7185)" },
  { name: "🌙 Midnight Melodies", query: "Melody", gradient: "linear-gradient(135deg, #6366f1, #818cf8)" },
  { name: "⭐ Dhanush Anthems", query: "Dhanush", gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)" },
  { name: "🔥 Suriya Classics", query: "Suriya", gradient: "linear-gradient(135deg, #0ea5e9, #38bdf8)" },
  { name: "👑 Vijayakanth Hits", query: "Vijayakanth", gradient: "linear-gradient(135deg, #10b981, #34d399)" },
  { name: "🎧 Yuvan Drugs", query: "Yuvan", gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)" }
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
    <div className="search-page-container">
      {/* Search Input Bar */}
      <div className="search-input-wrapper">
        <Search size={18} className="search-input-icon" />
        <input 
          type="text" 
          placeholder="Songs, movies, actors (Dhanush, Suriya)..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="search-main-input"
          autoFocus
        />
        {query && (
          <button className="ctrl-btn" onClick={() => setQuery('')}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* When Query is Empty: Show Browse Tiles */}
      {!query.trim() ? (
        <div className="browse-tiles-section">
          <h4 className="browse-title">Explore Collections</h4>
          <div className="browse-grid">
            {BROWSE_GENRES.map((genre, idx) => (
              <div 
                key={idx}
                className="genre-card"
                style={{ background: genre.gradient }}
                onClick={() => setQuery(genre.query)}
              >
                <span className="genre-card-title">{genre.name}</span>
                <Sparkles size={18} color="rgba(255,255,255,0.7)" className="genre-card-icon" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* When Query is Present: Show Matching Results */
        <div className="search-results-section">
          <div className="results-count">
            Found {filtered.length} matches for "{query}"
          </div>

          <div className="track-list">
            {filtered.length === 0 ? (
              <div className="empty-results">
                <Search size={36} opacity={0.3} style={{ margin: '0 auto 10px' }} />
                <p>No songs found for "{query}". Try searching by movie or actor.</p>
              </div>
            ) : (
              filtered.map(track => {
                const isCurrent = currentTrack?.id === track.id;
                const isFav = favorites.includes(track.id);

                return (
                  <div 
                    key={track.id}
                    className={`track-row ${isCurrent ? 'active' : ''}`}
                    onClick={() => onSelectTrack(track)}
                  >
                    <div className="track-left">
                      <img 
                        src={track.coverUrl || FALLBACK_ARTWORK} 
                        alt={track.title} 
                        className="track-thumb"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = FALLBACK_ARTWORK;
                        }}
                      />
                      <div className="track-meta">
                        <span className="track-name">{track.title}</span>
                        <span className="track-sub">
                          {track.movie ? <span className="track-badge-movie">[{track.movie}] </span> : null}
                          {track.artist}
                        </span>
                        {track.actors && track.actors !== 'Featured Cast' && (
                          <span className="track-actors-line">
                            <Users size={10} style={{ display: 'inline', marginRight: 3 }} />
                            {track.actors}
                          </span>
                        )}
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
      )}
    </div>
  );
}
