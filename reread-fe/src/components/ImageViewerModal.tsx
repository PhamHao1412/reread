import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  pageNumber: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  pageNumber,
}) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Refs for pinch gesture tracking
  const lastDistRef = useRef<number | null>(null);
  const lastScaleRef = useRef(1);
  const lastOffsetRef = useRef({ x: 0, y: 0 });
  const isPinchingRef = useRef(false);

  // Refs for pan gesture tracking
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panOffsetStartRef = useRef({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      lastScaleRef.current = 1;
      lastOffsetRef.current = { x: 0, y: 0 };
    }
  }, [isOpen]);

  const resetZoom = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    lastScaleRef.current = 1;
    lastOffsetRef.current = { x: 0, y: 0 };
  };

  const zoomIn = () => {
    const next = clamp(lastScaleRef.current * 1.5, MIN_SCALE, MAX_SCALE);
    setScale(next);
    lastScaleRef.current = next;
  };

  const zoomOut = () => {
    const next = clamp(lastScaleRef.current / 1.5, MIN_SCALE, MAX_SCALE);
    if (next <= MIN_SCALE) {
      resetZoom();
    } else {
      setScale(next);
      lastScaleRef.current = next;
    }
  };

  // ── Touch Handlers ────────────────────────────────────────────────────────

  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getMidpoint = (t1: React.Touch, t2: React.Touch) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Start pinch
      e.preventDefault();
      isPinchingRef.current = true;
      panStartRef.current = null;
      lastDistRef.current = getDistance(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1 && lastScaleRef.current > 1) {
      // Start pan (only when zoomed in)
      e.preventDefault();
      isPinchingRef.current = false;
      panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panOffsetStartRef.current = { ...lastOffsetRef.current };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      isPinchingRef.current = true;

      const newDist = getDistance(e.touches[0], e.touches[1]);
      if (lastDistRef.current === null) {
        lastDistRef.current = newDist;
        return;
      }

      const ratio = newDist / lastDistRef.current;
      const newScale = clamp(lastScaleRef.current * ratio, MIN_SCALE, MAX_SCALE);

      // Zoom towards pinch midpoint
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mid = getMidpoint(e.touches[0], e.touches[1]);
        const originX = mid.x - rect.left - rect.width / 2;
        const originY = mid.y - rect.top - rect.height / 2;

        // Adjust offset so zoom feels anchored at pinch center
        const scaleDelta = newScale / lastScaleRef.current;
        const newOffsetX = lastOffsetRef.current.x - originX * (scaleDelta - 1);
        const newOffsetY = lastOffsetRef.current.y - originY * (scaleDelta - 1);

        setScale(newScale);
        setOffset({ x: newOffsetX, y: newOffsetY });
        lastScaleRef.current = newScale;
        lastOffsetRef.current = { x: newOffsetX, y: newOffsetY };
      }

      lastDistRef.current = newDist;
    } else if (e.touches.length === 1 && panStartRef.current && lastScaleRef.current > 1) {
      // Pan while zoomed
      e.preventDefault();
      const dx = e.touches[0].clientX - panStartRef.current.x;
      const dy = e.touches[0].clientY - panStartRef.current.y;
      const newOffset = {
        x: panOffsetStartRef.current.x + dx,
        y: panOffsetStartRef.current.y + dy,
      };
      setOffset(newOffset);
      lastOffsetRef.current = newOffset;
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      lastDistRef.current = null;
    }
    if (e.touches.length === 0) {
      isPinchingRef.current = false;
      panStartRef.current = null;

      // Snap back to MIN_SCALE if pinched below it
      if (lastScaleRef.current < MIN_SCALE + 0.05) {
        resetZoom();
      }
    }
  }, []);

  // Double-tap to zoom in/out
  const lastTapRef = useRef(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (lastScaleRef.current > 1) {
        resetZoom();
      } else {
        const next = 2.5;
        setScale(next);
        lastScaleRef.current = next;
      }
    }
    lastTapRef.current = now;
  }, []);

  if (!isOpen || !imageUrl) return null;

  const isZoomed = scale > 1.05;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/97 backdrop-blur-xl select-none"
      style={{ touchAction: 'none' }}
    >
      {/* ── Header ── */}
      <div className="w-full flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-4 z-10 shrink-0">
        <span className="text-sm font-extrabold text-white">
          Figure &amp; Illustration — Page {pageNumber}
        </span>
        <div className="flex items-center space-x-2">
          {isZoomed && (
            <button
              onClick={resetZoom}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── Pinch-Zoom Viewport ── */}
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-hidden flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleDoubleTap}
        style={{ touchAction: 'none', cursor: isZoomed ? 'grab' : 'default' }}
      >
        <img
          src={imageUrl}
          alt={`Figure on page ${pageNumber}`}
          draggable={false}
          className="rounded-2xl shadow-2xl bg-white object-contain border border-white/10"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isPinchingRef.current ? 'none' : 'transform 0.15s ease-out',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'none', // let the container handle all touch events
          }}
        />
      </div>

      {/* ── Bottom Controls ── */}
      <div
        className="w-full shrink-0 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3 flex flex-col items-center space-y-3 z-10"
      >
        {/* Zoom Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={zoomOut}
            disabled={!isZoomed}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 disabled:opacity-30 transition-all active:scale-95"
          >
            <ZoomOut className="h-3.5 w-3.5" />
            <span>Zoom out</span>
          </button>
          <span className="text-white/50 text-xs font-bold tabular-nums min-w-[44px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 disabled:opacity-30 transition-all active:scale-95"
          >
            <ZoomIn className="h-3.5 w-3.5" />
            <span>Zoom in</span>
          </button>
        </div>
        <p className="text-white/40 text-[11px]">
          {isZoomed ? 'Double tap or click button to reset' : 'Pinch or click button to zoom'}
        </p>
      </div>
    </div>
  );
};
