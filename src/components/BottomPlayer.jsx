import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Heart, 
  X, 
  Loader2
} from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';
import { resolveDirectArchiveUrl } from '../utils/mediaUrlResolver';

export default function BottomPlayer({
  currentTrack,
  isPlaying,
  isBuffering = false,
  onPlayPause,
  onPrev,
  onNext,
  isFavorite,
  onToggleFavorite,
  user,
  onOpenFullPlayer,
  onClose
}) {
  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-22 left-0 right-0 max-w-md mx-auto px-3 z-40 pointer-events-none animate-[barSlideUp_0.4s_cubic-bezier(0.22,1,0.36,1)]">
      <aside 
        className="pointer-events-auto w-full bg-slate-900/95 hover:bg-slate-900 text-white backdrop-blur-xl border border-slate-800/90 rounded-full p-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.3)] flex items-center justify-between gap-2.5 select-none transition-all duration-200"
      >
        {/* Track Thumbnail & Metadata (Clicking expands to Big Screen Vinyl Player) */}
        <div 
          onClick={onOpenFullPlayer}
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group active:opacity-85"
          title="Click to open full player"
        >
          <div className="relative w-11 h-11 shrink-0">
            <img 
              src={currentTrack.coverUrl || FALLBACK_ARTWORK} 
              alt={currentTrack.title}
              className={`w-11 h-11 rounded-full object-fit ring-1 ring-white/10 shadow-sm ${
                isPlaying ? 'ring-2 ring-amber-500/80 animate-[spinDisc_10s_linear_infinite]' : ''
              }`}
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
            {isPlaying && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-slate-900 animate-pulse" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-white truncate leading-snug group-hover:text-amber-400 transition-colors">
              {currentTrack.title}
            </h4>
            <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate leading-tight mt-0.5">
              {currentTrack.movie ? `${currentTrack.movie}` : currentTrack.artist || 'Vault Track'}
            </p>
          </div>
        </div>

        {/* Media Controls */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {user && (
            <button 
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(currentTrack.id);
              }}
              title={isFavorite ? "Remove favorite" : "Add favorite"}
            >
              <Heart size={20} fill={isFavorite ? '#e11d48' : 'none'} color={isFavorite ? '#e11d48' : 'currentColor'} />
            </button>
          )}

          <button 
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-90 cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }} 
            title="Previous"
          >
            <SkipBack size={15} fill="#ffffff" color="#ffffff" />
          </button>

          <button 
            className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 text-white flex items-center justify-center font-semibold transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              onPlayPause();
            }} 
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <div className="relative w-5 h-5 rounded-full bg-slate-900 animate-spin border border-white/30 shadow-md flex items-center justify-center shrink-0">
                <div className="absolute inset-0.5 rounded-full border border-white/20" />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 border border-slate-900" />
              </div>
            ) : isPlaying ? (
              <Pause size={17} fill="#ffffff" color="#ffffff" />
            ) : (
              <Play size={17} fill="#ffffff" color="#ffffff" className="ml-0.5" />
            )}
          </button>

          <button 
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-90 cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }} 
            title="Next"
          >
            <SkipForward size={15} fill="#ffffff" color="#ffffff" />
          </button>


          {/* Close Player X Button */}
          <button 
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90 cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }} 
            title="Close & Remove Playing Track"
          >
            <X size={15} />
          </button>
        </div>
      </aside>
    </div>
  );
}
