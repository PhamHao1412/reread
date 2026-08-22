import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sparkles,
  FileText,
  Lightbulb,
  HelpCircle,
  Bookmark,
  RotateCcw,
  AlertCircle,
  Copy,
  Check,
  X,
  Trash2,
  List,
  Compass,
  Quote,
  CheckCircle2,
  XCircle,
  Brain,
  Square,
  Volume2,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../lib/api';

export interface MobileAICompanionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  bookTitle: string;
  bookAuthor?: string;
  sectionTitle: string;
  pageNumber?: number;
  sectionContent: string;
  isExtracting?: boolean;
  isChapter?: boolean;
  onOpenToc?: () => void;
}

export interface ParsedQuizQuestion {
  id: string;
  number: number;
  title: string;
  question: string;
  options: Array<{
    letter: string;
    text: string;
  }>;
  correctAnswerLetter: string;
  correctAnswerText: string;
  explanation: string;
}

export const parseQuizMarkdown = (rawMd: string): ParsedQuizQuestion[] => {
  if (!rawMd) return [];
  const text = rawMd.replace(/\r\n/g, '\n');

  const questionBlocks = text.split(/(?=^#{1,4}\s*Question\s+\d+)/gmi);
  const parsedQuestions: ParsedQuizQuestion[] = [];

  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i].trim();
    if (!/^#{1,4}\s*Question\s+\d+/i.test(block)) continue;

    // 1. Extract Question Header and Title
    const headerMatch = block.match(/^#{1,4}\s*Question\s+(\d+)[:\s-]*(.*?)(?:\n|$)/i);
    const qNum = headerMatch ? parseInt(headerMatch[1], 10) : i + 1;
    const qTitle = headerMatch && headerMatch[2] ? headerMatch[2].trim() : `Question ${qNum}`;

    // 2. Extract Correct Answer & Explanation
    let correctAnswerLetter = '';
    let correctAnswerText = '';
    let explanation = '';

    const correctMatch = block.match(/(?:\*\*|\b)Correct Answer:?(?:\*\*|\b)[:\s]*\(?([A-Da-d])\)?[:\s-]*(.*?)(?:\n\n|\n\*\*Explanation|\nExplanation|<\/details>|$)/si);
    if (correctMatch) {
      correctAnswerLetter = correctMatch[1].toUpperCase();
      correctAnswerText = correctMatch[2].trim().replace(/^\*\*/, '').replace(/\*\*$/, '');
    }

    const explMatch = block.match(/(?:^|\n)\s*(?:\*\*)?Explanation:?(?:\*\*)?[:\s]*([\s\S]*?)(?:<\/details>|\n---|$)/i);
    if (explMatch) {
      explanation = explMatch[1]
        .replace(/<\/?[a-z][^>]*>/gi, '')
        .trim();
    }

    // 3. Extract Options (A, B, C, D)
    const options: Array<{ letter: string; text: string }> = [];
    const optionRegex = /(?:^|\n)\s*[-*]?\s*(?:\*\*)?\(?([A-Da-d])\)?(?:\*\*)?[:\.\s-]+([^\n]+)/g;
    let optMatch;

    const preDetailsContent = block.split(/<details|\*\*Correct Answer|Correct Answer:/i)[0];

    while ((optMatch = optionRegex.exec(preDetailsContent)) !== null) {
      const letter = optMatch[1].toUpperCase();
      const optText = optMatch[2].trim().replace(/^\*\*/, '').replace(/\*\*$/, '');
      if (['A', 'B', 'C', 'D'].includes(letter)) {
        if (!options.some(o => o.letter === letter)) {
          options.push({ letter, text: optText });
        }
      }
    }

    // 4. Extract Question Body
    const afterHeader = block.replace(/^#{1,4}\s*Question\s+\d+[:\s-]*.*?\n+/i, '');
    const questionBodyLines: string[] = [];
    for (const line of afterHeader.split('\n')) {
      if (/^\s*[-*]?\s*(?:\*\*)?\(?[A-Da-d]\)?(?:\*\*)?[:\.\s-]/.test(line)) {
        break;
      }
      if (line.includes('<details') || line.includes('Correct Answer:')) break;
      questionBodyLines.push(line);
    }
    const questionText = questionBodyLines.join('\n').trim();

    if (options.length >= 2) {
      parsedQuestions.push({
        id: `q-${qNum}-${i}`,
        number: qNum,
        title: qTitle,
        question: questionText || qTitle,
        options,
        correctAnswerLetter,
        correctAnswerText,
        explanation,
      });
    }
  }

  return parsedQuestions;
};

export const MobileAICompanionSheet: React.FC<MobileAICompanionSheetProps> = ({
  isOpen,
  onClose,
  bookId,
  bookTitle,
  bookAuthor,
  sectionTitle,
  pageNumber = 1,
  sectionContent,
  isExtracting = false,
  isChapter = false,
  onOpenToc,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'explain' | 'quiz' | 'vocab'>('summary');
  const [contentMap, setContentMap] = useState<Record<string, string>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<boolean>(false);

  // Vocabulary
  const [bookVocab, setBookVocab] = useState<any[]>([]);
  const [loadingVocab, setLoadingVocab] = useState<boolean>(false);

  // Real-time Thinking HUD states
  const [thinkingElapsed, setThinkingElapsed] = useState<number>(0);
  const [thoughtDurationMap, setThoughtDurationMap] = useState<Record<string, number>>({});

  // Interactive Quiz state
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({});

  // Auto-scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef<boolean>(false);

  // Streaming AbortController
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAttemptedRef = useRef<Record<string, boolean>>({});
  const prevSectionKeyRef = useRef<string>('');
  const currentSectionKey = `${bookId}:${sectionTitle}:${pageNumber}`;

  // Fetch Vocabularies for this book
  const fetchBookVocab = useCallback(async () => {
    if (!bookId) return;
    setLoadingVocab(true);
    try {
      const vocabList = await api.getVocabularies(bookId);
      setBookVocab(Array.isArray(vocabList) ? vocabList : []);
    } catch {
      // ignore
    } finally {
      setLoadingVocab(false);
    }
  }, [bookId]);

  useEffect(() => {
    if (isOpen) {
      fetchBookVocab();
    }
  }, [isOpen, fetchBookVocab]);

  // Reset states when switching sections
  useEffect(() => {
    if (prevSectionKeyRef.current !== currentSectionKey) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      prevSectionKeyRef.current = currentSectionKey;
      setContentMap({});
      setLoadingMap({});
      setErrorMap({});
      setUserAnswers({});
      setRevealedExplanations({});
      setThoughtDurationMap({});
      setThinkingElapsed(0);
      hasAttemptedRef.current = {};
      userScrolledUpRef.current = false;
    }
  }, [currentSectionKey]);

  const handleCancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoadingMap(prev => ({ ...prev, [activeTab]: false }));
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    if (userScrolledUpRef.current || !scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    el.scrollTop = el.scrollHeight;
  }, []);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    const threshold = 45;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    userScrolledUpRef.current = !isNearBottom;
  };

  // Streaming action fetcher
  const streamAction = useCallback(async (action: 'summary' | 'explain' | 'quiz') => {
    if (!sectionContent || !sectionContent.trim()) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoadingMap(prev => ({ ...prev, [action]: true }));
    setErrorMap(prev => ({ ...prev, [action]: '' }));
    setContentMap(prev => ({ ...prev, [action]: '' }));
    setThinkingElapsed(0);
    userScrolledUpRef.current = false;
    hasAttemptedRef.current[action] = true;

    const streamStartTime = Date.now();
    let firstTokenReceived = false;
    const thinkingTimer = setInterval(() => {
      if (!firstTokenReceived) {
        setThinkingElapsed(parseFloat(((Date.now() - streamStartTime) / 1000).toFixed(1)));
      }
    }, 100);

    let accumulatedText = '';

    try {
      const res = await api.fetchWithAuth('/api/v1/ai/companion/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          book_id: bookId,
          section_title: sectionTitle || `Page ${pageNumber}`,
          content: sectionContent,
          action,
          book_title: bookTitle,
          book_author: bookAuthor || 'Author',
          page_number: pageNumber,
          is_chapter: isChapter || false,
        }),
      });

      if (!res.ok) {
        let errMsg = 'AI Companion service is temporarily unavailable.';
        if (res.status === 402) {
          errMsg = 'You have reached your AI credit limit. Please contact your administrator or upgrade your plan.';
        } else if (res.status === 429) {
          errMsg = 'Too many requests. Please wait a moment and try again.';
        } else {
          try {
            const errJson = await res.json();
            if (errJson.message) errMsg = errJson.message;
          } catch {}
        }
        throw new Error(errMsg);
      }

      if (!res.body) throw new Error('Browser does not support data streaming.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let lastRenderTime = 0;
      const THROTTLE_MS = 35;

      while (true) {
        if (abortController.signal.aborted) {
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              if (!firstTokenReceived) {
                firstTokenReceived = true;
                clearInterval(thinkingTimer);
                const duration = parseFloat(((Date.now() - streamStartTime) / 1000).toFixed(1));
                setThoughtDurationMap(prev => ({ ...prev, [action]: duration }));
              }
              accumulatedText += parsed.content;
              const now = Date.now();
              if (now - lastRenderTime > THROTTLE_MS) {
                lastRenderTime = now;
                setContentMap(prev => ({
                  ...prev,
                  [action]: accumulatedText.startsWith('[CACHED]') ? accumulatedText.slice(8) : accumulatedText,
                }));
                scrollToBottom();
              }
            }
          } catch {
            if (data) {
              accumulatedText += data;
              setContentMap(prev => ({
                ...prev,
                [action]: accumulatedText.startsWith('[CACHED]') ? accumulatedText.slice(8) : accumulatedText,
              }));
              scrollToBottom();
            }
          }
        }
      }

      let finalText = accumulatedText.trim();
      let isCached = false;
      if (finalText.startsWith('[CACHED]')) {
        finalText = finalText.slice(8).trim();
        isCached = true;
      }

      if (!finalText) {
        throw new Error('AI returned an empty response. Please check your network connection and try again.');
      }

      setContentMap(prev => ({ ...prev, [action]: finalText }));

      if (isCached && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    } catch (err: any) {
      clearInterval(thinkingTimer);
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        return;
      }
      setErrorMap(prev => ({
        ...prev,
        [action]: err.message || 'Unable to generate AI content. Please try again.',
      }));
    } finally {
      clearInterval(thinkingTimer);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setLoadingMap(prev => ({ ...prev, [action]: false }));
    }
  }, [bookId, sectionTitle, sectionContent, bookTitle, bookAuthor, pageNumber, isChapter, scrollToBottom]);

  // On-demand streaming: user clicks the generate button to start analysis


  const handleCopy = () => {
    const textToCopy = contentMap[activeTab] || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleDeleteWord = async (id: string) => {
    try {
      await api.deleteVocabulary(id);
      setBookVocab(prev => prev.filter(w => w.id !== id));
    } catch {
      // ignore
    }
  };

  // Interactive Quiz state & Handlers
  const parsedQuizQuestions = useMemo(() => {
    if (activeTab !== 'quiz' || !contentMap['quiz']) return [];
    return parseQuizMarkdown(contentMap['quiz']);
  }, [activeTab, contentMap]);

  const handleSelectQuizOption = (questionId: string, optionLetter: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionLetter,
    }));
    setRevealedExplanations(prev => ({
      ...prev,
      [questionId]: true,
    }));
  };

  const toggleRevealExplanation = (questionId: string) => {
    setRevealedExplanations(prev => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleResetQuiz = () => {
    setUserAnswers({});
    setRevealedExplanations({});
  };

  // Markdown inline renderer
  const renderInline = (text: string) => {
    let toParse = text;
    const boldMatches = toParse.match(/\*\*/g);
    if (boldMatches && boldMatches.length % 2 !== 0) {
      toParse += '**';
    }

    const parts = toParse.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-bold text-[var(--app-text)]">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono bg-[var(--app-card)] text-[var(--app-accent)] font-semibold">
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Markdown block renderer
  const renderMarkdownBlocks = (markdownText: string) => {
    if (!markdownText) return null;
    const normalized = markdownText.replace(/\r\n/g, '\n');
    const rawBlocks = normalized.split(/\n\n+/);

    return rawBlocks.map((block, bIdx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // 1. TL;DR Overview Section
      if (/^#{1,3}\s*TL;?DR/i.test(trimmed) || /^TL;?DR\s*[:\n]/i.test(trimmed)) {
        const body = trimmed.replace(/^#{1,3}\s*TL;?DR[^\n]*\n*/i, '').replace(/^TL;?DR\s*[:\n]*/i, '').trim();
        if (body) {
          return (
            <div key={bIdx} className="my-2 p-2.5 rounded-xl bg-[var(--app-accent)]/10 border border-[var(--app-accent)]/20 text-[var(--app-text)]">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--app-accent)] uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" />
                <span>Quick Summary (TL;DR)</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed font-medium">
                {renderInline(body)}
              </p>
            </div>
          );
        }

        return (
          <div key={bIdx} className="inline-flex items-center gap-1.5 my-1.5 px-2.5 py-1 rounded-lg bg-[var(--app-accent)]/15 border border-[var(--app-accent)]/25 text-[var(--app-accent)] text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>Quick Summary (TL;DR)</span>
          </div>
        );
      }


      // 2. Key Ideas / Core Concepts Header
      if (/^#{1,3}\s*(Key Ideas|Core Concepts|Key Takeaways|Ý chính|Khái niệm cốt lõi)/i.test(trimmed)) {
        const title = trimmed.replace(/^#{1,3}\s*/, '').split('\n')[0].trim();
        return (
          <div key={bIdx} className="flex items-center gap-2 mt-5 mb-2 text-[var(--app-accent)] font-bold text-sm">
            <Lightbulb className="w-4 h-4 shrink-0" />
            <span className="uppercase tracking-wider text-xs">{title}</span>
          </div>
        );
      }

      // 3. Quotes / Callout Boxes
      if (trimmed.startsWith('>')) {
        const quoteContent = trimmed
          .split('\n')
          .map(l => l.replace(/^>\s*/, ''))
          .join('\n')
          .trim();
        return (
          <div key={bIdx} className="my-3 p-3.5 rounded-2xl bg-[var(--app-card)] border-l-4 border-[var(--app-accent)] flex items-start gap-2.5">
            <Quote className="w-4 h-4 text-[var(--app-accent)] shrink-0 mt-0.5 opacity-80" />
            <div className="text-xs sm:text-sm text-[var(--app-text)] italic leading-relaxed">
              {renderInline(quoteContent)}
            </div>
          </div>
        );
      }

      // 4. Headings (#, ##, ###)
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2].trim();
        if (level === 1) {
          return <h2 key={bIdx} className="text-base font-extrabold text-[var(--app-text)] mt-4 mb-2">{renderInline(headingText)}</h2>;
        }
        if (level === 2) {
          return <h3 key={bIdx} className="text-sm font-bold text-[var(--app-text)] mt-3 mb-1.5 flex items-center gap-1.5">{renderInline(headingText)}</h3>;
        }
        return <h4 key={bIdx} className="text-xs font-bold text-[var(--app-muted)] uppercase tracking-wider mt-3 mb-1">{renderInline(headingText)}</h4>;
      }

      // 5. Unordered List Items
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const lines = trimmed.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
        return (
          <ul key={bIdx} className="my-2 space-y-2 pl-1">
            {lines.map((line, lIdx) => (
              <li key={lIdx} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed text-[var(--app-text)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)] mt-1.5 shrink-0" />
                <span className="flex-1">{renderInline(line.replace(/^[-*]\s+/, ''))}</span>
              </li>
            ))}
          </ul>
        );
      }

      // 6. Numbered List
      if (/^\d+\.\s+/.test(trimmed)) {
        const lines = trimmed.split('\n').filter(l => /^\d+\.\s+/.test(l.trim()));
        return (
          <ol key={bIdx} className="my-2 space-y-2 pl-1">
            {lines.map((line, lIdx) => {
              const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
              const num = numMatch ? numMatch[1] : `${lIdx + 1}`;
              const text = numMatch ? numMatch[2] : line;
              return (
                <li key={lIdx} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed text-[var(--app-text)]">
                  <span className="w-4.5 h-4.5 rounded-full bg-[var(--app-card)] text-[var(--app-accent)] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-[var(--app-border)]">
                    {num}
                  </span>
                  <span className="flex-1">{renderInline(text)}</span>
                </li>
              );
            })}
          </ol>
        );
      }

      // 7. Regular Paragraph
      return (
        <p key={bIdx} className="my-2 text-xs sm:text-sm leading-relaxed text-[var(--app-text)] font-normal">
          {renderInline(trimmed)}
        </p>
      );
    });
  };

  if (!isOpen) return null;

  const currentContent = contentMap[activeTab] || '';
  const currentLoading = !!loadingMap[activeTab];
  const currentError = errorMap[activeTab] || '';
  const currentDuration = thoughtDurationMap[activeTab];

  return (
    <div className="absolute inset-0 z-50 w-full h-full bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col select-none overflow-hidden animate-fadeIn">
      {/* 1. Full-Screen Top Header with Safe Area Top offset */}
      <div className="w-full bg-[var(--app-surface)]/95 backdrop-blur-xl border-b border-[var(--app-border)] px-4 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] pb-2.5 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center space-x-3 overflow-hidden flex-1 min-w-0 pr-2">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[var(--app-card)] text-[var(--app-text)] hover:opacity-80 active:scale-95 transition-all shrink-0 border border-[var(--app-border)]"
            title="Back to reading"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="overflow-hidden flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                isChapter
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-[var(--app-accent)]/20 text-[var(--app-accent)] border border-[var(--app-accent)]/30'
              }`}>
                <Sparkles className="w-2.5 h-2.5" />
                <span>{isChapter ? 'Chapter Roadmap' : 'Section Deep Dive'}</span>
              </span>

              {pageNumber > 0 && (
                <span className="text-[10px] font-mono font-bold text-[var(--app-muted)] bg-[var(--app-card)] px-1.5 py-0.2 rounded-md border border-[var(--app-border)]">
                  p. {pageNumber}
                </span>
              )}
            </div>

            <h2 className="text-sm font-extrabold text-[var(--app-text)] truncate leading-snug" title={sectionTitle}>
              {sectionTitle || `Page ${pageNumber}`}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {onOpenToc && (
            <button
              onClick={() => {
                onClose();
                onOpenToc();
              }}
              className="p-2 rounded-xl bg-[var(--app-card)] border border-[var(--app-border)] text-[var(--app-text)] hover:opacity-80 active:scale-95 transition-all"
              title="Table of Contents"
            >
              <List className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--app-card)] border border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)] active:scale-95 transition-all"
            title="Close AI Companion"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Tab Navigation Pills */}
      <div className="w-full px-3 py-2 bg-[var(--app-surface)]/80 border-b border-[var(--app-border)] shrink-0 grid grid-cols-4 gap-1.5 z-10">
        <button
          onClick={() => setActiveTab('summary')}
          className={`h-9 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
            activeTab === 'summary'
              ? 'bg-[var(--app-accent)] text-white shadow-md'
              : 'text-[var(--app-muted)] hover:text-[var(--app-text)] bg-[var(--app-card)]/50'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span>Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('explain')}
          className={`h-9 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
            activeTab === 'explain'
              ? 'bg-[var(--app-accent)] text-white shadow-md'
              : 'text-[var(--app-muted)] hover:text-[var(--app-text)] bg-[var(--app-card)]/50'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5 shrink-0" />
          <span>Explain</span>
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`h-9 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
            activeTab === 'quiz'
              ? 'bg-[var(--app-accent)] text-white shadow-md'
              : 'text-[var(--app-muted)] hover:text-[var(--app-text)] bg-[var(--app-card)]/50'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Quiz</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('vocab');
            fetchBookVocab();
          }}
          className={`h-9 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
            activeTab === 'vocab'
              ? 'bg-[var(--app-accent)] text-white shadow-md'
              : 'text-[var(--app-muted)] hover:text-[var(--app-text)] bg-[var(--app-card)]/50'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 shrink-0" />
          <span>Vocabulary</span>
          {bookVocab.length > 0 && (
            <span className={`text-[9px] px-1 rounded-full font-extrabold shrink-0 ${
              activeTab === 'vocab' ? 'bg-white/25 text-white' : 'bg-[var(--app-surface)] text-[var(--app-accent)]'
            }`}>
              {bookVocab.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. Main Scrollable Body Content */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4 w-full"
      >
        {/* TAB 4: VOCABULARY NOTEBOOK */}
        {activeTab === 'vocab' ? (
          <div className="space-y-3 pb-6">
            {loadingVocab ? (
              <div className="py-12 flex flex-col items-center justify-center text-[var(--app-muted)] gap-2">
                <div className="w-6 h-6 border-2 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Loading vocabulary notebook...</span>
              </div>
            ) : bookVocab.length === 0 ? (
              <div className="py-14 text-center text-[var(--app-muted)] space-y-2">
                <Bookmark className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs font-semibold">No saved vocabulary words for this book.</p>
                <p className="text-[11px] opacity-75">Tap any word while reading to look up and save to your notebook.</p>
              </div>
            ) : (
              bookVocab.map(v => (
                <div key={v.id} className="p-4 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-extrabold text-[var(--app-text)]">{v.original_text}</h4>
                        {v.part_of_speech && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--app-accent)]/15 text-[var(--app-accent)] uppercase">
                            {v.part_of_speech}
                          </span>
                        )}
                      </div>
                      {v.ipa && (
                        <span className="text-xs font-mono text-[var(--app-muted)]">[{v.ipa}]</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSpeech(v.original_text)}
                        className="p-2 rounded-full text-[var(--app-muted)] hover:text-[var(--app-accent)] active:scale-95"
                        title="Pronounce"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWord(v.id)}
                        className="p-2 rounded-full text-[var(--app-muted)] hover:text-red-500 active:scale-95"
                        title="Delete word"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-[var(--app-accent)]">{v.translated_text}</p>

                  {v.context_sentence && (
                    <p className="text-xs text-[var(--app-muted)] italic border-l-2 border-[var(--app-accent)]/40 pl-2.5 py-0.5">
                      "{v.context_sentence}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* TABS: SUMMARY, EXPLAIN, QUIZ */
          <div className="space-y-4 pb-6">
            {/* 1. Extracting PDF state */}
            {isExtracting && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-3.5 rounded-2xl bg-[var(--app-accent)]/15 text-[var(--app-accent)] animate-pulse">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-[var(--app-text)]">Extracting section text from PDF...</h5>
                  <p className="text-xs text-[var(--app-muted)] mt-1">Retrieving accurate text for this section.</p>
                </div>
              </div>
            )}

            {/* 2. Thinking / Reasoning Streaming HUD */}
            {!isExtracting && currentLoading && !currentContent && (
              <div className="p-4 rounded-2xl bg-[var(--app-card)] border border-[var(--app-accent)]/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[var(--app-accent)]/20 text-[var(--app-accent)] ai-brain-pulse">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--app-text)]">AI is analyzing & reasoning...</span>
                      <span className="text-xs font-mono font-bold text-[var(--app-accent)]">{thinkingElapsed.toFixed(1)}s</span>
                    </div>
                    <p className="text-[11px] text-[var(--app-muted)] truncate mt-0.5">
                      {thinkingElapsed < 3.5
                        ? 'Reading chapter context...'
                        : thinkingElapsed < 7.0
                        ? 'Analyzing key concepts & arguments...'
                        : 'Synthesizing accurate content...'}
                    </p>
                  </div>
                </div>

                {/* Animated shimmer progress bar */}
                <div className="ai-thinking-shimmer-bar">
                  <div className="ai-thinking-shimmer-progress" />
                </div>


                <button
                  onClick={handleCancelStream}
                  className="w-full py-2 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] text-xs font-bold text-[var(--app-muted)] hover:text-[var(--app-text)] flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop generating</span>
                </button>
              </div>
            )}

            {/* 3. Empty text fallback */}
            {!isExtracting && !sectionContent && !currentLoading && (
              <div className="py-12 text-center text-[var(--app-muted)] space-y-3">
                <Compass className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs font-semibold">No text selected for analysis.</p>
                {onOpenToc && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenToc();
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--app-accent)] text-white text-xs font-bold active:scale-95 inline-flex items-center gap-1.5"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Open Table of Contents</span>
                  </button>
                )}
              </div>
            )}

            {/* 4. Ready to Generate / Cancelled state (Section text is ready, but no content generated) */}
            {!isExtracting && !currentContent && !currentLoading && !currentError && sectionContent && (
              <div className="py-14 px-4 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
                <div className="p-4 rounded-3xl bg-[var(--app-accent)]/15 border border-[var(--app-accent)]/30 text-[var(--app-accent)] shadow-sm">
                  {activeTab === 'summary' ? (
                    <FileText className="w-8 h-8" />
                  ) : activeTab === 'explain' ? (
                    <Lightbulb className="w-8 h-8" />
                  ) : (
                    <HelpCircle className="w-8 h-8" />
                  )}
                </div>

                <div className="max-w-[280px]">
                  <h4 className="text-base font-extrabold text-[var(--app-text)]">
                    {activeTab === 'summary'
                      ? (isChapter ? 'Chapter Overview & Roadmap' : 'Generate Section Summary')
                      : activeTab === 'explain'
                      ? (isChapter ? 'Explain Chapter Architecture' : 'Generate Technical Explanation')
                      : (isChapter ? 'Chapter Mastery Quiz' : 'Generate Section Quiz')}
                  </h4>
                  <p className="text-xs text-[var(--app-muted)] mt-1.5 leading-relaxed">
                    {activeTab === 'summary'
                      ? (isChapter ? 'Synthesize architectural roadmap, key topics tree, and chapter motivation.' : 'Extract key takeaways, core points, and a quick TL;DR for this section.')
                      : activeTab === 'explain'
                      ? (isChapter ? 'Break down chapter architecture, high-level trade-offs, and system design.' : 'Break down complex concepts, key arguments, and analogies in simple terms.')
                      : (isChapter ? 'Test your macro understanding with chapter-wide system design questions.' : 'Test your understanding with interactive multiple-choice questions.')}
                  </p>
                </div>

                <button
                  onClick={() => streamAction(activeTab)}
                  className={`mt-2 px-6 py-3 rounded-2xl text-white text-xs font-bold active:scale-95 shadow-md flex items-center gap-2 hover:opacity-90 transition-all ${
                    isChapter && activeTab === 'summary'
                      ? 'bg-purple-600 shadow-purple-500/20'
                      : 'bg-[var(--app-accent)] shadow-[var(--app-accent)]/20'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {activeTab === 'summary'
                      ? (isChapter ? 'Generate Roadmap' : 'Generate Summary')
                      : activeTab === 'explain'
                      ? (isChapter ? 'Explain Architecture' : 'Generate Explanation')
                      : (isChapter ? 'Start Chapter Quiz' : 'Start Quiz')}
                  </span>
                </button>

              </div>
            )}

            {/* 5. Error state */}
            {currentError && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>An error occurred</span>
                </div>
                <p className="text-xs opacity-90">{currentError}</p>
                <button
                  onClick={() => streamAction(activeTab)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-bold flex items-center gap-1.5 active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* 6. INTERACTIVE QUIZ MODE */}
            {!isExtracting && activeTab === 'quiz' && parsedQuizQuestions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-[var(--app-border)]">
                  <span className="text-xs font-bold text-[var(--app-muted)]">
                    {parsedQuizQuestions.length} multiple choice questions
                  </span>
                  <button
                    onClick={handleResetQuiz}
                    className="text-xs font-semibold text-[var(--app-accent)] hover:underline active:scale-95"
                  >
                    Reset all
                  </button>
                </div>

                {parsedQuizQuestions.map((q) => {
                  const selected = userAnswers[q.id];
                  const isAnswered = !!selected;
                  const isCorrect = isAnswered && selected === q.correctAnswerLetter;
                  const showExpl = !!revealedExplanations[q.id];

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isAnswered
                          ? isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-red-500/10 border-red-500/30'
                          : 'bg-[var(--app-card)] border-[var(--app-border)]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[var(--app-accent)] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {q.number}
                        </span>
                        <h4 className="text-sm font-bold text-[var(--app-text)] leading-snug">
                          {q.question}
                        </h4>
                      </div>

                      {/* Quiz Options */}
                      <div className="space-y-2">
                        {q.options.map((opt) => {
                          const isOptSelected = selected === opt.letter;
                          const isOptCorrect = opt.letter === q.correctAnswerLetter;

                          let btnStyle = 'bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-text)] hover:border-[var(--app-accent)]';

                          if (isAnswered) {
                            if (isOptCorrect) {
                              btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold';
                            } else if (isOptSelected && !isOptCorrect) {
                              btnStyle = 'bg-red-500/20 border-red-500 text-red-400 font-bold';
                            } else {
                              btnStyle = 'bg-[var(--app-surface)]/50 border-transparent text-[var(--app-muted)] opacity-60';
                            }
                          }

                          return (
                            <button
                              key={opt.letter}
                              onClick={() => handleSelectQuizOption(q.id, opt.letter)}
                              className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 active:scale-98 transition-all min-h-[44px] ${btnStyle}`}
                            >
                              <span className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border ${
                                isAnswered && isOptCorrect
                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                    : isAnswered && isOptSelected && !isOptCorrect
                                    ? 'bg-red-500 text-white border-red-500'
                                    : 'bg-[var(--app-card)] text-[var(--app-text)] border-[var(--app-border)]'
                              }`}>
                                {opt.letter}
                              </span>
                              <span className="text-xs leading-relaxed flex-1">{opt.text}</span>
                              {isAnswered && isOptCorrect && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                              {isAnswered && isOptSelected && !isOptCorrect && (
                                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Quiz Explanation */}
                      {isAnswered && (
                        <div className="pt-2 border-t border-[var(--app-border)]/60">
                          <button
                            onClick={() => toggleRevealExplanation(q.id)}
                            className="text-xs font-bold text-[var(--app-accent)] flex items-center gap-1 hover:underline"
                          >
                            <span>{showExpl ? 'Hide explanation' : 'View explanation'}</span>
                          </button>
                          {showExpl && (
                            <div className="mt-2 p-3 rounded-xl bg-[var(--app-surface)] text-xs text-[var(--app-text)] leading-relaxed border border-[var(--app-border)] space-y-1">
                              <p className="font-bold text-[var(--app-accent)]">Correct answer: {q.correctAnswerLetter}</p>
                              <p className="opacity-90">{q.explanation || 'No detailed explanation provided.'}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 7. STANDARD MARKDOWN STREAMED CONTENT */}
            {!isExtracting && (activeTab !== 'quiz' || parsedQuizQuestions.length === 0) && currentContent && (
              <div>
                {Boolean(currentDuration && currentDuration > 0) && (
                  <div className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--app-muted)] bg-[var(--app-card)] px-2.5 py-1 rounded-full border border-[var(--app-border)]">
                    <Brain className="w-3.5 h-3.5 text-[var(--app-accent)]" />
                    <span>Completed reasoning in {currentDuration}s</span>
                  </div>
                )}

                <div className="space-y-2 text-[var(--app-text)]">
                  {renderMarkdownBlocks(currentContent)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Sticky Bottom Action Bar with Safe Area */}
      {activeTab !== 'vocab' && (
        currentLoading && currentContent ? (
          <div className="w-full bg-[var(--app-surface)]/95 backdrop-blur-md border-t border-[var(--app-border)] shrink-0 px-4 py-2.5 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] z-20 flex justify-center">
            <button
              onClick={handleCancelStream}
              className="py-2 px-5 rounded-xl bg-[var(--app-card)] border border-[var(--app-border)] text-xs font-bold text-[var(--app-muted)] hover:text-red-500 flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-current text-red-500" />
              <span>Stop generating</span>
            </button>
          </div>
        ) : currentContent && !currentLoading ? (
          <div className="w-full bg-[var(--app-surface)]/95 backdrop-blur-md border-t border-[var(--app-border)] shrink-0 px-4 py-3 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] z-20">
            <div className="w-full flex items-center justify-between gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--app-card)] border border-[var(--app-border)] text-xs font-bold text-[var(--app-text)] flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                onClick={() => streamAction(activeTab)}
                disabled={currentLoading}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--app-accent)] text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
};
