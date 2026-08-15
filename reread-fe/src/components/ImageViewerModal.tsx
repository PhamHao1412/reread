import React from 'react';
import { X } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  pageNumber: number;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  pageNumber,
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 backdrop-blur-xl animate-fade-in select-none">
      {/* Top Header with Safe Area Top */}
      <div className="w-full flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-4 z-10">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-extrabold text-white">
            Sơ đồ & Hình ảnh — Trang {pageNumber}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Zoomable Image Viewport */}
      <div className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-4 no-scrollbar">
        <img
          src={imageUrl}
          alt={`Sơ đồ trang ${pageNumber}`}
          className="max-w-full max-h-full rounded-2xl shadow-2xl bg-white object-contain border border-white/10"
        />
      </div>

      {/* Bottom info caption with Safe Area Bottom */}
      <div className="w-full pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] text-center text-xs text-white/60 z-10">
        <span>💡 Dùng 2 ngón tay để phóng to / thu nhỏ hình ảnh</span>
      </div>
    </div>
  );
};
