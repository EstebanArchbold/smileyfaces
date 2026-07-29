import sharp from 'sharp';

/**
 * Photos arrive straight from phone cameras (10MB+, 4000px wide) and were being
 * stored and served untouched. 1600px covers the widest slot in the UI — the
 * full-bleed hero — and the gallery grid never shows anything near that.
 */
export const MAX_WIDTH = 1600;
export const WEBP_QUALITY = 80;

/** GIFs are passed through: re-encoding an animated one to WebP flattens it. */
export const PASSTHROUGH_MIME = ['image/gif'];

/**
 * Re-encodes an image to WebP, capped at MAX_WIDTH.
 *
 * rotate() is applied first on purpose: phone JPEGs record their orientation in
 * EXIF, and encoding drops that metadata. Without baking the rotation into the
 * pixels first, portrait photos come out sideways.
 */
export async function compressToWebp(source: string, destination: string): Promise<void> {
  await sharp(source)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(destination);
}
