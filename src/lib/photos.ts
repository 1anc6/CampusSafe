/** Photos per report (signed-in and anonymous). */
export const PHOTO_MAX = 3;
/** Largest accepted photo as a base64 data URL (~1 MB of JPEG); 3 fit under a 4.5 MB request. */
export const PHOTO_MAX_CHARS = 1_400_000;
/** Long edge photos are scaled down to: enough to read a number plate or a sign. */
export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_QUALITY = 0.72;
/** Originals bigger than this are refused before decoding (phone cameras stay well below it). */
export const PHOTO_INPUT_MAX_BYTES = 25 * 1024 * 1024;

/**
 * Decode an image file and draw it onto a canvas, returning a fresh JPEG data
 * URL. Re-encoding keeps only pixels: EXIF (GPS, time, camera serial), XMP and
 * other metadata in the original never reach the output. `createImageBitmap`
 * applies the EXIF rotation first, so the photo still comes out upright.
 *
 * Steps the size down until the result fits `maxChars`. Browser-only.
 */
export async function reencodeImage(
  file: Blob,
  {
    maxEdge,
    quality,
    maxChars = Infinity,
  }: { maxEdge: number; quality: number; maxChars?: number },
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    let edge = maxEdge;
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not process the photo");
      // JPEG has no transparency: paint transparent PNGs on white instead of black.
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/jpeg", quality);
      if (url.length <= maxChars) return url;
      edge = Math.round(edge * 0.75);
    }
    throw new Error("Photo is too large");
  } finally {
    bitmap.close();
  }
}
