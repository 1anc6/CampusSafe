import { test } from "node:test";
import assert from "node:assert/strict";
import { stripJpegMetadata } from "./jpeg-metadata.ts";

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** A marker segment: FF xx, 2-byte length (counting itself), payload. */
function seg(marker: number, payload: number[]): number[] {
  const len = payload.length + 2;
  return [0xff, marker, len >> 8, len & 0xff, ...payload];
}

const APP0 = seg(0xe0, ascii("JFIF\0"));
const EXIF = seg(0xe1, ascii("Exif\0\0GPS 30.2683N 77.9946E serial 12345"));
const XMP = seg(0xe1, ascii("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>"));
const COM = seg(0xfe, ascii("taken by Priya"));
const DQT = seg(0xdb, [0x00, 1, 2, 3, 4]);
const SOF = seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]);
const SOS = seg(0xda, [1, 1, 0, 0, 0x3f, 0]);
// Entropy data with a stuffed 0xFF00 and a restart marker, which must survive.
const SCAN = [0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56];

function jpeg(...parts: number[][]): Uint8Array {
  return new Uint8Array([0xff, 0xd8, ...parts.flat(), 0xff, 0xd9]);
}

test("drops EXIF, XMP, JFIF and comments but keeps image data", () => {
  const out = stripJpegMetadata(jpeg(APP0, EXIF, XMP, COM, DQT, SOF, SOS, SCAN));
  assert.deepEqual([...out], [0xff, 0xd8, ...DQT, ...SOF, ...SOS, ...SCAN, 0xff, 0xd9]);
  const text = String.fromCharCode(...out);
  assert.ok(!text.includes("GPS"));
  assert.ok(!text.includes("Priya"));
});

test("drops metadata that appears after the first scan (progressive JPEGs)", () => {
  const out = stripJpegMetadata(jpeg(DQT, SOF, SOS, SCAN, EXIF, SOS, SCAN));
  assert.deepEqual(
    [...out],
    [0xff, 0xd8, ...DQT, ...SOF, ...SOS, ...SCAN, ...SOS, ...SCAN, 0xff, 0xd9],
  );
});

test("an already clean JPEG comes back unchanged", () => {
  const clean = jpeg(DQT, SOF, SOS, SCAN);
  assert.deepEqual([...stripJpegMetadata(clean)], [...clean]);
});

test("rejects things that are not JPEGs", () => {
  assert.throws(() => stripJpegMetadata(new Uint8Array(ascii("\x89PNG\r\n\x1a\n"))));
  assert.throws(() => stripJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x40])));
  assert.throws(() => stripJpegMetadata(new Uint8Array([0xff, 0xd8, ...DQT, ...SOF, ...SOS, 1])));
});
