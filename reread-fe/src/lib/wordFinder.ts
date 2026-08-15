/**
 * Clean and isolate a single word from a raw string or selection.
 * Strips quotes, parentheses, punctuation, brackets.
 * Strictly disallows multi-word sentences or paragraphs.
 */
export function sanitizeSingleWord(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  
  // If the text contains whitespace, it's a multi-word phrase -> reject per user rule
  if (/\s+/.test(trimmed)) {
    return null;
  }

  const clean = trimmed.replace(/^[^a-zA-Z0-9\u00C0-\u1EF9]+|[^a-zA-Z0-9\u00C0-\u1EF9]+$/g, '');
  if (clean.length < 2 || clean.length > 45) {
    return null;
  }

  return clean;
}

/**
 * Finds the exact single word at the tap / double-click coordinate (clientX, clientY).
 */
export function getWordAtPoint(clientX: number, clientY: number): string | null {
  let range: Range | null = null;
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(clientX, clientY);
  } else if ((document as any).caretPositionFromPoint) {
    const pos = (document as any).caretPositionFromPoint(clientX, clientY);
    if (pos && pos.offsetNode) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  }

  if (!range) return null;

  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;

  const text = node.textContent || '';
  let offset = range.startOffset;

  if (offset >= text.length) offset = text.length - 1;
  if (offset < 0) return null;

  const wordRegex = /[a-zA-Z0-9\u00C0-\u1EF9]/;
  if (!wordRegex.test(text[offset])) {
    if (offset > 0 && wordRegex.test(text[offset - 1])) {
      offset--;
    } else {
      return null;
    }
  }

  // Find start of word
  let start = offset;
  while (start > 0 && wordRegex.test(text[start - 1])) {
    start--;
  }

  // Find end of word
  let end = offset + 1;
  while (end < text.length && wordRegex.test(text[end])) {
    end++;
  }

  const word = text.slice(start, end);
  return sanitizeSingleWord(word);
}
