import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Book } from '../types';
import { useReader } from '../context/ReaderContext';
import { PdfMobileViewer } from './PdfMobileViewer';
import { ReadthroughViewer } from './ReadthroughViewer';
import { ReaderSettingsDrawer } from './ReaderSettingsDrawer';
import { TableOfContentsDrawer } from './TableOfContentsDrawer';
import { MobileTranslationSheet } from './MobileTranslationSheet';
import { MobileAICompanionSheet } from './MobileAICompanionSheet';
import { api } from '../lib/api';
import { hasCachedBlob, bookEtag } from '../lib/bookCache';
import { extractStructuredTextFromPageItems } from '../lib/pdfTextExtractor';

import { extractTableOfContents, TocItem } from '../lib/pdfToc';
import { extractPdfSectionText, extractPdfChapterOverviewText, findSectionPageRange, flattenOutline, isChapterOrMajorContainer } from '../lib/sectionExtractor';



import { renderPageToDataUrl } from '../lib/pageRenderer';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { 
  ArrowLeft, Sliders, Zap, BookOpen, Bookmark, 
  ChevronLeft, ChevronRight, AlertCircle, Loader2, List, Sparkles 
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface ReaderScreenProps {
  book: Book;
  onBack: () => void;
}

export const ReaderScreen: React.FC<ReaderScreenProps> = ({ book, onBack }) => {
  const { settings, setReadingMode } = useReader();
  const [currentPage, setCurrentPage] = useState<number>(book.current_page || 1);
  const [totalPages, setTotalPages] = useState<number>(book.total_pages || 1);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  // Start as non-loading if we know the blob is cached (will be confirmed async)
  const [loadingFile, setLoadingFile] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  const isCacheWarmRef = useRef<boolean>(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [pageImageUrl, setPageImageUrl] = useState<string>('');
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [showTocDrawer, setShowTocDrawer] = useState<boolean>(false);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [bookmarkedPages, setBookmarkedPages] = useState<Map<number, string>>(new Map());
  const [translatingTarget, setTranslatingTarget] = useState<{ word: string; contextSentence?: string } | null>(null);

  // AI Reading Companion states
  const [showAiSheet, setShowAiSheet] = useState<boolean>(false);
  const [companionSectionTitle, setCompanionSectionTitle] = useState<string>('');
  const [companionPageNumber, setCompanionPageNumber] = useState<number>(1);
  const [companionContent, setCompanionContent] = useState<string>('');
  const [companionIsChapter, setCompanionIsChapter] = useState<boolean>(false);
  const [isExtractingAi, setIsExtractingAi] = useState<boolean>(false);
  const extractionSeqRef = useRef<number>(0);

  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const progressTimerRef = useRef<any>(null);
  const loadingTaskRef = useRef<any>(null);

  // Fetch existing bookmarks for this book
  useEffect(() => {
    let isMounted = true;
    api.getBookmarks(book.id).then((raw) => {
      if (!isMounted) return;
      const bms = Array.isArray(raw) ? raw : (raw as any)?.data || [];
      if (!Array.isArray(bms)) return;
      const map = new Map<number, string>();
      bms.forEach((b: any) => {
        const p = Number(b.page_number ?? b.page ?? b.PageNumber ?? 0);
        if (p > 0) map.set(p, String(b.id || b.ID || ''));
      });
      setBookmarkedPages(map);
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [book.id]);

  const isBookmarked = bookmarkedPages.has(Number(currentPage));

  // 1. Fetch book content blob, load PDF document
  useEffect(() => {
    let active = true;
    let localUrl = '';

    const loadBookContent = async () => {
      setLoadError('');
      setDownloadProgress(0);

      // Check cache first — if hit, skip spinner entirely
      const etag = bookEtag(book);
      const cached = await hasCachedBlob(book.id, etag);
      if (active && cached) {
        isCacheWarmRef.current = true;
        setLoadingFile(false); // ← instant: hide spinner before fetch
      } else {
        setLoadingFile(true);
      }

      try {
        // Fast direct 1-stream download from Cloudflare R2 with progress tracking
        const blobUrl = await api.getBookFileBlobUrl(book, (pct) => {
          if (active) setDownloadProgress(pct);
        });
        if (!active) return;
        localUrl = blobUrl;

        const loadingTask = pdfjsLib.getDocument({
          url: blobUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });
        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;

        if (!active || !doc) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (err: any) {
        if (!active) return;
        setLoadError(err.message || 'Unable to load book content.');
      } finally {
        if (active) setLoadingFile(false);
      }
    };

    loadBookContent();

    return () => {
      active = false;
      if (loadingTaskRef.current) {
        try {
          loadingTaskRef.current.destroy();
        } catch {
          // ignore
        }
        loadingTaskRef.current = null;
      }
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [book.id]);

  // Populate Table of Contents immediately from backend book.toc (0ms instant!)
  // Fallback to client-side extraction only if legacy book has not backfilled yet.
  useEffect(() => {
    if (book.toc) {
      try {
        const parsed = typeof book.toc === 'string' ? JSON.parse(book.toc) : book.toc;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTocItems(parsed);
          return;
        }
      } catch {
        // ignore JSON parse error and fallback
      }
    }

    if (showTocDrawer && pdfDoc && tocItems.length === 0) {
      extractTableOfContents(pdfDoc).then((items) => {
        setTocItems(items);
      }).catch(() => {});
    }
  }, [book.toc, showTocDrawer, pdfDoc, tocItems.length]);

  // 2. Extract structured text and page image snapshot whenever page changes
  const extractPageData = useCallback(async (doc: any, pageNum: number) => {
    if (!doc) return;
    try {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const structured = extractStructuredTextFromPageItems(textContent.items);
      setExtractedText(structured);

      // Generate page image snapshot only when needed in readthrough mode
      if (settings.readingMode === 'readthrough') {
        const imgUrl = await renderPageToDataUrl(page, 900);
        setPageImageUrl(imgUrl);
      } else {
        setPageImageUrl('');
      }
    } catch {
      setExtractedText('');
      setPageImageUrl('');
    }
  }, [settings.readingMode]);

  useEffect(() => {
    if (pdfDoc) {
      extractPageData(pdfDoc, currentPage);
    }
  }, [pdfDoc, currentPage, extractPageData]);

  // 3. Sync reading progress with debounce
  const handlePageChange = (page: number, total: number) => {
    const validPage = Math.min(Math.max(page, 1), total || totalPages);
    setCurrentPage(validPage);
    if (total) setTotalPages(total);

    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
    }

    progressTimerRef.current = setTimeout(() => {
      api.updateProgress(book.id, validPage, total || totalPages).catch(() => {});
    }, 800);
  };

  const toggleControls = () => {
    setShowControls((prev) => !prev);
  };

  const toggleBookmark = async () => {
    const page = Number(currentPage);
    const existingId = bookmarkedPages.get(page);
    if (existingId) {
      // Remove bookmark optimistically
      setBookmarkedPages((prev) => {
        const next = new Map(prev);
        next.delete(page);
        return next;
      });
      await api.removeBookmark(book.id, existingId).catch(() => {});
    } else {
      // Add bookmark optimistically
      const tempId = `temp-${Date.now()}`;
      setBookmarkedPages((prev) => {
        const next = new Map(prev);
        next.set(page, tempId);
        return next;
      });
      try {
        const res = await api.addBookmark(book.id, page, `Page ${page} - ${book.title}`);
        const bm = (res as any)?.data || res;
        const realId = String(bm?.id || (bm as any)?.ID || '');
        if (realId) {
          setBookmarkedPages((prev) => {
            const next = new Map(prev);
            next.set(page, realId);
            return next;
          });
        }
      } catch {
        // keep temp or revert
      }
    }
  };

  const openAICompanionForSection = useCallback(async (item?: any) => {
    const seq = ++extractionSeqRef.current;

    let targetTitle = item?.title || '';
    let targetPage = typeof item?.pageNumber === 'number' 
      ? item.pageNumber 
      : typeof item?.target === 'number' 
      ? item.target 
      : currentPage;

    const isChapter = isChapterOrMajorContainer(item, tocItems);


    if (!targetTitle) {
      // Find matching TOC item for targetPage if available
      const flat = flattenOutline(tocItems);
      const matching = flat.filter(i => {
        const p = typeof i.pageNumber === 'number' ? i.pageNumber : typeof (i as any).target === 'number' ? (i as any).target : 0;
        return p > 0 && p <= targetPage;
      });
      if (matching.length > 0) {
        targetTitle = matching[matching.length - 1].title;
      } else {
        targetTitle = `Page ${targetPage}`;
      }
    }

    setCompanionSectionTitle(targetTitle);
    setCompanionPageNumber(targetPage);
    setCompanionIsChapter(isChapter);
    setCompanionContent('');
    setShowAiSheet(true);
    setIsExtractingAi(true);

    let text = '';
    if (pdfDoc) {
      if (isChapter) {
        text = await extractPdfChapterOverviewText(pdfDoc, item, tocItems, totalPages || pdfDoc.numPages);
      } else {
        const range = findSectionPageRange(targetPage, tocItems, totalPages || pdfDoc.numPages, targetTitle);
        text = await extractPdfSectionText(pdfDoc, range.startPage, range.endPage, targetTitle, range.nextSectionTitle);
      }
    }

    if (extractionSeqRef.current === seq) {
      setCompanionContent(text);
      setIsExtractingAi(false);
    }
  }, [pdfDoc, tocItems, currentPage, totalPages]);

  const openAICompanionForCurrentSection = useCallback(() => {
    const flat = flattenOutline(tocItems);
    const valid = flat
      .map(i => ({ item: i, page: typeof i.pageNumber === 'number' ? i.pageNumber : typeof (i as any).target === 'number' ? (i as any).target : 0 }))
      .filter(i => i.page > 0 && i.page <= currentPage)
      .sort((a, b) => a.page - b.page);

    const currentItem = valid.length > 0 ? valid[valid.length - 1].item : null;
    if (currentItem) {
      openAICompanionForSection(currentItem);
    } else {
      openAICompanionForSection({
        title: `Page ${currentPage}`,
        pageNumber: currentPage,
      });
    }
  }, [currentPage, tocItems, openAICompanionForSection]);

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)] select-none">
      {/* 1. Top Reader Navigation Bar (Floating/Collapsible with Safe Area Top) */}
      <div
        className={`absolute top-0 left-0 right-0 z-40 bg-[var(--app-surface)]/95 backdrop-blur-xl border-b border-[var(--app-border)] px-4 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] pb-2.5 flex items-center justify-between transition-transform duration-300 pointer-events-auto shadow-sm select-none ${
          showControls ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <button
            onClick={onBack}
            className="p-1.5 rounded-xl bg-[var(--app-card)] text-[var(--app-text)] hover:opacity-80 transition-all shrink-0 border border-[var(--app-border)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="overflow-hidden">
            <h2 className="text-sm font-extrabold text-[var(--app-text)] truncate">
              {book.title}
            </h2>
            <p className="text-[10px] text-[var(--app-muted)] font-bold">
              Page {currentPage} of {totalPages} ({Math.round((currentPage / Math.max(totalPages, 1)) * 100)}%)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {/* AI Reading Companion Trigger */}
          <button
            onClick={() => {
              setShowTocDrawer(false);
              openAICompanionForCurrentSection();
            }}
            title="AI Reading Companion (Summary, Explain, Quiz)"
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              showAiSheet
                ? 'bg-[var(--app-accent)] border-[var(--app-accent)] text-white shadow-md'
                : 'bg-[var(--app-card)] border-[var(--app-border)] text-[var(--app-accent)] hover:opacity-80'
            }`}
          >
            <Sparkles className="h-4 w-4" />
          </button>

          {/* Table of Contents Button */}
          <button
            onClick={() => {
              setShowAiSheet(false);
              setShowTocDrawer(!showTocDrawer);
            }}
            title="Table of Contents"
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              showTocDrawer
                ? 'bg-[var(--app-accent)] border-[var(--app-accent)] text-white shadow-md'
                : 'bg-[var(--app-card)] border-[var(--app-border)] text-[var(--app-text)] hover:opacity-80'
            }`}
          >
            <List className="h-4 w-4" />
          </button>


          {/* Quick Reading Mode Switch */}
          <button
            onClick={() =>
              setReadingMode(settings.readingMode === 'standard' ? 'readthrough' : 'standard')
            }
            title={settings.readingMode === 'standard' ? 'Switch to Readthrough mode' : 'View original PDF'}
            className={`p-2 rounded-xl border transition-all ${
              settings.readingMode === 'readthrough'
                ? 'btn-accent shadow-lg'
                : 'bg-[var(--app-card)] border-[var(--app-border)] text-[var(--app-text)]'
            }`}
          >
            {settings.readingMode === 'readthrough' ? (
              <Zap className="h-4 w-4 fill-white" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
          </button>

          {/* Bookmark Button */}
          <button
            onClick={toggleBookmark}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              isBookmarked
                ? 'bg-[var(--app-accent)] border-[var(--app-accent)] text-white shadow-md'
                : 'bg-[var(--app-card)] border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>

          {/* Settings Drawer Button */}
          <button
            onClick={() => setShowSettingsDrawer(true)}
            className="p-2 rounded-xl bg-[var(--app-card)] border border-[var(--app-border)] text-[var(--app-text)] hover:opacity-80 transition-all"
          >
            <Sliders className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Reader Viewport with Safe Area Spacing */}
      <div className="flex-1 w-full h-full relative overflow-hidden pt-[calc(env(safe-area-inset-top,0px)+3.75rem)] pb-[calc(env(safe-area-inset-bottom,0px)+4rem)]">
        {loadingFile ? (
          <div className="h-full w-full flex flex-col items-center justify-center space-y-3 p-6 text-center">
            <Loader2 className="h-9 w-9 animate-spin" style={{ color: 'var(--app-accent)' }} />
            <p className="text-sm font-bold text-[var(--app-text)]">Loading book into mobile memory...</p>
            {downloadProgress > 0 && (
              <div className="w-48 bg-[var(--app-border)] rounded-full h-1.5 overflow-hidden my-1">
                <div
                  className="h-full bg-[var(--app-accent)] transition-all duration-150 rounded-full"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            )}
            <p className="text-xs text-[var(--app-muted)] max-w-[240px]">
              {downloadProgress > 0 ? `Loaded ${downloadProgress}% of book data` : 'Connecting to load book data...'}
            </p>
          </div>
        ) : loadError ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-xs font-bold">{loadError}</p>
            </div>
            <button
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl bg-[var(--app-card)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-bold"
            >
              Back to library
            </button>
          </div>
        ) : pdfDoc ? (
          settings.readingMode === 'standard' ? (
            <PdfMobileViewer
              pdfDoc={pdfDoc}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onTap={toggleControls}
            />
          ) : (
            <ReadthroughViewer
              text={extractedText}
              pageImageUrl={pageImageUrl}
              settings={settings}
              currentPage={currentPage}
              totalPages={totalPages}
              activeWord={translatingTarget?.word}
              onPageChange={handlePageChange}
              onTranslateWord={(word, contextSentence) => setTranslatingTarget({ word, contextSentence })}
              onTap={toggleControls}
            />
          )
        ) : null}
      </div>

      {/* 3. Bottom Quick Navigation Bar flush with safe-area */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-40 bg-[var(--app-surface)]/95 backdrop-blur-xl border-t border-[var(--app-border)] px-4 pt-2 pb-[max(env(safe-area-inset-bottom,0px),0.625rem)] flex items-center justify-between transition-transform duration-300 pointer-events-auto shadow-sm select-none ${
          showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (currentPage > 1) handlePageChange(currentPage - 1, totalPages);
          }}
          disabled={currentPage <= 1}
          className="p-2 rounded-xl bg-[var(--app-card)] border border-[var(--app-border)] text-[var(--app-text)] disabled:opacity-30 active:scale-95 transition-all shadow-xs"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Mini progress bar & scrubber pill */}
        <div 
          onClick={() => setShowSettingsDrawer(true)}
          className="flex-1 mx-3 px-3 py-1.5 rounded-xl bg-[var(--app-card)] border border-[var(--app-border)] flex flex-col items-center justify-center cursor-pointer active:scale-98 shadow-xs"
        >
          <div className="flex justify-between w-full text-[10px] font-bold text-[var(--app-text)] mb-1">
            <span>Page {currentPage}</span>
            <span className="text-[var(--app-accent)] font-extrabold">{Math.round((currentPage / Math.max(totalPages, 1)) * 100)}%</span>
            <span className="text-[var(--app-muted)]">{totalPages} pages</span>
          </div>
          <div className="w-full h-1 bg-[var(--app-surface)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, var(--app-accent), color-mix(in srgb, var(--app-accent) 70%, #D4A017))',
                width: `${Math.min(Math.round((currentPage / Math.max(totalPages, 1)) * 100), 100)}%`,
              }}
            />
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (currentPage < totalPages) handlePageChange(currentPage + 1, totalPages);
          }}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-xl bg-[var(--app-card)] border border-[var(--app-border)] text-[var(--app-text)] disabled:opacity-30 active:scale-95 transition-all shadow-xs"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* 4. Table of Contents Drawer Modal */}
      <TableOfContentsDrawer
        isOpen={showTocDrawer}
        onClose={() => setShowTocDrawer(false)}
        items={tocItems}
        currentPage={currentPage}
        totalPages={totalPages}
        onSelectPage={(page) => handlePageChange(page, totalPages)}
        onSummarizeItem={(item) => openAICompanionForSection(item)}
      />

      {/* 5. Settings Drawer Modal */}
      <ReaderSettingsDrawer
        isOpen={showSettingsDrawer}
        onClose={() => setShowSettingsDrawer(false)}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageScrub={(page) => handlePageChange(page, totalPages)}
      />

      {/* 6. Mobile Instant Translation Bottom Sheet with AI Explain */}
      {translatingTarget && (
        <MobileTranslationSheet
          word={translatingTarget.word}
          bookId={book.id}
          bookTitle={book.title}
          bookAuthor={book.author}
          pageNumber={currentPage}
          contextSentence={translatingTarget.contextSentence}
          onClose={() => setTranslatingTarget(null)}
        />
      )}

      {/* 7. Mobile AI Reading Companion Bottom Sheet */}
      <MobileAICompanionSheet
        isOpen={showAiSheet}
        onClose={() => setShowAiSheet(false)}
        bookId={book.id}
        bookTitle={book.title}
        bookAuthor={book.author}
        sectionTitle={companionSectionTitle}
        pageNumber={companionPageNumber}
        sectionContent={companionContent}
        isExtracting={isExtractingAi}
        isChapter={companionIsChapter}
        onOpenToc={() => setShowTocDrawer(true)}
      />
    </div>
  );
};
