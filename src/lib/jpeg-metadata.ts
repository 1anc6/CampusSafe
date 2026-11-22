/**
 * Remove every metadata segment from a JPEG: APP0–APP15 (JFIF, EXIF with GPS and
 * camera serials, XMP, ICC, Adobe, maker notes…) and COM comments. Only what a
 * decoder needs to draw the picture is kept.
 *
 * The anonymous report form already re-encodes photos through a canvas, which
 * writes none of this; the server runs this again so a modified client cannot
 * slip a geotagged original past the promise on the form. Throws on anything
 * that is not a well-formed JPEG.
 *
 * Plain TypeScript with no imports, so `node --experimental-strip-types` can test it.
 */
export function stripJpegMetadata(input: Uint8Array): Uint8Array {
  const b = input;
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) throw new Error("Not a JPEG image");
  const keep: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  for (;;) {
    if (i >= b.length || b[i] !== 0xff) throw new Error("Corrupt JPEG image");
    // Any number of 0xFF fill bytes may pad a marker.
    while (i + 1 < b.length && b[i + 1] === 0xff) i++;
    if (i + 1 >= b.length) throw new Error("Corrupt JPEG image");
    const marker = b[i + 1];
    if (marker === 0xd9) {
      keep.push(b.subarray(i, i + 2));
      break;
    }
    // Stand-alone markers (TEM, RST0–7) carry no length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      keep.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 3 >= b.length) throw new Error("Corrupt JPEG image");
    const end = i + 2 + ((b[i + 2] << 8) | b[i + 3]);
    if (end > b.length || end < i + 4) throw new Error("Corrupt JPEG image");
    const isMetadata = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadata) keep.push(b.subarray(i, end));
    i = end;
    if (marker === 0xda) {
      // Start of scan: entropy-coded data runs until the next real marker
      // (0xFF followed by something other than a 0x00 stuffing byte or RSTn).
      let j = i;
      while (j + 1 < b.length) {
        if (b[j] === 0xff && b[j + 1] !== 0x00 && !(b[j + 1] >= 0xd0 && b[j + 1] <= 0xd7)) break;
        j++;
      }
      if (j + 1 >= b.length) throw new Error("Corrupt JPEG image");
      keep.push(b.subarray(i, j));
      i = j;
    }
  }
  const out = new Uint8Array(keep.reduce((n, part) => n + part.length, 0));
  let at = 0;
  for (const part of keep) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
