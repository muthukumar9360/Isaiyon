import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Heart,
  Film,
  MoreHorizontal,
  Music2,
  ChevronDown
} from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

// 32 Frequency heights mimicking the waveform visualizer in reference
const WAVE_BAR_HEIGHTS = [
  8, 14, 18, 12, 22, 28, 16, 24, 
  32, 20, 26, 30, 18, 14, 22, 28, 
  34, 24, 18, 26, 30, 22, 16, 24, 
  28, 18, 12, 20, 26, 16, 12, 8
];

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
  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const progressPercent = Math.min(100, Math.max(0, progressRatio * 100));

  const handleWaveformClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div className="player-deck-mobile">
      {/* 1. Top Bar: Header Title matching Reference */}
      <div className="ref-player-header">
        <div className="ref-icon-pill" title="Now Playing">
          <Music2 size={16} color="var(--accent-gold)" />
        </div>
        <span className="ref-header-title">Now Playing</span>
        <div className="ref-icon-pill" title="Options">
          <MoreHorizontal size={16} />
        </div>
      </div>

      {/* 2. Large Circular Rotating Disc with Concentric Halo Ring */}
      <div className="ref-disc-wrapper">
        <div className="ref-disc-halo">
          <div className={`ref-disc ${isPlaying ? 'rotating' : ''}`}>
            <img 
              src={currentTrack?.coverUrl || FALLBACK_ARTWORK} 
              alt={currentTrack?.title} 
              className="ref-disc-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = FALLBACK_ARTWORK;
              }}
            />
            {/* Center vinyl spindle dot */}
            <div className="ref-disc-spindle" />
          </div>
        </div>
      </div>

      {/* 3. Track Title & Artist */}
      <div className="ref-track-info">
        <h2 className="ref-track-title">{currentTrack?.title || 'No Song Selected'}</h2>
        <p className="ref-track-artist">
          {currentTrack?.artist || 'Various Artists'}
          {currentTrack?.composer ? ` • ${currentTrack.composer}` : ''}
        </p>
      </div>

      {/* 4. Sub-Actions Row (Movie Tag on Left, Like Heart on Right) */}
      <div className="ref-sub-actions">
        <div className="ref-movie-tag">
          <Film size={13} color="var(--accent-gold)" />
          <span>{currentTrack?.movie || 'Soundtrack'}</span>
        </div>

        {user && (
          <button 
            className={`ref-fav-btn ${isFavorite ? 'favorited' : ''}`}
            onClick={() => onToggleFavorite(currentTrack?.id)}
            title={isFavorite ? "Remove from Liked" : "Like Song"}
          >
            <Heart size={20} fill={isFavorite ? '#e11d48' : 'none'} color={isFavorite ? '#e11d48' : 'currentColor'} />
          </button>
        )}
      </div>

      {/* 5. Audio Waveform Seekbar matching Reference Design */}
      <div className="ref-waveform-container">
        <span className="ref-time-label">{formatTime(currentTime)}</span>
        
        <div className="ref-waveform-track" onClick={handleWaveformClick} title="Seek Audio">
          {WAVE_BAR_HEIGHTS.map((h, i) => {
            const barRatio = i / WAVE_BAR_HEIGHTS.length;
            const isPlayed = barRatio <= progressRatio;
            return (
              <div 
                key={i} 
                className={`ref-wave-stem ${isPlayed ? 'played' : ''} ${isPlaying ? 'animated' : ''}`}
                style={{ 
                  height: `${h}px`,
                  animationDelay: `${(i % 5) * 0.15}s` 
                }}
              />
            );
          })}
        </div>

        <span className="ref-time-label">{formatTime(duration)}</span>
      </div>

      {/* 6. Main Controls Row (Previous, Glowing Center Play/Pause, Next) */}
      <div className="ref-controls-row">
        <button className="ref-ctrl-pill" onClick={onPrev} title="Previous Track">
          <SkipBack size={22} />
        </button>

        <button 
          className="ref-ctrl-play-btn" 
          onClick={onPlayPause} 
          title={isPlaying ? 'Pause' : 'Play'}
        >
          <div className="ref-play-glow-ring" />
          {isPlaying ? (
            <Pause size={28} fill="#ffffff" color="#ffffff" />
          ) : (
            <Play size={28} fill="#ffffff" color="#ffffff" style={{ marginLeft: 3 }} />
          )}
        </button>

        <button className="ref-ctrl-pill" onClick={onNext} title="Next Track">
          <SkipForward size={22} />
        </button>
      </div>
    </div>
  );
}
