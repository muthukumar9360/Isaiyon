import React, { useState, useMemo } from 'react';
import { Play, Heart, Film, Users, Volume2, Sparkles, Shuffle } from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

const MOOD_CATEGORIES = [
  { id: "all", name: "✨ All Songs", query: "" },
  { id: "love-failure", name: "💔 Love Failure", query: "Love Failure" },
  { id: "melodies", name: "🎵 Pure Melodies", query: "Melody" },
  { id: "dhanush", name: "⭐ Dhanush Hits", query: "Dhanush" },
  { id: "suriya", name: "🔥 Suriya Specials", query: "Suriya" }
];

export default function HomePage({
  tracks,
  currentTrack,
  isPlaying,
  onSelectTrack,
  onPlayPause,
  favorites,
  onToggleFavorite,
  onOpenMovieModal,
  user
}) {
  const [selectedMood, setSelectedMood] = useState('all');
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Dynamically group tracks into Movie Soundtracks from the database
  const movieCollections = useMemo(() => {
    const map = {};
    tracks.forEach(t => {
      const movieKey = t.movie?.trim() || 'Singles';
      if (!map[movieKey]) {
        map[movieKey] = {
          id: `movie-${movieKey.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: movieKey,
          year: t.year || 'Cinema',
          composer: t.composer || 'Soundtrack',
          actors: t.actors || 'Featured Cast',
          coverUrl: t.coverUrl,
          trackCount: 0
        };
      }
      map[movieKey].trackCount++;
    });
    return Object.values(map);
  }, [tracks]);

  // Shuffled Discovery Mix so user can play all songs without repeating
  const discoveryTracks = useMemo(() => {
    const copy = [...tracks];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [tracks, shuffleSeed]);

  const filteredTracks = tracks.filter(t => {
    if (selectedMood === 'all') return true;
    const cat = MOOD_CATEGORIES.find(c => c.id === selectedMood);
    if (!cat) return true;
    const q = cat.query?.toLowerCase() || '';
    return (
      t.mood?.toLowerCase().includes(q) ||
      t.actors?.toLowerCase().includes(q) ||
      t.genre?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="home-container">
      {/* Mood Filter Pills */}
      <div className="mood-pills-row">
        {MOOD_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`mood-pill ${selectedMood === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedMood(cat.id)}
          >
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Fresh Discovery Mix (Shuffled & non-repeating for exploring all songs) */}
      <section className="section-block">
        <div className="section-header">
          <div>
            <h3 className="section-title">Discovery Mix</h3>
            <span className="section-sub">Shuffled tracks across your vault</span>
          </div>
          <button 
            className="btn-secondary" 
            style={{ padding: '4px 10px', fontSize: '0.72rem' }}
            onClick={() => setShuffleSeed(prev => prev + 1)}
            title="Reshuffle songs"
          >
            <Shuffle size={12} />
            <span>Reshuffle</span>
          </button>
        </div>

        <div className="quick-picks-grid">
          {discoveryTracks.slice(0, 6).map(track => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div 
                key={track.id} 
                className={`quick-pick-card ${isCurrent ? 'active' : ''}`}
                onClick={() => onSelectTrack(track)}
              >
                <img 
                  src={track.coverUrl || FALLBACK_ARTWORK} 
                  alt={track.title} 
                  className="qp-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_ARTWORK;
                  }}
                />
                <div className="qp-info">
                  <div className="qp-title">{track.title}</div>
                  <div className="qp-sub">{track.movie || track.artist}</div>
                </div>
                <button 
                  className="qp-play-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isCurrent) onPlayPause();
                    else onSelectTrack(track);
                  }}
                >
                  {isCurrent && isPlaying ? <Volume2 size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dynamic Movie Soundtracks */}
      <section className="section-block">
        <div className="section-header">
          <div>
            <h3 className="section-title">Movie Soundtracks</h3>
            <span className="section-sub">{movieCollections.length} Movie Albums generated from database</span>
          </div>
        </div>

        <div className="movie-carousel">
          {movieCollections.map(movie => (
            <div 
              key={movie.id} 
              className="movie-card"
              onClick={() => onOpenMovieModal(movie)}
            >
              <div className="movie-poster-wrap">
                <img 
                  src={movie.coverUrl || FALLBACK_ARTWORK} 
                  alt={movie.name} 
                  className="movie-poster"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_ARTWORK;
                  }}
                />
                <div className="movie-overlay-btn">
                  <Film size={18} color="#ffffff" />
                </div>
              </div>
              <div className="movie-info">
                <div className="movie-name">{movie.name}</div>
                <div className="movie-meta">{movie.trackCount} {movie.trackCount === 1 ? 'song' : 'songs'} • {movie.composer}</div>
                <div className="movie-cast">{movie.actors}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* All Tracks List */}
      <section className="section-block">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              {selectedMood === 'all' ? 'All Songs' : MOOD_CATEGORIES.find(c => c.id === selectedMood)?.name}
            </h3>
            <span className="section-sub">{filteredTracks.length} tracks available</span>
          </div>
        </div>

        <div className="track-list">
          {filteredTracks.map(track => {
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
          })}
        </div>
      </section>
    </div>
  );
}
