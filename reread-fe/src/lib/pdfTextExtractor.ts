/**
 * Reconstructs continuous sentences, words, and paragraphs from raw PDF.js glyph fragments
 */
export function extractStructuredTextFromPageItems(items: any[]): string {
  if (!items || items.length === 0) return '';

  let fullText = '';
  let lastY: number | null = null;
  let lastX = 0;
  let lastWidth = 0;
  let lastStr = '';

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (typeof item.str !== 'string') continue;
    const str = item.str;
    if (!str && !item.hasEOL) continue;

    const transform = item.transform || [1, 0, 0, 1, 0, 0];
    const x = transform[4];
    const y = transform[5];
    const fontSize = Math.abs(transform[0]) || Math.abs(transform[3]) || 12;

    if (lastY !== null) {
      const yDiff = Math.abs(y - lastY);
      const isNewLine = yDiff > fontSize * 0.45;

      if (isNewLine) {
        // Hyphenation at line ending: e.g. "config-" -> "configuration"
        if (lastStr.endsWith('-') && /^[a-zA-Z]/.test(str)) {
          fullText = fullText.slice(0, -1) + str;
        } else if (yDiff > fontSize * 1.6) {
          // Large vertical paragraph gap
          fullText += '\n\n' + str;
        } else {
          // Soft wrap to next line
          if (!fullText.endsWith(' ') && !str.startsWith(' ')) {
            fullText += ' ' + str;
          } else {
            fullText += str;
          }
        }
      } else {
        // Same line horizontal gap calculation
        const xGap = x - (lastX + lastWidth);
        // Only insert a space if there is a real word gap (>= 18% of font size)
        if (xGap >= fontSize * 0.18 && !lastStr.endsWith(' ') && !str.startsWith(' ')) {
          fullText += ' ' + str;
        } else {
          fullText += str;
        }
      }
    } else {
      fullText += str;
    }

    lastY = y;
    lastX = x;
    lastWidth = item.width !== undefined ? item.width : (str.length * fontSize * 0.45);
    lastStr = str;
  }

  return fullText
    .replace(/[ \t]+/g, ' ')
    .replace(/\n +/g, '\n')
    .replace(/ +\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
