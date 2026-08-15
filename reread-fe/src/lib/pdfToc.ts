export interface TocItem {
  id: string;
  title: string;
  pageNumber: number;
  level: number;
}

/**
 * Extract Table of Contents (Outline) from PDF.js document with resolved page numbers.
 */
export async function extractTableOfContents(pdfDoc: any): Promise<TocItem[]> {
  if (!pdfDoc) return [];
  try {
    const rawOutline = await pdfDoc.getOutline();
    if (!rawOutline || rawOutline.length === 0) {
      return [];
    }

    const result: TocItem[] = [];

    async function processItems(items: any[], level: number = 0) {
      for (const item of items) {
        let pageNumber = 1;
        if (item.dest) {
          try {
            let dest = item.dest;
            if (typeof dest === 'string') {
              dest = await pdfDoc.getDestination(dest);
            }
            if (Array.isArray(dest) && dest[0]) {
              const pageIndex = await pdfDoc.getPageIndex(dest[0]);
              pageNumber = pageIndex + 1;
            }
          } catch {
            // fallback page number
          }
        }

        result.push({
          id: `${item.title}-${pageNumber}-${result.length}`,
          title: item.title?.trim() || 'Chương',
          pageNumber,
          level,
        });

        if (item.items && item.items.length > 0) {
          await processItems(item.items, level + 1);
        }
      }
    }

    await processItems(rawOutline, 0);
    return result;
  } catch {
    return [];
  }
}
