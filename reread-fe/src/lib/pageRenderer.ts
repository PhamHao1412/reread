/**
 * Renders a PDF page to a high-resolution JPEG Data URL.
 * Image tags are 100% resilient against Safari canvas compositor limits.
 */
export async function renderPageToDataUrl(page: any, targetWidth: number = 750): Promise<string> {
  if (!page) return '';
  try {
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = targetWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Fill with clean white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.90);
  } catch (err) {
    console.error('Failed to render page to image data URL:', err);
    return '';
  }
}
