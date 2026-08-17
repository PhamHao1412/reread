import React, { useState, useEffect, useRef } from 'react';
import { TranslationData } from '../types';
import { api } from '../lib/api';
import {
  X,
  Volume2,
  Bookmark,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Copy,
} from 'lucide-react';

interface MobileTranslationSheetProps {
  word: string;
  bookId: string;
  bookTitle?: string;
  bookAuthor?: string;
  contextSentence?: string;
  pageNumber?: number;
  onClose: () => void;
}

export const MobileTranslationSheet: React.FC<MobileTranslationSheetProps> = ({
  word,
  bookId,
  bookTitle,
  bookAuthor,
  contextSentence,
  pageNumber,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'translate' | 'explain'>('translate');

  // Translation state
  const [data, setData] = useState<TranslationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [saved, setSaved] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // AI Explain state (calls at most once per word session to prevent token waste)
  const [explanation, setExplanation] = useState<string>('');
  const [explainState, setExplainState] = useState<'idle' | 'loading' | 'streaming' | 'done' | 'error'>('idle');
  const [explainError, setExplainError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const hasExplainedRef = useRef<boolean>(false);
  const abortExplainRef = useRef<(() => void) | null>(null);

  // Auto-scroll tracking for AI Explain stream
  const sheetContainerRef = useRef<HTMLDivElement | null>(null);
  const explainBottomRef = useRef<HTMLDivElement | null>(null);

  // Protection against synthetic click events from long-press/touch release
  const mountTimeRef = useRef<number>(Date.now());
  const backdropPointerDownRef = useRef<boolean>(false);

  useEffect(() => {
    mountTimeRef.current = Date.now();
    backdropPointerDownRef.current = false;
    hasExplainedRef.current = false;
    setExplanation('');
    setExplainState('idle');
    setExplainError('');
  }, [word]);

  // Continuously follow the stream to the newest generated text (iOS WebKit & PWA compatible)
  useEffect(() => {
    if (activeTab === 'explain' && explainState === 'streaming') {
      const container = sheetContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        });
      }
    }
  }, [explanation, activeTab, explainState]);

  const handleBackdropPointerDown = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      backdropPointerDownRef.current = true;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (Date.now() - mountTimeRef.current < 400) {
      return;
    }
    if (!backdropPointerDownRef.current) {
      return;
    }
    onClose();
  };

  // 1. Fetch word translation (Tab 1)
  useEffect(() => {
    let isMounted = true;
    const fetchTranslation = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await api.translate(word);
        if (!isMounted) return;
        setData(result);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Không thể tra cứu từ này.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (word && word.trim()) {
      fetchTranslation();
    }

    return () => {
      isMounted = false;
    };
  }, [word]);

  // 2. Fetch AI Contextual Explanation (Tab 2 - only calls once per word)
  const startAIExplain = async () => {
    if (hasExplainedRef.current) return;
    hasExplainedRef.current = true;

    setExplainState('loading');
    setExplainError('');
    setExplanation('');

    let accumulated = '';

    const cancel = await api.explainStream(
      {
        text: word,
        context_sentence: contextSentence || '',
        book_title: bookTitle || '',
        book_author: bookAuthor || '',
        page_number: pageNumber || 1,
      },
      (chunk) => {
        accumulated += chunk;
        setExplainState('streaming');
        setExplanation(accumulated.startsWith('[CACHED]') ? accumulated.slice(8) : accumulated);
      },
      () => {
        setExplainState('done');
      },
      (err) => {
        setExplainError(err.message || 'Không thể thực hiện giải thích từ AI.');
        setExplainState('error');
      },
    );

    abortExplainRef.current = cancel;
  };

  // Trigger AI explain when user switches to 'explain' tab for the first time
  useEffect(() => {
    if (activeTab === 'explain' && explainState === 'idle' && !hasExplainedRef.current) {
      startAIExplain();
    }
  }, [activeTab, explainState]);

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      if (abortExplainRef.current) {
        abortExplainRef.current();
        abortExplainRef.current = null;
      }
    };
  }, []);

  const playAudio = () => {
    if (data?.audioUrl) {
      const audio = new Audio(data.audioUrl);
      audio.play().catch(() => playNativeSpeech());
    } else {
      playNativeSpeech();
    }
  };

  const playNativeSpeech = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSaveVocab = async () => {
    if (!data || saved || saving) return;
    setSaving(true);
    try {
      await api.saveVocabulary({
        book_id: bookId,
        original_text: word,
        translated_text: data.translatedText,
        ipa: data.phonetic || '',
        part_of_speech: data.partsOfSpeech?.[0]?.partOfSpeech || '',
        context_sentence: contextSentence || '',
        audio_url: data.audioUrl || '',
      });
      setSaved(true);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleCopyExplanation = () => {
    if (!explanation) return;
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* Backdrop with synthetic touch release protection */}
      <div
        className="absolute inset-0"
        onPointerDown={handleBackdropPointerDown}
        onMouseDown={handleBackdropPointerDown}
        onTouchStart={handleBackdropPointerDown}
        onClick={handleBackdropClick}
      />

      <div
        ref={sheetContainerRef}
        onClick={(e) => e.stopPropagation()}
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        className="relative w-full max-w-md bg-[var(--app-surface)] text-[var(--app-text)] rounded-t-[28px] border-t border-[var(--app-border)] p-6 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] z-10 max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl animate-slide-up select-none flex flex-col"
      >
        {/* Drag handle */}
        <div className="mx-auto w-12 h-1 bg-[var(--app-muted)]/30 rounded-full mb-4 shrink-0" />

        {/* Header Bar */}
        <div className="flex justify-between items-start mb-3 shrink-0">
          <div className="flex-1 pr-2">
            <div className="flex items-center space-x-2">
              <h3 className="text-2xl font-black text-[var(--app-text)] tracking-tight">
                {word}
              </h3>
              <button
                onClick={playAudio}
                title="Phát âm"
                className="p-1.5 rounded-full bg-[var(--app-accent)]/15 hover:bg-[var(--app-accent)]/30 text-[var(--app-accent)] transition-all active:scale-95"
              >
                <Volume2 className="h-4.5 w-4.5" />
              </button>
            </div>

            {data?.phonetic && (
              <span className="inline-block text-xs font-mono text-[var(--app-muted)] font-bold mt-0.5">
                {data.phonetic}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[var(--app-card)] text-[var(--app-muted)] hover:text-[var(--app-text)] transition-all shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Segmented Tab Selector ── */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('translate')}
            className={`flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'translate'
                ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-sm border border-[var(--app-border)]'
                : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Dịch nghĩa</span>
          </button>

          <button
            onClick={() => setActiveTab('explain')}
            className={`flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'explain'
                ? 'bg-[var(--app-surface)] text-[var(--app-accent)] shadow-sm border border-[var(--app-border)]'
                : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Explain</span>
          </button>
        </div>

        {/* ── Tab 1: Translation & Dictionary ── */}
        {activeTab === 'translate' && (
          <div className="space-y-4 flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <Loader2 className="h-8 w-8 text-[var(--app-accent)] animate-spin" />
                <p className="text-xs text-[var(--app-muted)] font-bold">Đang tra từ...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span className="font-medium">{error}</span>
              </div>
            ) : data ? (
              <div className="space-y-4">
                {/* Vietnamese Translation Card */}
                <div className="p-4 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] shadow-sm">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--app-accent)]">
                    Nghĩa tiếng Việt
                  </span>
                  <p className="text-xl font-black text-[var(--app-text)] mt-1 leading-snug">
                    {data.translatedText}
                  </p>
                </div>

                {/* Dictionary Parts of Speech & Definitions */}
                {data.partsOfSpeech && data.partsOfSpeech.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-[var(--app-muted)] uppercase tracking-wider">
                      Từ điển chi tiết
                    </span>
                    {data.partsOfSpeech.map((pos, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] space-y-2 shadow-xs"
                      >
                        <div className="inline-block px-2 py-0.5 rounded-md bg-[var(--app-accent)]/15 border border-[var(--app-accent)]/30 text-[var(--app-accent)] text-[10px] font-extrabold uppercase">
                          {pos.partOfSpeech}
                        </div>
                        <ul className="space-y-1.5 pl-1">
                          {pos.definitions.map((def, dIdx) => (
                            <li key={dIdx} className="text-xs text-[var(--app-text-secondary)] leading-relaxed list-disc list-inside">
                              <span className="text-[var(--app-text)] font-semibold">{def.definition}</span>
                              {def.example && (
                                <p className="text-[11px] text-[var(--app-muted)] italic pl-4 mt-0.5">
                                  "{def.example}"
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save Vocabulary Action Button */}
                <div className="pt-2">
                  <button
                    onClick={handleSaveVocab}
                    disabled={saved || saving}
                    className={`w-full flex items-center justify-center space-x-2 py-3 rounded-2xl font-bold text-xs border transition-all active:scale-98 ${
                      saved
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'btn-accent shadow-lg'
                    }`}
                  >
                    {saved ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Đã lưu vào sổ từ vựng</span>
                      </>
                    ) : saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-4 w-4" />
                        <span>Lưu vào sổ từ vựng</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Tab 2: AI Contextual Explanation ── */}
        {activeTab === 'explain' && (
          <div className="space-y-4 flex-1">
            {explainState === 'loading' ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3 text-center">
                <div className="relative">
                  <Sparkles className="h-9 w-9 text-[var(--app-accent)] animate-pulse" />
                  <div className="absolute inset-0 bg-[var(--app-accent)]/20 rounded-full blur-lg" />
                </div>
                <p className="text-xs font-bold text-[var(--app-text)]">AI đang phân tích ngữ cảnh...</p>
                <p className="text-[11px] text-[var(--app-muted)] max-w-[240px]">
                  Đang phân tích nghĩa của từ trong câu và cuốn sách này
                </p>
              </div>
            ) : explainState === 'error' ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span className="font-medium">{explainError}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Context Sentence Preview if available */}
                {contextSentence && (
                  <div className="p-3 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)]">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--app-muted)]">
                      Ngữ cảnh trong câu
                    </span>
                    <p className="text-xs italic text-[var(--app-text)] mt-1 leading-relaxed">
                      "{contextSentence}"
                    </p>
                  </div>
                )}

                {/* AI Explanation Content Box */}
                <div className="p-4 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] space-y-2 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2 mb-2">
                    <div className="flex items-center space-x-1.5 text-[var(--app-accent)]">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">
                        Phân tích chuyên sâu từ AI
                      </span>
                    </div>

                    {explainState === 'streaming' && (
                      <span className="flex items-center space-x-1 text-[10px] text-[var(--app-accent)] animate-pulse font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)]" />
                        <span>Đang viết...</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[var(--app-text)] leading-relaxed space-y-2">
                    {renderMarkdown(explanation)}
                    <div ref={explainBottomRef} className="h-4" />
                  </div>
                </div>

                {/* Action Row - Full Width Copy Button */}
                {explanation && (
                  <div className="pt-2">
                    <button
                      onClick={handleCopyExplanation}
                      className="w-full flex items-center justify-center space-x-2 py-3 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] text-xs font-bold text-[var(--app-text)] hover:bg-[var(--app-border)]/40 transition-all active:scale-98 shadow-sm"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-500" />
                          <span className="text-emerald-500 font-bold">Đã sao chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 text-[var(--app-muted)]" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Lightweight Markdown Formatter for AI Output ──
function renderMarkdown(md: string) {
  if (!md) return null;
  const lines = md.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-1.5" />;

    if (trimmed.startsWith('### ')) {
      return (
        <h4 key={i} className="text-xs font-black text-[var(--app-text)] mt-2.5 mb-1 text-[var(--app-accent)]">
          {parseInline(trimmed.slice(4))}
        </h4>
      );
    }
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      return (
        <h3 key={i} className="text-sm font-black text-[var(--app-text)] mt-3 mb-1">
          {parseInline(trimmed.replace(/^#+\s*/, ''))}
        </h3>
      );
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={i} className="flex items-start space-x-1.5 my-1 pl-1">
          <span className="text-[var(--app-accent)] font-black text-xs leading-4">•</span>
          <p className="text-xs text-[var(--app-text)] leading-relaxed flex-1">
            {parseInline(trimmed.slice(2))}
          </p>
        </div>
      );
    }
    if (trimmed.startsWith('> ')) {
      return (
        <blockquote key={i} className="pl-3 border-l-2 border-[var(--app-accent)] italic text-[11px] text-[var(--app-muted)] my-1.5">
          {parseInline(trimmed.slice(2))}
        </blockquote>
      );
    }

    return (
      <p key={i} className="text-xs text-[var(--app-text)] leading-relaxed">
        {parseInline(trimmed)}
      </p>
    );
  });
}

function parseInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-extrabold text-[var(--app-accent)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-[var(--app-surface)] font-mono text-[10px] font-bold text-[var(--app-accent)] border border-[var(--app-border)]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
