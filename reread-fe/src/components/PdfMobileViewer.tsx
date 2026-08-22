import React, { useEffect, useRef, useState } from 'react';
import { renderPageToDataUrl } from '../lib/pageRenderer';
import { Loader2 } from 'lucide-react';

interface PdfMobileViewerProps {
  pdfDoc: any;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number, totalPages: number) => void;
  onTap: () => void;
}

export const PdfMobileViewer: React.FC<PdfMobileViewerProps> = ({
  pdfDoc,
  currentPage,
  totalPages,
  onPageChange,
  onTap,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [rendering, setRendering] = useState<boolean>(true);

  // Touch gesture tracking
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);

  useEffect(() => {
    if (!pdfDoc) return;
    let isMounted = true;
    setRendering(true);

    const targetPage = Math.min(Math.max(currentPage, 1), totalPages);

    pdfDoc.getPage(targetPage).then(async (page: any) => {
      if (!isMounted) return;
      const dataUrl = await renderPageToDataUrl(page, 900);
      if (isMounted) {
        setImageUrl(dataUrl);
        setRendering(false);
      }
    }).catch(() => {
      if (isMounted) setRendering(false);
    });

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, currentPage, totalPages]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX.current;
    const diffY = touch.clientY - touchStartY.current;
    const duration = Date.now() - touchStartTime.current;

    // ── 1. Edge Tap Navigation ──
    const isStationaryTap = Math.abs(diffX) < 15 && Math.abs(diffY) < 15 && duration < 320;
    if (isStationaryTap) {
      const screenWidth = window.innerWidth || 360;
      const xRatio = touch.clientX / screenWidth;

      // Tap on Left Edge (< 22%) -> Prev Page
      if (xRatio < 0.22) {
        if (currentPage > 1) onPageChange(currentPage - 1, totalPages);
        return;
      }

      // Tap on Right Edge (> 78%) -> Next Page
      if (xRatio > 0.78) {
        if (currentPage < totalPages) onPageChange(currentPage + 1, totalPages);
        return;
      }

      // Center zone tap -> Toggle navigation controls
      onTap();
      return;
    }

    // ── 2. Horizontal Swipe Gesture ──
    if (Math.abs(diffX) > 45 && Math.abs(diffY) < 80) {
      if (diffX < 0 && currentPage < totalPages) {
        onPageChange(currentPage + 1, totalPages);
      } else if (diffX > 0 && currentPage > 1) {
        onPageChange(currentPage - 1, totalPages);
      }
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full overflow-y-auto no-scrollbar select-none px-3 py-4 flex flex-col items-center justify-start"
    >
      {rendering && !imageUrl ? (
        <div className="flex flex-col items-center justify-center my-auto py-16 space-y-3">
          <Loader2 className="h-9 w-9 text-[var(--app-accent)] animate-spin" />
          <p className="text-xs text-[var(--app-muted)] font-bold">Loading page...</p>
        </div>
      ) : (
        <div className="w-full max-w-full flex items-center justify-center">
          <img
            src={imageUrl}
            alt={`Page ${currentPage}`}
            className="w-full max-w-full rounded-2xl shadow-2xl bg-white border border-[var(--app-border)] object-contain transition-opacity duration-200"
          />
        </div>
      )}
    </div>
  );
};
