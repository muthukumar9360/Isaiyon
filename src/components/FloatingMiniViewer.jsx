import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

/**
 * FloatingMiniViewer
 * Floats a mini player window over other applications (OS-level Picture-in-Picture)
 * when the user exits/switches away from the app while music is playing,
 * or when manually toggled.
 */
const FloatingMiniViewer = forwardRef(function FloatingMiniViewer({
  currentTrack,
  isPlaying,
  currentTime = 0,
  duration = 0,
  onPlayPause,
  onNext,
  onPrev,
  onPipStateChange,
  onCloseApp
}, ref) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const pipWindowRef = useRef(null);
  const imageCacheRef = useRef(null);

  // Notify parent of PiP state changes
  useEffect(() => {
    onPipStateChange?.(isPipActive);
  }, [isPipActive, onPipStateChange]);

  // Preload track artwork for canvas drawing
  useEffect(() => {
    if (!currentTrack) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentTrack.coverUrl || FALLBACK_ARTWORK;
    img.onload = () => {
      imageCacheRef.current = img;
      drawCanvasFrame();
    };
    img.onerror = () => {
      const fallback = new Image();
      fallback.src = FALLBACK_ARTWORK;
      fallback.onload = () => {
        imageCacheRef.current = fallback;
        drawCanvasFrame();
      };
    };
  }, [currentTrack?.coverUrl, currentTrack?.id]);

  // Draw current playing card frame onto canvas
  const drawCanvasFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentTrack) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.6, '#0f172a');
    bgGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Accent header bar
    const barGrad = ctx.createLinearGradient(0, 0, width, 0);
    barGrad.addColorStop(0, '#f59e0b');
    barGrad.addColorStop(1, '#ea580c');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, width, 4);

    // Top-right close indicator badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.beginPath();
    ctx.arc(width - 24, 24, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', width - 24, 24);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';

    // Album art thumbnail
    const artSize = 130;
    const artX = 24;
    const artY = 32;

    if (imageCacheRef.current) {
      try {
        ctx.save();
        ctx.beginPath();
        // Rounded rectangle for art
        const r = 16;
        ctx.moveTo(artX + r, artY);
        ctx.arcTo(artX + artSize, artY, artX + artSize, artY + artSize, r);
        ctx.arcTo(artX + artSize, artY + artSize, artX, artY + artSize, r);
        ctx.arcTo(artX, artY + artSize, artX, artY, r);
        ctx.arcTo(artX, artY, artX + artSize, artY, r);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(imageCacheRef.current, artX, artY, artSize, artSize);
        ctx.restore();
      } catch (_) {
        // Fallback placeholder
        ctx.fillStyle = '#334155';
        ctx.fillRect(artX, artY, artSize, artSize);
      }
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(artX, artY, artSize, artSize);
    }

    // Text metadata
    const textX = artX + artSize + 22;

    // Brand badge
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('ISAIYON • FLOATING PLAYER', textX, 48);

    // Track title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    const title = (currentTrack.title || 'Unknown Track').replace(/_+/g, ' ');
    const truncatedTitle = title.length > 22 ? `${title.slice(0, 22)}...` : title;
    ctx.fillText(truncatedTitle, textX, 82);

    // Movie / Artist
    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px system-ui, -apple-system, sans-serif';
    const subtitle = (currentTrack.movie ? currentTrack.movie : currentTrack.artist || 'Pure Sound').replace(/_+/g, ' ');
    const truncatedSub = subtitle.length > 26 ? `${subtitle.slice(0, 26)}...` : subtitle;
    ctx.fillText(truncatedSub, textX, 110);

    // Playing state badge
    ctx.fillStyle = isPlaying ? '#10b981' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(textX + 6, 138, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(isPlaying ? 'Playing in background' : 'Paused', textX + 18, 142);

    // Progress bar at bottom
    const progressY = height - 12;
    const progressWidth = width - 48;
    const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

    // Track background bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(24, progressY, progressWidth, 4);

    // Active progress bar
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(24, progressY, progressWidth * progress, 4);
  }, [currentTrack, isPlaying, currentTime, duration]);

  // Redraw when time or state updates
  useEffect(() => {
    drawCanvasFrame();
  }, [drawCanvasFrame]);

  // Request Picture-in-Picture
  const requestPiP = useCallback(async () => {
    if (!currentTrack) return;

    // 1. Check Document Picture-in-Picture API (Chrome 116+ on desktop)
    if ('documentPictureInPicture' in window && window.documentPictureInPicture.requestWindow) {
      try {
        if (pipWindowRef.current) return;
        const pipWin = await window.documentPictureInPicture.requestWindow({
          width: 340,
          height: 160
        });
        pipWindowRef.current = pipWin;
        setIsPipActive(true);

        // Copy styles or set clean modern styles
        pipWin.document.body.style.margin = '0';
        pipWin.document.body.style.backgroundColor = '#0f172a';
        pipWin.document.body.style.color = '#ffffff';
        pipWin.document.body.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        pipWin.document.body.style.display = 'flex';
        pipWin.document.body.style.alignItems = 'center';
        pipWin.document.body.style.padding = '12px';
        pipWin.document.body.style.gap = '12px';
        pipWin.document.body.style.boxSizing = 'border-box';
        pipWin.document.body.style.position = 'relative';

        const updatePipDOM = () => {
          if (!pipWindowRef.current) return;
          const body = pipWindowRef.current.document.body;
          body.innerHTML = `
            <button id="pip-close" title="Close player & exit" style="position: absolute; top: 6px; right: 8px; width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.15); border: none; color: #cbd5e1; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; line-height: 1;">✕</button>
            <img src="${currentTrack.coverUrl || FALLBACK_ARTWORK}" style="width: 72px; height: 72px; border-radius: 10px; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.4);" />
            <div style="flex: 1; min-width: 0; padding-right: 18px;">
              <div style="font-size: 10px; font-weight: 700; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Isaiyon</div>
              <div style="font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff;">${(currentTrack.title || '').replace(/_+/g, ' ')}</div>
              <div style="font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">${(currentTrack.movie || currentTrack.artist || 'Vault').replace(/_+/g, ' ')}</div>
              <div style="display: flex; gap: 8px; margin-top: 8px;">
                <button id="pip-prev" style="background: rgba(255,255,255,0.1); border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 12px;">⏮</button>
                <button id="pip-play" style="background: #f59e0b; border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 12px; font-weight: bold;">${isPlaying ? '❚❚' : '▶'}</button>
                <button id="pip-next" style="background: rgba(255,255,255,0.1); border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 12px;">⏭</button>
              </div>
            </div>
          `;

          body.querySelector('#pip-close')?.addEventListener('click', () => {
            try { pipWindowRef.current?.close(); } catch (_) {}
            pipWindowRef.current = null;
            setIsPipActive(false);
            onCloseApp?.();
          });
          body.querySelector('#pip-prev')?.addEventListener('click', () => onPrev?.());
          body.querySelector('#pip-play')?.addEventListener('click', () => onPlayPause?.());
          body.querySelector('#pip-next')?.addEventListener('click', () => onNext?.());
        };

        updatePipDOM();

        pipWin.addEventListener('pagehide', () => {
          pipWindowRef.current = null;
          setIsPipActive(false);
          onCloseApp?.();
        });

        return;
      } catch (docPipErr) {
        console.warn('Document PiP failed, falling back to Video PiP:', docPipErr);
      }
    }

    // 2. Standard HTML5 Video Picture-in-Picture fallback
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    try {
      if (!video.srcObject) {
        const stream = canvas.captureStream(15);
        video.srcObject = stream;
      }
      await video.play();

      if (document.pictureInPictureElement !== video) {
        await video.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch (err) {
      console.warn('Video PiP could not be started:', err.message);
    }
  }, [currentTrack, isPlaying, onPlayPause, onNext, onPrev]);

  // Exit Picture-in-Picture
  const exitPiP = useCallback(async () => {
    if (pipWindowRef.current) {
      try {
        pipWindowRef.current.close();
      } catch (_) {}
      pipWindowRef.current = null;
      setIsPipActive(false);
      return;
    }

    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch (_) {}
      setIsPipActive(false);
    }
  }, []);

  // Listen for video PiP leave events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLeavePiP = () => {
      setIsPipActive(false);
      onCloseApp?.();
    };

    video.addEventListener('leavepictureinpicture', handleLeavePiP);
    return () => {
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, []);

  // Expose imperative methods to trigger PiP from parent buttons
  useImperativeHandle(ref, () => ({
    toggle: () => {
      if (isPipActive) {
        exitPiP();
      } else {
        requestPiP();
      }
    },
    request: requestPiP,
    exit: exitPiP,
    isActive: () => isPipActive
  }), [isPipActive, exitPiP, requestPiP]);

  // AUTO FLOAT OVER OTHER APPS:
  // When user minimizes or exits the browser / app while music is playing
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // App is minimized or user switched to another app!
        if (isPlaying && currentTrack && !isPipActive) {
          requestPiP();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleVisibilityChange);
    };
  }, [isPlaying, currentTrack, isPipActive, requestPiP]);

  return (
    <>
      {/* Hidden offscreen canvas and video for OS-level Picture-in-Picture streaming */}
      <canvas 
        ref={canvasRef} 
        width={480} 
        height={200} 
        style={{ display: 'none' }} 
      />
      <video 
        ref={videoRef} 
        muted 
        playsInline 
        autoPictureInPicture="true"
        style={{ position: 'fixed', width: '1px', height: '1px', opacity: 0.01, pointerEvents: 'none', top: 0, left: 0 }} 
      />
    </>
  );
});

export default FloatingMiniViewer;
