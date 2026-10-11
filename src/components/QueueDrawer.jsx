import React, { useState } from 'react';
import { 
  GripVertical, 
  Play, 
  Trash2, 
  Plus, 
  Volume2, 
  Sparkles,
  ArrowUp,
  ArrowDown,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

export default function QueueDrawer({
  currentTrack,
  queue,
  onReorderQueue,
  onPlayQueueTrack,
  onRemoveFromQueue,
  suggestedTracks,
  onAddToQueue,
  isPlaying,
  onPlayPause
}) {
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Drag and Drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (draggedIndex !== targetIndex) {
      const newQueue = [...queue];
      const [movedItem] = newQueue.splice(draggedIndex, 1);
      newQueue.splice(targetIndex, 0, movedItem);
      onReorderQueue(newQueue);
    }
    setDraggedIndex(null);
  };

  // Mobile arrow move handlers
  const moveItem = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= queue.length) return;
    const newQueue = [...queue];
    const [item] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, item);
    onReorderQueue(newQueue);
  };

  return (
    <div className="w-full flex flex-col gap-5 select-none">
      {/* 1. Currently Playing Card */}
      <section className="flex flex-col gap-2.5 mt-5">
        <h4 className="text-sm font-extrabold text-slate-900 tracking-tight font-display">
          Now Playing
        </h4>
        {currentTrack ? (
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-300 ring-1 ring-amber-400/30 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <img 
                src={currentTrack.coverUrl || FALLBACK_ARTWORK} 
                alt={currentTrack.title} 
                className="w-20 h-12 rounded-xl object-fit shrink-0 shadow-2xs ring-1 ring-amber-400/40"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = FALLBACK_ARTWORK;
                }}
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block leading-snug">
                  {currentTrack.title}
                </span>
                <span className="text-[11px] font-medium text-slate-500 truncate block mt-0.5">
                  {currentTrack.movie ? `${currentTrack.movie}` : ''}
                </span>
              </div>
            </div>
            <button 
              onClick={onPlayPause}
              className="w-12 h-12 flex items-center justify-center font-bold"
            >
              {isPlaying ? <PauseCircle size={30} /> : <PlayCircle size={30} />}
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-2">No track selected.</p>
        )}
      </section>

      {/* 2. Up Next / Reorderable Queue */}
      <section className="flex flex-col gap-2.5">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-extrabold text-slate-900 tracking-tight font-display">
            Up Next
          </h4>
          <span className="text-xs font-semibold text-slate-400">
            {queue.length} in queue
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="my-3.5 p-6 text-center text-slate-400 bg-slate-50/90 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs font-medium">Queue is empty. Suggested tracks below will play automatically.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {queue.map((track, idx) => (
              <div
                key={`${track.id}-${idx}`}
                className={`p-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 flex items-center gap-2 transition-all shadow-2xs ${
                  draggedIndex === idx ? 'opacity-50' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
              >
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing text-black" title="Drag to reorder">
                  <GripVertical size={20} />
                </div>

                <img 
                  src={track.coverUrl || FALLBACK_ARTWORK} 
                  alt={track.title} 
                  className="w-15 h-10 rounded-xl object-fit"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_ARTWORK;
                  }}
                />

                <div 
                  className="min-w-0 flex-1 cursor-pointer" 
                  onClick={() => onPlayQueueTrack(idx)}
                >
                  <span className="text-xs font-bold text-slate-900 truncate block leading-snug">
                    {track.title}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate block mt-0.5 font-medium">
                    {track.movie ? `${track.movie}` : ''}
                  </span>
                </div>

                {/* Move Up/Down arrows for mobile + Remove */}
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => moveItem(idx, idx - 1)}
                    disabled={idx === 0}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 text-black flex items-center justify-center transition-all active:scale-90"
                    title="Move up"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button 
                    onClick={() => moveItem(idx, idx + 1)}
                    disabled={idx === queue.length - 1}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 text-black flex items-center justify-center transition-all active:scale-90"
                    title="Move down"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button 
                    onClick={() => onRemoveFromQueue(idx)}
                    className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-black flex items-center justify-center transition-all active:scale-90 ml-0.5"
                    title="Remove from queue"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Suggested Songs */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-extrabold text-slate-900 tracking-tight font-display">
            Suggested For You
          </h4>
        </div>

        <div className="flex flex-col gap-2">
          {suggestedTracks.slice(0, 5).map(track => (
            <div 
              key={track.id} 
              className="p-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 flex items-center justify-between gap-2.5 shadow-2xs transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img 
                  src={track.coverUrl || FALLBACK_ARTWORK} 
                  alt={track.title} 
                  className="w-15 h-10 rounded-xl object-fit shrink-0 shadow-2xs"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_ARTWORK;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-900 truncate block leading-snug">
                    {track.title}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate block mt-0.5 font-medium">
                    {track.movie ? `[${track.movie}] ` : ''}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => onAddToQueue(track)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                title="Add to queue"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Queue</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
