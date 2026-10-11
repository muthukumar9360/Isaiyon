import React, { useState } from 'react';
import { 
  GripVertical, 
  Play, 
  Trash2, 
  Plus, 
  Volume2, 
  Sparkles,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

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

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newQueue = [...queue];
    const [movedItem] = newQueue.splice(draggedIndex, 1);
    newQueue.splice(targetIndex, 0, movedItem);

    onReorderQueue(newQueue);
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
    <div className="queue-container">
      {/* Currently Playing Card */}
      <div className="queue-section">
        <h4 className="queue-section-title">Now Playing</h4>
        {currentTrack ? (
          <div className="queue-now-playing-card">
            <img src={currentTrack.coverUrl} alt={currentTrack.title} className="queue-thumb" />
            <div className="queue-meta">
              <span className="queue-title">{currentTrack.title}</span>
              <span className="queue-sub">{currentTrack.movie || currentTrack.artist}</span>
            </div>
            <button className="ctrl-btn" onClick={onPlayPause}>
              {isPlaying ? <Volume2 size={18} color="var(--accent-gold)" /> : <Play size={18} />}
            </button>
          </div>
        ) : (
          <p className="queue-empty-text">No track selected.</p>
        )}
      </div>

      {/* Up Next / Reorderable Queue */}
      <div className="queue-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 className="queue-section-title">Up Next (Drag & Drop to Reorder)</h4>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{queue.length} in queue</span>
        </div>

        {queue.length === 0 ? (
          <p className="queue-empty-text">Queue is empty. Suggested tracks below will play automatically.</p>
        ) : (
          <div className="queue-items-list">
            {queue.map((track, idx) => (
              <div
                key={`${track.id}-${idx}`}
                className={`queue-item-row ${draggedIndex === idx ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
              >
                {/* Drag Handle */}
                <div className="queue-drag-handle" title="Drag to reorder">
                  <GripVertical size={16} color="var(--text-faint)" />
                </div>

                <img src={track.coverUrl} alt={track.title} className="queue-thumb-sm" />

                <div className="queue-meta" onClick={() => onPlayQueueTrack(idx)}>
                  <span className="queue-title">{track.title}</span>
                  <span className="queue-sub">{track.movie || track.artist}</span>
                </div>

                {/* Move Up/Down arrows for mobile + Remove */}
                <div className="queue-actions">
                  <button 
                    className="ctrl-btn-mini" 
                    onClick={() => moveItem(idx, idx - 1)}
                    disabled={idx === 0}
                    title="Move up"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button 
                    className="ctrl-btn-mini" 
                    onClick={() => moveItem(idx, idx + 1)}
                    disabled={idx === queue.length - 1}
                    title="Move down"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button 
                    className="ctrl-btn-mini" 
                    onClick={() => onRemoveFromQueue(idx)}
                    title="Remove from queue"
                    style={{ color: 'var(--accent-rose)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Songs (Auto-loaded based on movie / mood) */}
      <div className="queue-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Sparkles size={14} color="var(--accent-gold)" />
          <h4 className="queue-section-title" style={{ margin: 0 }}>
            Suggested For You
          </h4>
        </div>

        <div className="suggested-list">
          {suggestedTracks.slice(0, 5).map(track => (
            <div key={track.id} className="suggested-row">
              <img src={track.coverUrl} alt={track.title} className="queue-thumb-sm" />
              <div className="queue-meta">
                <span className="queue-title">{track.title}</span>
                <span className="queue-sub">{track.movie ? `[${track.movie}] ` : ''}{track.artist}</span>
              </div>
              <button 
                className="btn-add-queue"
                onClick={() => onAddToQueue(track)}
                title="Add to queue"
              >
                <Plus size={14} />
                <span>Queue</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
