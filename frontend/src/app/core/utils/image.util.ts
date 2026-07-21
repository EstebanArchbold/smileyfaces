// Downscale and re-encode an image File in the browser before uploading.
// Phone photos are often several MB, which can exceed reverse-proxy body
// limits and are far larger than needed for on-page display. We cap the
// longest edge and re-encode as JPEG to keep uploads small and fast.
export async function compressImage(
  file: File,
  maxEdge = 1600,
  quality = 0.85
): Promise<File> {
  // Only process raster images the canvas can decode. Leave anything else
  // (e.g. SVG, or unknown types) untouched so we never corrupt it.
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );
  if (!blob) return file;

  // If compression didn't actually help (already small), keep the original.
  if (blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg' });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}
