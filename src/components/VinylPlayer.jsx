import React, { useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Heart, 
  Film, 
  Disc3,
  ListPlus,
  FolderPlus,
  ListMusic,
  ChevronDown
} from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

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
  onAddToQueue,
  onOpenPlaylistModal,
  isQueueMode = true,
  onToggleQueueMode,
  queueCount = 0,
  onCollapsePlayer,
  user
}) {
  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const waveformTrackRef = useRef(null);
  const isDraggingRef = useRef(false);

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
    <div className="w-full flex-1 mt-5 flex flex-col justify-between items-center py-1 px-1 select-none">

      {/* 1. Top Bar with Dropdown / Collapse Button on Top Left */}
      <div className="w-full flex items-center justify-between px-2 pt-0 pb-1 shrink-0">
        <button
          onClick={onCollapsePlayer}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs border border-slate-200/80"
          title="Minimize player"
        >
          <ChevronDown size={22} />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[12px] font-black uppercase tracking-widest text-slate-400 leading-none">Playing From</span>
          <span className="text-md font-bold text-slate-800 truncate max-w-[190px] mt-0.5">
            {currentTrack?.movie || 'Sound Vault'}
          </span>
        </div>

        <div className="w-9 h-9" />
      </div>

      {/* 2. Realistic Vinyl Record Centerpiece */}
      <div className="w-full flex items-center justify-center my-auto flex-1 min-h-0">
        {/* Outer Halo & Vinyl Body */}
        <div className="relative w-[min(84vw,35vh,320px)] h-[min(84vw,35vh,320px)] aspect-square rounded-full p-2.5 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 shadow-[0px_0px_45px_rgba(15,23,42,1)] ring-8 ring-white flex items-center justify-center shrink-0">
          
          {/* Subtle Vinyl Grooves Rings */}
          <div className="absolute inset-4 rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute inset-7 rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute inset-10 rounded-full border border-white/5 pointer-events-none" />
          
          {/* Rotating Vinyl Disc with Album Art */}
          <div 
            className="w-full h-full rounded-full overflow-hidden relative shadow-[0_8px_20px_rgba(0,0,0,0.35)] border-2 border-white"
            style={{ 
              animation: isPlaying ? 'spinDisc 16s linear infinite' : 'none'
            }}
          >
            <img 
              src={currentTrack?.coverUrl || FALLBACK_ARTWORK} 
              alt={currentTrack?.title} 
              className="w-full h-full object-fit rounded-full pointer-events-none"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = FALLBACK_ARTWORK;
              }}
            />
            {/* Center Spindle Core */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-4 border-black shadow-md z-10" />
          </div>
        </div>
      </div>

      {/* 3. Track Details: Title, Artist, and Favorite Toggle */}
      <div className="w-full px-2 my-2 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-xl font-black text-slate-900 tracking-tight truncate leading-tight">
              {currentTrack?.title || 'No Song Selected'}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 truncate mt-1">
              {currentTrack?.artist || 'Various Artists'}
              {currentTrack?.composer ? ` • ${currentTrack.composer}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Queue Mode Toggle Button */}
            <button 
              className={`p-2.5 rounded-full flex items-center justify-center relative cursor-pointer ${
                isQueueMode 
                  ? 'text-red-500' 
                  : 'text-black'
              }`}
              onClick={onToggleQueueMode}
              title={isQueueMode ? `Queue Mode: ON (Playing from queue${queueCount > 0 ? ` • ${queueCount} songs` : ' • Empty'})` : "Queue Mode: OFF (Playing random songs from vault)"}
            >
              <ListMusic size={36} />
              {queueCount > 0 && isQueueMode && (
                <span className="absolute top-0 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {queueCount}
                </span>
              )}
            </button>

            {user && (
              <button 
                className={`p-2 rounded-full transition-all active:scale-90 hover:scale-105 shrink-0 cursor-pointer ${isFavorite ? 'text-rose-600' : 'text-black hover:text-rose-500'}`}
                onClick={() => onToggleFavorite(currentTrack?.id)}
                title={isFavorite ? "Remove from Liked" : "Like Song"}
              >
                <Heart size={36} fill={isFavorite ? '#e11d48' : 'none'} color={isFavorite ? '#e11d48' : 'currentColor'} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Waveform Audio Frequency Seekbar */}
      <div className="w-full flex items-center justify-between gap-2.5 px-2.5 my-2 shrink-0">
        <span className="text-md font-bold text-black tabular-nums min-w-[34px] text-center">
          {formatTime(currentTime)}
        </span>

        <div 
          ref={waveformTrackRef}
          className="flex-1 h-10 flex items-center justify-between gap-[2.5px] px-1 py-1 cursor-pointer select-none touch-none rounded-xl transition-colors" 
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
                className={`flex-1 min-w-[2px] max-w-[4px] rounded-full transition-colors duration-150 ${
                  isPlayed 
                    ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_0_6px_rgba(217,119,6,0.35)]' 
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

        <span className="text-md font-bold text-black tabular-nums min-w-[34px] text-center">
          {formatTime(duration)}
        </span>
      </div>

      {/* 5. Playback Controls */}
      <div className="w-full mt-5 flex items-center justify-center gap-3 sm:gap-4.5 my-2 shrink-0 pb-2">
        <button 
          className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 flex items-center justify-center text-black transition-all active:scale-95 hover:scale-105 shadow-2xs cursor-pointer" 
          onClick={() => currentTrack && onAddToQueue?.(currentTrack)} 
          title="Add to Queue"
        >
          <ListPlus size={20} />
        </button>

        <button 
          className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 flex items-center justify-center text-black transition-all active:scale-95 hover:scale-105 shadow-2xs cursor-pointer" 
          onClick={onPrev} 
          title="Previous Track"
        >
          <SkipBack size={20} />
        </button>

        <button 
          className="w-18 h-18 rounded-full flex items-center justify-center text-black border-none bg-slate-100 hover:bg-slate-200 cursor-pointer relative transition-all active:scale-95 hover:scale-105" 
          onClick={onPlayPause} 
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={28} fill="#ffffffff" color="#000000" />
          ) : (
            <Play size={28} fill="#ffffffff" color="#000000" />
          )}
        </button>

        <button 
          className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 flex items-center justify-center text-black transition-all active:scale-95 hover:scale-105 shadow-2xs cursor-pointer" 
          onClick={onNext} 
          title="Next Track"
        >
          <SkipForward size={20} />
        </button>

        <button 
          className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 flex items-center justify-center text-black transition-all active:scale-95 hover:scale-105 shadow-2xs cursor-pointer" 
          onClick={() => currentTrack && onOpenPlaylistModal?.(currentTrack)} 
          title="Add to Playlist"
        >
          <FolderPlus size={20} />
        </button>
      </div>

    </div>
  );
}
