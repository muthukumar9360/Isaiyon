import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Heart 
} from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

export default function BottomPlayer({
  currentTrack,
  isPlaying,
  onPlayPause,
  onPrev,
  onNext,
  isFavorite,
  onToggleFavorite,
  user,
  onOpenFullPlayer
}) {
  if (!currentTrack) return null;

  return (
    <aside className="bottom-dock-mobile">
      <div 
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}
        onClick={onOpenFullPlayer}
      >
        <img 
          src={currentTrack.coverUrl || FALLBACK_ARTWORK} 
          alt={currentTrack.title}
          className={`dock-thumb ${isPlaying ? 'playing' : ''}`}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = FALLBACK_ARTWORK;
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div className="dock-title">{currentTrack.title}</div>
          <div className="dock-artist">{currentTrack.movie ? `${currentTrack.movie} • ` : ''}{currentTrack.artist}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user && (
          <button 
            className={`fav-btn ${isFavorite ? 'favorited' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(currentTrack.id);
            }}
            title="Favorite"
          >
            <Heart size={18} fill={isFavorite ? '#e11d48' : 'none'} />
          </button>
        )}

        <button 
          className="ctrl-btn" 
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }} 
          title="Previous"
        >
          <SkipBack size={18} />
        </button>

        <button 
          className="ctrl-btn ctrl-btn-play" 
          style={{ width: 38, height: 38 }}
          onClick={(e) => {
            e.stopPropagation();
            onPlayPause();
          }} 
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
        </button>

        <button 
          className="ctrl-btn" 
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }} 
          title="Next"
        >
          <SkipForward size={18} />
        </button>
      </div>
    </aside>
  );
}
