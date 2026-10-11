import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Heart, 
  X, 
  Minimize2, 
  Maximize2, 
  Volume2, 
  Move,
  Pipette,
  ExternalLink
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
  onOpenFullPlayer,
  playerViewMode = 'mini',
  onSetPlayerViewMode,
  onClose
}) {
  if (!currentTrack) return null;

  // Draggable position state for Mini Bubble view
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, posX: 0, posY: 0, hasMoved: false });
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  // Handle pointer down (touch or mouse)
  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: position.x,
      posY: position.y,
      hasMoved: false
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;

    if (Math.hypot(dx, dy) > 5) {
      dragStartRef.current.hasMoved = true;
    }

    // Keep within bounds so it NEVER disappears completely from the screen
    // Default anchor is bottom: 84px, right: 18px.
    const maxRight = 10; // Can't go too far right (leaves at least 42px visible)
    const minLeft = -(window.innerWidth - 65); // Can't go too far left
    const maxDown = 35; // Can't go below navigation bar
    const maxUp = -(window.innerHeight - 150); // Can't go above top status bar

    const clampedX = Math.max(minLeft, Math.min(maxRight, dragStartRef.current.posX + dx));
    const clampedY = Math.max(maxUp, Math.min(maxDown, dragStartRef.current.posY + dy));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}

    // If it was just a tap/click without dragging, expand to Bottom Player Bar!
    if (!dragStartRef.current.hasMoved) {
      onSetPlayerViewMode?.('bar');
    }
  };

  // Picture-in-Picture over other apps in mobile/desktop
  const handleTogglePiP = async (e) => {
    e?.stopPropagation();
    try {
      if ('documentPictureInPicture' in window) {
        if (window.documentPictureInPicture.window) {
          window.documentPictureInPicture.window.close();
          return;
        }
        const pipWin = await window.documentPictureInPicture.requestWindow({
          width: 320,
          height: 140
        });
        pipWin.document.body.style.margin = '0';
        pipWin.document.body.style.background = '#090d16';
        pipWin.document.body.style.display = 'flex';
        pipWin.document.body.style.alignItems = 'center';
        pipWin.document.body.style.padding = '12px';
        pipWin.document.body.style.fontFamily = 'system-ui, sans-serif';
        pipWin.document.body.style.color = '#fff';
        pipWin.document.body.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;width:100%">
            <img src="${currentTrack.coverUrl || '/logo.png'}" style="width:52px;height:52px;border-radius:12px;object-fit:cover;box-shadow:0 4px 12px rgba(0,0,0,0.5)" />
            <div style="flex:1;overflow:hidden">
              <div style="font-weight:bold;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff">${currentTrack.title}</div>
              <div style="font-size:11px;color:#f59e0b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${currentTrack.movie || currentTrack.artist || 'IsaiVault'}</div>
            </div>
          </div>
        `;
        return;
      }

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }

      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = 300;
        canvas.height = 300;
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, 300, 300);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = currentTrack.coverUrl || '/logo.png';
        img.onload = async () => {
          ctx.drawImage(img, 20, 20, 260, 220);
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(20, 190, 260, 50);
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillText(currentTrack.title.slice(0, 24), 28, 215);
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '11px sans-serif';
          ctx.fillText((currentTrack.movie || currentTrack.artist || '').slice(0, 26), 28, 230);

          const stream = canvas.captureStream(10);
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          await videoRef.current.requestPictureInPicture();
        };
        if (img.complete) img.onload();
      }
    } catch (err) {
      console.warn("PiP mode:", err);
    }
  };

  return (
    <>
      {/* Hidden elements for native Mobile/Desktop PiP streaming over other apps */}
      <canvas ref={canvasRef} className="hidden" />
      <video ref={videoRef} muted playsInline className="hidden" />

      {/* 1. MINI FLOATING BUBBLE / DRAGGABLE THUMBNAIL VIEW */}
      {playerViewMode === 'mini' ? (
        <div 
          className="fixed z-50 pointer-events-none transition-transform duration-75 ease-out select-none"
          style={{
            bottom: '84px',
            right: '18px',
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`
          }}
        >
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`pointer-events-auto relative group touch-none cursor-grab active:cursor-grabbing p-1 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/25 shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all duration-150 active:scale-95 flex items-center justify-center ${
              isPlaying ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900' : 'ring-1 ring-white/10'
            }`}
            title="Drag anywhere • Tap to expand"
          >
            {/* Rotating Vinyl Thumbnail */}
            <div className="relative w-13 h-13 rounded-xl overflow-hidden shrink-0 shadow-inner">
              <img 
                src={currentTrack.coverUrl || FALLBACK_ARTWORK} 
                alt={currentTrack.title}
                className={`w-full h-full object-cover select-none pointer-events-none transition-all ${
                  isPlaying ? 'animate-[spinDisc_8s_linear_infinite]' : ''
                }`}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = FALLBACK_ARTWORK;
                }}
              />

              {/* Center Vinyl Hole Indicator */}
              <div className="absolute inset-0 m-auto w-3.5 h-3.5 rounded-full bg-slate-950/80 border border-amber-400/60 flex items-center justify-center shadow-xs">
                <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
              </div>

              {/* Micro Equalizer Overlay when playing */}
              {isPlaying && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent pt-2 pb-0.5 flex items-end justify-center gap-0.5">
                  <span className="w-0.5 bg-amber-400 rounded-full animate-[stemPulse_0.6s_ease-in-out_infinite] h-2" />
                  <span className="w-0.5 bg-amber-400 rounded-full animate-[stemPulse_0.9s_ease-in-out_infinite] h-3.5" />
                  <span className="w-0.5 bg-amber-400 rounded-full animate-[stemPulse_0.7s_ease-in-out_infinite] h-2.5" />
                </div>
              )}
            </div>

            {/* Mini Play / Pause State Icon badge */}
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md border border-slate-900">
              {isPlaying ? (
                <Volume2 size={11} className="animate-pulse" />
              ) : (
                <Play size={10} className="ml-0.5" />
              )}
            </div>

            {/* Micro Drag Handle Indicator */}
            <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-slate-800 text-slate-300 opacity-60 group-hover:opacity-100 flex items-center justify-center shadow-xs border border-white/10">
              <Move size={8} />
            </div>
          </div>
        </div>
      ) : (
        /* 2. EXPANDED BOTTOM PLAYER BAR VIEW */
        <div className="fixed bottom-20 left-0 right-0 max-w-md mx-auto px-3 z-40 pointer-events-none animate-[slideUp_0.18s_ease-out]">
          <aside 
            className="pointer-events-auto w-full bg-slate-900/95 hover:bg-slate-900 text-white backdrop-blur-xl border border-slate-800/90 rounded-2xl p-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.3)] flex items-center justify-between gap-2.5 select-none transition-all duration-200"
          >
            {/* Track Thumbnail & Metadata (Clicking expands to Big Screen Player) */}
            <div 
              onClick={onOpenFullPlayer}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group active:opacity-85"
              title="Click to open big screen player"
            >
              <div className="relative w-11 h-11 shrink-0">
                <img 
                  src={currentTrack.coverUrl || FALLBACK_ARTWORK} 
                  alt={currentTrack.title}
                  className={`w-11 h-11 rounded-xl object-cover ring-1 ring-white/10 shadow-sm ${
                    isPlaying ? 'ring-2 ring-amber-500/80 animate-[spinDisc_10s_linear_infinite]' : ''
                  }`}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_ARTWORK;
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
                {isPlaying ? (
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

              {/* PiP Over Other Apps Button */}
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-white/10 transition-all active:scale-90 cursor-pointer"
                onClick={handleTogglePiP}
                title="Float Over Other Apps (PiP)"
              >
                <ExternalLink size={13} />
              </button>

              {/* Minimize to Mini Floating View Button */}
              <button 
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-white/10 transition-all active:scale-90 cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation();
                  onSetPlayerViewMode?.('mini');
                }} 
                title="Minimize to Floating Bubble"
              >
                <Minimize2 size={14} />
              </button>

              {/* Close Player X Button - Clears track from entire application */}
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
      )}
    </>
  );
}
