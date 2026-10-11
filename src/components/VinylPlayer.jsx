import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Heart,
  Film,
  Users,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Share2
} from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function VinylPlayer({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onPrev,
  onNext,
  isFavorite,
  onToggleFavorite,
  user,
  suggestedTracks = [],
  onSelectTrack,
  onShareTrack
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressBarClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div className="player-deck-mobile">
      {/* Top Bar: Share & Minimize Toggle */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button 
          className="tool-pill-btn"
          onClick={() => setIsMinimized(!isMinimized)}
          title={isMinimized ? 'Expand Player' : 'Show Next Songs'}
        >
          {isMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          <span>{isMinimized ? 'Expand Player' : 'Next Songs'}</span>
        </button>

        <button 
          className="tool-pill-btn"
          onClick={() => onShareTrack && onShareTrack(currentTrack)}
          title="Share Song"
        >
          <Share2 size={13} />
          <span>Share</span>
        </button>
      </div>

      {/* Holographic Pearlescent Laser DVD Disc (Minimizes when Up Next is expanded) */}
      <div className={`holographic-dvd-stage ${isMinimized ? 'minimized' : ''}`}>
        <div className={`holographic-dvd ${isPlaying ? 'spinning' : ''} ${isMinimized ? 'mini-disc' : ''}`}>
          <div className="dvd-laser-prism" />
          <div className="dvd-concentric-rings" />
          <div className="dvd-hub">
            <img 
              src={currentTrack?.coverUrl || FALLBACK_ARTWORK} 
              alt={currentTrack?.title} 
              className="dvd-art-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = FALLBACK_ARTWORK;
              }}
            />
            <div className="dvd-center-hole" />
          </div>
        </div>
      </div>

      {/* Undulating Audio Wave Visualizer */}
      <div className={`audio-wave-visualizer ${isPlaying ? 'active' : ''}`}>
        {[...Array(24)].map((_, i) => (
          <div key={i} className="wave-stem" />
        ))}
      </div>

      {/* Track Title and Movie / Artist Info */}
      <div className="track-info-hero">
        <h2 className="track-hero-title">{currentTrack?.title || 'No Song Selected'}</h2>
        
        {currentTrack?.movie && (
          <div className="track-hero-movie">
            <Film size={13} style={{ display: 'inline', marginRight: 4 }} />
            {currentTrack.movie}
          </div>
        )}

        <div className="track-hero-artist">
          {currentTrack?.artist || 'Various Artists'} 
          {currentTrack?.composer ? ` • ${currentTrack.composer}` : ''}
        </div>

        {currentTrack?.actors && currentTrack.actors !== 'Featured Cast' && (
          <div className="track-hero-credits">
            <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
            <strong>Starring:</strong> {currentTrack.actors}
          </div>
        )}
      </div>

      {/* Seekbar */}
      <div className="seek-container">
        <div className="progress-bar-wrapper" onClick={handleProgressBarClick}>
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}>
            <div className="progress-bar-handle" />
          </div>
        </div>
        <div className="time-row">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Touch Controls: ONLY Previous, Play/Pause, Next & Favorite */}
      <div className="control-row" style={{ gap: 24, marginBottom: 16 }}>
        <button className="ctrl-btn" onClick={onPrev} title="Previous Track">
          <SkipBack size={26} />
        </button>

        <button 
          className="ctrl-btn ctrl-btn-play" 
          onClick={onPlayPause} 
          title={isPlaying ? 'Pause' : 'Play'}
          style={{ width: 56, height: 56 }}
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 3 }} />}
        </button>

        <button className="ctrl-btn" onClick={onNext} title="Next Track">
          <SkipForward size={26} />
        </button>

        {user && (
          <button 
            className={`fav-btn ${isFavorite ? 'favorited' : ''}`} 
            onClick={() => onToggleFavorite(currentTrack?.id)}
            title="Favorite"
            style={{ marginLeft: 8 }}
          >
            <Heart size={22} fill={isFavorite ? '#e11d48' : 'none'} />
          </button>
        )}
      </div>

      {/* Suggested Songs / Up Next Shelf Below Player */}
      <div className="player-suggested-shelf">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Sparkles size={14} color="var(--accent-gold)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Up Next • Suggested Songs
          </span>
        </div>

        {suggestedTracks.length === 0 ? (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            No more songs in queue. Add more songs using the Vault button!
          </p>
        ) : (
          <div className="suggested-rows-container">
            {suggestedTracks.slice(0, 5).map(track => (
              <div 
                key={track.id} 
                className="player-suggested-item"
                onClick={() => onSelectTrack(track)}
              >
                <img 
                  src={track.coverUrl || FALLBACK_ARTWORK} 
                  alt={track.title} 
                  className="psi-thumb"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_ARTWORK;
                  }}
                />
                <div className="psi-meta">
                  <span className="psi-title">{track.title}</span>
                  <span className="psi-sub">{track.movie ? `[${track.movie}] ` : ''}{track.artist}</span>
                </div>
                <button className="psi-play-btn" title="Play Now">
                  <Play size={14} fill="#ffffff" style={{ marginLeft: 2 }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
