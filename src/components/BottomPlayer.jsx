import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart } from 'lucide-react';
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
    <div className="fixed bottom-22 left-0 right-0 max-w-md mx-auto px-3 z-40 pointer-events-none">
      <aside 
        onClick={onOpenFullPlayer}
        className="pointer-events-auto w-full bg-slate-900/95 hover:bg-slate-900 text-white backdrop-blur-xl border border-slate-800/90 rounded-2xl p-2 shadow-[0_12px_32px_rgba(15,23,42,0.25)] flex items-center justify-between gap-3 select-none cursor-pointer active:scale-[0.99] transition-all duration-200"
      >
        {/* Track Thumbnail & Metadata */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative w-10 h-10 shrink-0">
            <img 
              src={currentTrack.coverUrl || FALLBACK_ARTWORK} 
              alt={currentTrack.title}
              className={`w-10 h-10 rounded-xl object-fit ring-1 ring-white/10 shadow-sm ${isPlaying ? 'ring-amber-500/50' : ''}`}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = FALLBACK_ARTWORK;
              }}
            />
            {isPlaying && (
              <span className="absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full bg-amber-500 ring-2 ring-slate-900 animate-pulse" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-md font-bold text-white truncate leading-snug">
              {currentTrack.title}
            </h4>
            <p className="text-[11px] font-medium text-slate-400 truncate leading-tight mt-0.5">
              {currentTrack.movie ? `${currentTrack.movie}` : ''}
            </p>
          </div>
        </div>

        {/* Media Controls */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {user && (
            <button 
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400'}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(currentTrack.id);
              }}
              title={isFavorite ? "Remove favorite" : "Add favorite"}
            >
              <Heart size={25} fill={isFavorite ? '#e11d48' : 'none'} color={isFavorite ? '#e11d48' : 'currentColor'} />
            </button>
          )}

          <button 
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-90" 
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }} 
            title="Previous"
          >
            <SkipBack size={16} fill="#000000ff" color="#ffffffff"/>
          </button>

          <button 
            className="w-8 h-8 text-white flex items-center justify-center font-semibold transition-all shrink-0" 
            onClick={(e) => {
              e.stopPropagation();
              onPlayPause();
            }} 
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={23} fill="#000000ff" color="#ffffffff" />
            ) : (
              <Play size={23} fill="#000000ff" color="#ffffffff" />
            )}
          </button>

          <button 
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-90" 
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }} 
            title="Next"
          >
            <SkipForward size={16} fill="#000000ff" color="#ffffffff"/>
          </button>
        </div>
      </aside>
    </div>
  );
}
