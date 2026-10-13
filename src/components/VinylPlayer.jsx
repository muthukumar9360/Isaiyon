import React, { useState, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Heart, 
  ListPlus, 
  FolderPlus, 
  ListMusic, 
  ChevronDown, 
  Sparkles, 
  SlidersHorizontal,
  Moon,
  Share2,
  Film,
  Music2,
  X,
  Check
} from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';
import { resolveDirectArchiveUrl } from '../utils/mediaUrlResolver';

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
  isBuffering = false,
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
  onOpenQueue,
  queueCount = 0,
  suggestedTracks = [],
  onSelectTrack,
  onCollapsePlayer,
  onClosePlayer,
  onOpenMovieModal,
  sleepTimer = 0,
  onSetSleepTimer,
  playbackRate = 1.0,
  onSetPlaybackRate,
  onShareTrack,
  user
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const waveformTrackRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Double-tap vs single-tap handler for Queue Mode button
  const queueTapTimerRef = useRef(null);
  const handleQueueButtonTap = () => {
    if (queueTapTimerRef.current) {
      clearTimeout(queueTapTimerRef.current);
      queueTapTimerRef.current = null;
      // Double tap detected -> Open Queue section directly
      onOpenQueue?.();
    } else {
      queueTapTimerRef.current = setTimeout(() => {
        queueTapTimerRef.current = null;
        // Single tap -> Toggle queue mode ON/OFF
        onToggleQueueMode?.();
      }, 260);
    }
  };

  const handleCollapse = () => {
    onCollapsePlayer?.();
  };

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
    <div className="w-full flex-1 min-h-[calc(100vh-6rem)] flex flex-col justify-between items-center py-1 px-1 select-none animate-[bigPlayerOpen_0.36s_cubic-bezier(0.16,1,0.3,1)] relative">

      {/* 1. Header: Minimize (Left) • Playing From (Center) • Audio Options / Features (Right) */}
      <div className="w-full relative flex items-center justify-between px-3 pt-0 pb-1.5 shrink-0">
        <button
          onClick={handleCollapse}
          className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/90 text-black flex items-center gap-1.5 text-xs font-extrabold transition-all active:scale-90 cursor-pointer shadow-2xs border border-slate-200"
          title="Minimize player"
        >
          <ChevronDown size={24} className="text-slate-600" />
        </button>

        <div className="flex flex-col items-center text-center max-w-[55%]">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Playing From</span>
          <span className="text-sm sm:text-base font-bold text-slate-800 truncate max-w-[200px] mt-0.5">
            {currentTrack?.movie || 'Sound Vault'}
          </span>
        </div>

        {/* Top-Right Feature Button: Audio Options & Extra Settings */}
        <button
          onClick={() => setShowOptionsModal(true)}
          className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/90 text-black flex items-center gap-1 text-xs font-extrabold transition-all active:scale-90 cursor-pointer shadow-2xs border border-slate-200"
          title="Audio settings & options"
        >
          <SlidersHorizontal size={18} className="text-slate-700" />
        </button>
      </div>

      {/* 2. Middle Centerpiece: Vinyl Disc OR Scrollable Suggested Songs List */}
      {!showSuggestions ? (
        /* Realistic Vinyl Record Centerpiece */
        <div className="w-full flex items-center justify-center my-auto flex-1 min-h-0 animate-[fadeIn_0.25s_ease-out]">
          <div className="relative w-[min(84vw,34vh,310px)] h-[min(84vw,34vh,310px)] aspect-square rounded-full p-2.5 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 shadow-[0px_0px_45px_rgba(15,23,42,1)] ring-8 ring-white flex items-center justify-center shrink-0 animate-[vinylDiscReveal_0.55s_cubic-bezier(0.22,1,0.36,1)]">
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
                  const raw = currentTrack?.coverUrl || '';
                  if (raw.includes('archive.org/download/') && !e.target.dataset.triedDirect) {
                    e.target.dataset.triedDirect = 'true';
                    e.target.src = resolveDirectArchiveUrl(raw);
                  } else {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_ARTWORK;
                  }
                }}
              />
              {/* Center Spindle Core */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-4 border-black shadow-md z-10" />
            </div>
          </div>
        </div>
      ) : (
        /* Scrollable Suggested Songs List (Replacing Disc when opened) */
        <div className="w-full flex-1 min-h-0 flex flex-col my-1 px-2.5 animate-[fadeIn_0.25s_ease-out]">
          <div className="flex items-center justify-between px-1 mb-2 shrink-0">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 font-display">
              <Sparkles size={14} className="text-amber-500" />
              <span>Suggested Songs ({suggestedTracks.length})</span>
            </span>
            <button 
              onClick={() => setShowSuggestions(false)}
              className="text-[11px] font-extrabold text-slate-600 hover:text-black px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
            >
              Show Disc
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[38vh] sm:max-h-[44vh] scrollbar-thin">
            {suggestedTracks.length === 0 ? (
              <div className="text-center py-8 text-xs font-semibold text-slate-400">
                All tracks currently queued or playing!
              </div>
            ) : (
              suggestedTracks.map((track) => (
                <div 
                  key={track.id}
                  className="p-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2.5 transition-all group"
                >
                  <div 
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    onClick={() => onSelectTrack?.(track)}
                  >
                    <img 
                      src={track.coverUrl || FALLBACK_ARTWORK} 
                      alt={track.title} 
                      className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                      onError={(e) => { e.target.src = FALLBACK_ARTWORK; }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                        {track.title}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500 truncate">
                        {track.movie || track.artist || 'Sound Vault'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => onAddToQueue?.(track)}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs"
                      title="Add to queue"
                    >
                      <ListPlus size={15} />
                    </button>
                    <button 
                      onClick={() => onOpenPlaylistModal?.(track)}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs"
                      title="Add to playlist"
                    >
                      <FolderPlus size={15} />
                    </button>
                    <button 
                      onClick={() => onSelectTrack?.(track)}
                      className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-xs"
                      title="Play track"
                    >
                      <Play size={13} fill="#ffffff" color="#ffffff" className="ml-0.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. Track Details: Title, Artist, Queue Mode Toggle (Double-Tap Supported), and Favorite */}
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
            {/* Queue Mode Toggle Button: Single Tap = On/Off, Double Tap = Open Queue Section */}
            <button 
              className={`p-2.5 rounded-full flex items-center justify-center relative cursor-pointer active:scale-90 transition-all ${
                isQueueMode 
                  ? 'text-red-500' 
                  : 'text-black'
              }`}
              onClick={handleQueueButtonTap}
              title={isQueueMode ? "Queue Mode: ON (Double-tap to open queue)" : "Queue Mode: OFF (Tap to toggle)"}
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

      {/* 5. Playback Controls Row:
          [Add to Playlist] [SkipBack] [Play/Pause with Rotating Disc] [SkipForward] [Suggested Songs Toggle] */}
      <div className="w-full mt-3 flex items-center justify-center gap-3 sm:gap-4.5 my-2 shrink-0 pb-2">
        {/* Far Left: Add Current Track to Playlist (replaces duplicate queue button) */}
        <button 
          className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 flex items-center justify-center text-black transition-all active:scale-95 hover:scale-105 shadow-2xs cursor-pointer" 
          onClick={() => currentTrack && onOpenPlaylistModal?.(currentTrack)} 
          title="Add to Playlist"
        >
          <FolderPlus size={20} />
        </button>

        <button 
          className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 flex items-center justify-center text-black transition-all active:scale-95 hover:scale-105 shadow-2xs cursor-pointer" 
          onClick={onPrev} 
          title="Previous Track"
        >
          <SkipBack size={20} />
        </button>

        {/* Center: Play / Pause Button with Rotating Vinyl Disc Loading */}
        <button 
          className="w-18 h-18 rounded-full flex items-center justify-center text-black border-none bg-slate-100 hover:bg-slate-200 cursor-pointer relative transition-all active:scale-95 hover:scale-105" 
          onClick={onPlayPause} 
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isBuffering ? (
            /* Rotating Mini Disc Loading Animation */
            <div className="relative w-8 h-8 rounded-full bg-slate-900 animate-spin border-2 border-white/20 shadow-md flex items-center justify-center shrink-0">
              <div className="absolute inset-1 rounded-full border border-white/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-slate-900" />
            </div>
          ) : isPlaying ? (
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

        {/* Far Right: Toggle Suggested Songs List (replaces playlist button here) */}
        <button 
          className={`w-12 h-12 rounded-full border border-slate-200/80 flex items-center justify-center transition-all active:scale-95 hover:scale-105 shadow-2xs cursor-pointer ${
            showSuggestions ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-black'
          }`} 
          onClick={() => setShowSuggestions(prev => !prev)} 
          title={showSuggestions ? "Hide Suggested Songs" : "Show Suggested Songs"}
        >
          <Sparkles size={20} />
        </button>
      </div>

      {/* 6. Audio Options / Quick Features Modal */}
      {showOptionsModal && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-[modalPop_0.2s_ease-out]"
          onClick={() => setShowOptionsModal(false)}
        >
          <div 
            className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl relative border border-slate-100 flex flex-col gap-4 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 font-display">
                <SlidersHorizontal size={15} className="text-amber-500" />
                <span>Audio Settings & Options</span>
              </h3>
              <button 
                onClick={() => setShowOptionsModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Sleep Timer */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Moon size={12} className="text-indigo-500" />
                <span>Sleep Timer</span>
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 15, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      onSetSleepTimer?.(mins);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      sleepTimer === mins 
                        ? 'bg-slate-900 text-white shadow-xs' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {mins === 0 ? 'Off' : `${mins}m`}
                  </button>
                ))}
              </div>
            </div>

            {/* Playback Speed */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Playback Speed
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      onSetPlaybackRate?.(rate);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      playbackRate === rate 
                        ? 'bg-slate-900 text-white shadow-xs' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Share Track & View Movie */}
            <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
              {currentTrack?.movie && onOpenMovieModal && (
                <button
                  onClick={() => {
                    setShowOptionsModal(false);
                    onOpenMovieModal(currentTrack.movie);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-between transition-all cursor-pointer border border-slate-200/80"
                >
                  <span className="flex items-center gap-2">
                    <Film size={14} className="text-amber-600" />
                    <span>View Movie Soundtrack</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[100px]">
                    {currentTrack.movie}
                  </span>
                </button>
              )}

              {onShareTrack && currentTrack && (
                <button
                  onClick={() => {
                    setShowOptionsModal(false);
                    onShareTrack(currentTrack);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-slate-200/80"
                >
                  <Share2 size={14} className="text-slate-600" />
                  <span>Share Song Link</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
