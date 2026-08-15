/**
 * Text Formatter: Formats paragraphs cleanly with natural uniform typography,
 * wrapping each word in a .read-word element for instant touch & translation detection.
 */
export function formatWordElement(word: string): string {
  if (!word || word.trim() === '') return word;

  // Preserve HTML tags
  if (word.startsWith('<') && word.endsWith('>')) {
    return word;
  }

  // Preserve standalone symbols
  if (/^[^a-zA-Z0-9\u00C0-\u1EF9]+$/.test(word)) {
    return word;
  }

  const rawCleanWord = word.trim().replace(/^[^a-zA-Z0-9\u00C0-\u1EF9]+|[^a-zA-Z0-9\u00C0-\u1EF9]+$/g, '');

  return `<span class="read-word" data-word="${rawCleanWord}">${word}</span>`;
}

export function convertToReadableText(text: string): string {
  if (!text) return '';

  const paragraphs = text.split(/\n{2,}/);

  return paragraphs
    .map((paragraph) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';

      // Check if this paragraph is a code block or command
      const isCodeLine = trimmed.startsWith('$') || trimmed.startsWith('kubectl ') || trimmed.startsWith('docker ');

      if (isCodeLine) {
        const words = trimmed.split(/\s+/);
        const wrappedWords = words.map((w) => formatWordElement(w));
        return `<div class="p-3 my-3 rounded-xl bg-[var(--app-card)] border border-[var(--app-border)] font-mono text-[13px] text-orange-warm/90 overflow-x-auto select-none whitespace-pre-wrap">${wrappedWords.join(' ')}</div>`;
      }

      const words = trimmed.split(/\s+/);
      const wrappedWords = words.map((w) => formatWordElement(w));
      return `<p class="mb-4 leading-relaxed text-left tracking-normal text-[var(--app-text)] font-normal">${wrappedWords.join(' ')}</p>`;
    })
    .filter(Boolean)
    .join('');
}

// Keep export for backward compatibility
export const convertToBionicText = convertToReadableText;
