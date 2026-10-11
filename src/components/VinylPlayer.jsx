import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Heart,
  Film,
  Users
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
  user
}) {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressBarClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div className="player-deck-mobile">
      {/* Holographic Pearlescent Laser DVD Centerpiece */}
      <div className="holographic-dvd-stage">
        <div className={`holographic-dvd ${isPlaying ? 'spinning' : ''}`}>
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
      <div className="control-row" style={{ gap: 24 }}>
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
    </div>
  );
}
