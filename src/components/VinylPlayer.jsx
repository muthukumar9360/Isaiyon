import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Heart, 
  Film, 
  MoreHorizontal, 
  Music2 
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

  const waveformTrackRef = React.useRef(null);
  const isDraggingRef = React.useRef(false);

  const seekFromClientX = (clientX) => {
    if (!waveformTrackRef.current || !duration) return;
    const rect = waveformTrackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    seekFromClientX(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (isDraggingRef.current) {
      seekFromClientX(e.clientX);
    }
  };

  const handlePointerUp = (e) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch (_) {}
    }
  };

  return (
    /* Centered, Bordered Player Card (Direct Height Control for Live Customization) */
    <div className="w-full max-w-[380px] h-[calc(100dvh-150px)] mx-auto flex flex-col justify-between items-center px-6 py-6 sm:px-7 sm:py-7 bg-white rounded-[32px] sm:rounded-[36px] border-2 border-slate-900/40 shadow-[0_16px_45px_rgba(15,23,42,0.08)] select-none relative overflow-hidden">
      
      {/* 1. Header Row: "Now Playing" and action pills */}
      <div className="w-full flex items-center justify-between mb-2 shrink-0">
        <button 
          className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-amber-600 transition-transform active:scale-95 shadow-2xs"
          title="Now Playing"
        >
          <Music2 size={16} />
        </button>

        <h1 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight">
          Now Playing
        </h1>

        <button 
          className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-transform active:scale-95 shadow-2xs"
          title="More Options"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* 2. Centerpiece: Full-bleed Rotating Vinyl Disc with Halo Ring */}
      <div className="w-full flex items-center justify-center my-auto flex-1 min-h-0 py-2">
        <div className="w-[min(58vw,28vh,220px)] h-[min(58vw,28vh,220px)] aspect-square rounded-full p-2.5 bg-gradient-to-tr from-amber-500/15 via-amber-400/5 to-amber-600/20 border-2 border-amber-500/25 shadow-[0_14px_36px_rgba(217,119,6,0.18)] flex items-center justify-center shrink-0">
          <div className={`w-full h-full rounded-full overflow-hidden relative shadow-[0_10px_25px_rgba(15,23,42,0.22)] border-[3px] border-white ref-disc ${isPlaying ? 'rotating' : ''}`}>
            {/* Full 100% cover image filling entire 360 circle */}
            <img 
              src={currentTrack?.coverUrl || FALLBACK_ARTWORK} 
              alt={currentTrack?.title} 
              className="absolute inset-0 w-full h-full object-cover rounded-full pointer-events-none"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = FALLBACK_ARTWORK;
              }}
            />
            {/* Center vinyl spindle dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-4 border-amber-900 shadow-[0_2px_8px_rgba(0,0,0,0.3)] z-10" />
          </div>
        </div>
      </div>

      {/* 3. Track Details: Title and Artist */}
      <div className="w-full text-center px-4 my-1.5 shrink-0">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
          {currentTrack?.title || 'No Song Selected'}
        </h2>
        <p className="text-xs sm:text-sm font-semibold text-slate-500 truncate mt-1">
          {currentTrack?.artist || 'Various Artists'}
          {currentTrack?.composer ? ` • ${currentTrack.composer}` : ''}
        </p>
      </div>

      {/* 4. Sub-Actions: Movie badge and Liked Heart */}
      <div className="w-full flex items-center justify-between px-3 my-1.5 shrink-0">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-700 text-xs font-semibold shadow-xs">
          <Film size={13} className="text-amber-600 shrink-0" />
          <span className="truncate max-w-[200px]">{currentTrack?.movie || 'Soundtrack'}</span>
        </div>

        {user && (
          <button 
            className={`p-2 rounded-full transition-transform active:scale-90 hover:scale-110 ${isFavorite ? 'text-rose-600' : 'text-slate-400 hover:text-rose-500'}`}
            onClick={() => onToggleFavorite(currentTrack?.id)}
            title={isFavorite ? "Remove from Liked" : "Like Song"}
          >
            <Heart size={22} fill={isFavorite ? '#e11d48' : 'none'} color={isFavorite ? '#e11d48' : 'currentColor'} />
          </button>
        )}
      </div>

      {/* 5. Soundwave Audio Frequency Seekbar (Touch/Click seekable) */}
      <div className="w-full flex items-center justify-between gap-2.5 px-2 my-2 shrink-0">
        <span className="text-xs font-bold text-slate-500 tabular-nums min-w-[34px] text-center">
          {formatTime(currentTime)}
        </span>

        <div 
          ref={waveformTrackRef}
          className="flex-1 h-9 sm:h-10 flex items-center justify-between gap-[2px] sm:gap-[3px] px-1 py-1 cursor-pointer select-none touch-none" 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title="Drag or click to seek audio"
        >
          {WAVE_BAR_HEIGHTS.map((h, i) => {
            const barRatio = i / WAVE_BAR_HEIGHTS.length;
            const isPlayed = barRatio <= progressRatio;
            return (
              <div 
                key={i} 
                className={`flex-1 min-w-[2px] max-w-[4.5px] rounded-full transition-colors duration-200 ${
                  isPlayed 
                    ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(217,119,6,0.45)]' 
                    : 'bg-slate-200'
                } ${isPlaying && isPlayed ? 'ref-wave-stem-pulse' : ''}`}
                style={{ 
                  height: `${Math.max(18, Math.round((h / 34) * 100))}%`,
                  animationDelay: `${(i % 5) * 0.15}s` 
                }}
              />
            );
          })}
        </div>

        <span className="text-xs font-bold text-slate-500 tabular-nums min-w-[34px] text-center">
          {formatTime(duration)}
        </span>
      </div>

      {/* 6. Media Playback Controls: Previous, Glowing Play/Pause, Next */}
      <div className="w-full flex items-center justify-center gap-7 sm:gap-9 my-2 shrink-0">
        <button 
          className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 flex items-center justify-center text-slate-700 transition-all active:scale-95 hover:scale-105 shadow-sm" 
          onClick={onPrev} 
          title="Previous Track"
        >
          <SkipBack size={24} />
        </button>

        <button 
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white border-none cursor-pointer relative shadow-[0_12px_30px_rgba(217,119,6,0.4)] transition-all active:scale-95 hover:scale-105" 
          onClick={onPlayPause} 
          title={isPlaying ? 'Pause' : 'Play'}
        >
          <div className="absolute -inset-1.5 rounded-full border-2 border-amber-500/35 pointer-events-none animate-pulse" />
          {isPlaying ? (
            <Pause size={30} fill="#ffffff" color="#ffffff" />
          ) : (
            <Play size={30} fill="#ffffff" color="#ffffff" className="ml-1" />
          )}
        </button>

        <button 
          className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 flex items-center justify-center text-slate-700 transition-all active:scale-95 hover:scale-105 shadow-sm" 
          onClick={onNext} 
          title="Next Track"
        >
          <SkipForward size={24} />
        </button>
      </div>

    </div>
  );
}
