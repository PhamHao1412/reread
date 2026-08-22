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
        setError(err.message || 'Unable to look up this word.');
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
        setExplainError(err.message || 'Unable to generate AI explanation.');
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
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
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
        className="relative w-full max-w-md bg-[var(--app-surface)] text-[var(--app-text)] rounded-t-[32px] border-t border-[var(--app-border)] p-6 pb-[max(env(safe-area-inset-bottom,0px),2rem)] z-10 max-h-[88vh] overflow-y-auto no-scrollbar shadow-2xl animate-slide-up select-none flex flex-col"
      >
        {/* Drag handle */}
        <div className="mx-auto w-12 h-1.5 bg-[var(--app-muted)]/30 rounded-full mb-4 shrink-0" />

        {/* Header Bar */}
        <div className="flex justify-between items-start mb-4 shrink-0">
          <div className="flex-1 pr-2">
            <div className="flex items-center space-x-2">
              <h3 className="text-[22px] sm:text-[24px] font-bold text-[var(--app-text)] tracking-tight leading-tight">
                {word}
              </h3>
              <button
                onClick={playAudio}
                title="Pronounce"
                className="p-1.5 rounded-full bg-[var(--app-accent)]/15 hover:bg-[var(--app-accent)]/30 text-[var(--app-accent)] transition-all active:scale-95"
              >
                <Volume2 className="h-4.5 w-4.5" />
              </button>
            </div>

            {data?.phonetic && (
              <span className="inline-block text-[13.5px] font-mono text-[var(--app-muted)] font-medium mt-1">
                {data.phonetic}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[var(--app-card)] text-[var(--app-muted)] hover:text-[var(--app-text)] transition-all shrink-0 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Segmented Tab Selector ── */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('translate')}
            className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
              activeTab === 'translate'
                ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-sm border border-[var(--app-border)]'
                : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Definition</span>
          </button>

          <button
            onClick={() => setActiveTab('explain')}
            className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
              activeTab === 'explain'
                ? 'bg-[var(--app-surface)] text-[var(--app-accent)] shadow-sm border border-[var(--app-border)]'
                : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Explain</span>
          </button>
        </div>

        {/* ── Tab 1: Translation & Dictionary ── */}
        {activeTab === 'translate' && (
          <div className="space-y-4 flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <Loader2 className="h-8 w-8 text-[var(--app-accent)] animate-spin" />
                <p className="text-sm text-[var(--app-muted)] font-semibold">Looking up word...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                <span className="font-medium">{error}</span>
              </div>
            ) : data ? (
              <div className="space-y-3.5">
                {/* Vietnamese Translation Card */}
                <div className="p-4 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-accent)]">
                    Translation
                  </span>
                  <p className="text-[18px] sm:text-[20px] font-bold text-[var(--app-text)] mt-1 leading-snug">
                    {data.translatedText}
                  </p>
                </div>

                {/* Dictionary Parts of Speech & Definitions */}
                {data.partsOfSpeech && data.partsOfSpeech.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold text-[var(--app-muted)] uppercase tracking-wider">
                      Dictionary Details
                    </span>
                    {data.partsOfSpeech.map((pos, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] space-y-2.5 shadow-xs"
                      >
                        <div className="inline-block px-2.5 py-0.5 rounded-md bg-[var(--app-accent)]/15 border border-[var(--app-accent)]/30 text-[var(--app-accent)] text-[11.5px] font-bold uppercase tracking-wide">
                          {pos.partOfSpeech}
                        </div>
                        <ul className="space-y-2 pl-1">
                          {pos.definitions.map((def, dIdx) => (
                            <li key={dIdx} className="text-[14.5px] sm:text-[15px] text-[var(--app-text-secondary)] leading-[1.6] list-disc list-inside">
                              <span className="text-[var(--app-text)] font-semibold">{def.definition}</span>
                              {def.example && (
                                <p className="text-[13.5px] text-[var(--app-muted)] italic pl-4 mt-0.5 leading-relaxed">
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
                    className={`w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl font-bold text-[15px] border transition-all active:scale-98 ${
                      saved
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'btn-accent shadow-md'
                    }`}
                  >
                    {saved ? (
                      <>
                        <Check className="h-5 w-5" />
                        <span>Saved to Notebook</span>
                      </>
                    ) : saving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-5 w-5" />
                        <span>Save to Notebook</span>
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
              <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
                <div className="relative">
                  <Sparkles className="h-11 w-11 text-[var(--app-accent)] animate-pulse" />
                  <div className="absolute inset-0 bg-[var(--app-accent)]/20 rounded-full blur-lg" />
                </div>
                <p className="text-base font-black text-[var(--app-text)]">AI is analyzing context...</p>
                <p className="text-[13.5px] text-[var(--app-muted)] max-w-[280px] leading-relaxed">
                  Analyzing word usage and meaning in this book sentence
                </p>
              </div>
            ) : explainState === 'error' ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                  <span className="font-medium">{explainError}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Context Sentence Preview if available */}
                {contextSentence && (
                  <div className="p-4 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)]">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--app-muted)]">
                      Sentence Context
                    </span>
                    <p className="text-[15px] sm:text-[15.5px] italic text-[var(--app-text)] mt-1.5 leading-relaxed">
                      "{contextSentence}"
                    </p>
                  </div>
                )}

                {/* AI Explanation Content Box */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-3 mb-2">
                    <div className="flex items-center space-x-2 text-[var(--app-accent)]">
                      <Sparkles className="h-5 w-5" />
                      <span className="text-[13px] font-black uppercase tracking-wider">
                        AI Contextual Analysis
                      </span>
                    </div>

                    {explainState === 'streaming' && (
                      <span className="flex items-center space-x-1.5 text-xs text-[var(--app-accent)] animate-pulse font-extrabold">
                        <span className="w-2 h-2 rounded-full bg-[var(--app-accent)]" />
                        <span>Writing...</span>
                      </span>
                    )}
                  </div>

                  <div className="text-[15.5px] sm:text-[16px] text-[var(--app-text)] leading-[1.7] space-y-3">
                    {renderMarkdown(explanation)}
                    <div ref={explainBottomRef} className="h-4" />
                  </div>
                </div>

                {/* Action Row - Full Width Copy Button */}
                {explanation && (
                  <div className="pt-2">
                    <button
                      onClick={handleCopyExplanation}
                      className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] text-[15px] font-bold text-[var(--app-text)] hover:bg-[var(--app-border)]/40 transition-all active:scale-98 shadow-sm"
                    >
                      {copied ? (
                        <>
                          <Check className="h-5 w-5 text-emerald-500" />
                          <span className="text-emerald-500 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-5 w-5 text-[var(--app-muted)]" />
                          <span>Copy</span>
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
    if (!trimmed) return <div key={i} className="h-2.5" />;

    if (trimmed.startsWith('### ')) {
      return (
        <h4 key={i} className="text-[16px] sm:text-[17px] font-black text-[var(--app-accent)] mt-3.5 mb-1.5">
          {parseInline(trimmed.slice(4))}
        </h4>
      );
    }
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      return (
        <h3 key={i} className="text-[17px] sm:text-[18px] font-black text-[var(--app-text)] mt-4 mb-2">
          {parseInline(trimmed.replace(/^#+\s*/, ''))}
        </h3>
      );
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={i} className="flex items-start space-x-2.5 my-1.5 pl-1">
          <span className="text-[var(--app-accent)] font-black text-base leading-6">•</span>
          <p className="text-[15.5px] sm:text-[16px] text-[var(--app-text)] leading-[1.7] flex-1">
            {parseInline(trimmed.slice(2))}
          </p>
        </div>
      );
    }
    if (trimmed.startsWith('> ')) {
      return (
        <blockquote key={i} className="pl-4 border-l-2 border-[var(--app-accent)] italic text-[14.5px] text-[var(--app-muted)] my-2.5 leading-relaxed">
          {parseInline(trimmed.slice(2))}
        </blockquote>
      );
    }

    return (
      <p key={i} className="text-[15.5px] sm:text-[16px] text-[var(--app-text)] leading-[1.7]">
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
        <strong key={idx} className="font-black text-[var(--app-accent)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="px-2 py-0.5 rounded-md bg-[var(--app-surface)] font-mono text-[13.5px] font-black text-[var(--app-accent)] border border-[var(--app-border)]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
