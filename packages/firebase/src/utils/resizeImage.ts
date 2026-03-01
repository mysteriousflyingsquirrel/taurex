/**
 * Client-side image resize via canvas.
 * Returns a WebP blob scaled to fit within maxWidth (aspect ratio preserved).
 * If the source is already smaller, it is re-encoded without upscaling.
 */
export function resizeImage(
  file: File,
  maxWidth: number,
  quality = 0.82,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob returned null"));
        },
        "image/webp",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image for resizing"));
    };
    img.src = URL.createObjectURL(file);
  });
}
