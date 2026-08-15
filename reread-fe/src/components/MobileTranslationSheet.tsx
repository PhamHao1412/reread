import React, { useState, useEffect } from 'react';
import { TranslationData } from '../types';
import { api } from '../lib/api';
import { X, Volume2, Bookmark, Check, Loader2, AlertCircle } from 'lucide-react';

interface MobileTranslationSheetProps {
  word: string;
  bookId: string;
  onClose: () => void;
}

export const MobileTranslationSheet: React.FC<MobileTranslationSheetProps> = ({
  word,
  bookId,
  onClose,
}) => {
  const [data, setData] = useState<TranslationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [saved, setSaved] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

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
        audio_url: data.audioUrl || '',
      });
      setSaved(true);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-[420px] bg-[var(--app-surface)] text-[var(--app-text)] rounded-t-[28px] border-t border-[var(--app-border)] p-6 z-10 max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl animate-slide-up select-none">
        {/* Drag handle */}
        <div className="mx-auto w-12 h-1 bg-[var(--app-muted)]/30 rounded-full mb-4" />

        {/* Header Bar */}
        <div className="flex justify-between items-start mb-4">
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

        {/* Content Body */}
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

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                onClick={handleSaveVocab}
                disabled={saved || saving}
                className={`w-full flex items-center justify-center space-x-2 py-3 rounded-2xl font-bold text-xs border transition-all active:scale-98 ${
                  saved
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-[var(--app-accent)] border-[var(--app-accent)] text-white shadow-lg'
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
    </div>
  );
};
