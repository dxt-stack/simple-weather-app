/**
 * One-shot generator for the Stratus app icon.
 *
 * Draws the Stratus mark — two layered pill bars (stratus = layer cloud) on a
 * light ground — with signed-distance-field anti-aliasing, then encodes PNGs
 * with node:zlib. No image dependencies needed.
 *
 * Outputs:
 *   resources/icon.png                        1024x1024 source
 *   android/.../mipmap-<density>/ic_launcher.png       all densities
 *   android/.../mipmap-<density>/ic_launcher_round.png (circle-masked)
 *   public/logo.svg, src/assets/logo.svg      vector version for the web
 *
 * Run: bun scripts/make-icon.ts
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// ---------------------------------------------------------------------------
// Palette (matches the app's near-monochrome theme)
// ---------------------------------------------------------------------------

const BG: [number, number, number] = [250, 250, 249];
const FG: [number, number, number] = [28, 28, 27];

// ---------------------------------------------------------------------------
// Geometry — fractions of icon size, centered at (0.5, 0.5)
// ---------------------------------------------------------------------------

interface Bar {
  cx: number;
  cy: number;
  hw: number; // half width
  hh: number; // half height
}

const BARS: Bar[] = [
  { cx: 0.5, cy: 0.415, hw: 0.255, hh: 0.036 }, // upper layer (shorter)
  { cx: 0.5, cy: 0.585, hw: 0.335, hh: 0.046 }, // lower layer (wider)
];

/** Signed distance to a pill (rounded rect with r = hh). */
function sdPill(px: number, py: number, b: Bar): number {
  const r = b.hh;
  const dx = Math.abs(px - b.cx) - (b.hw - r);
  const dy = Math.abs(py - b.cy);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy - 0, 0);
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(ax, ay) - r;
}

function barCoverage(px: number, py: number): number {
  let d = Infinity;
  for (const b of BARS) d = Math.min(d, sdPill(px, py, b));
  return Math.min(Math.max(0.5 - d, 0), 1);
}

function circleCoverage(px: number, py: number): number {
  const d = Math.hypot(px - 0.5, py - 0.5) - 0.5;
  return Math.min(Math.max(0.5 - d, 0), 1);
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

/** Render the icon at `size` px. 4x4 supersampling for clean edges. */
function render(size: number, round: boolean): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  const S = 4; // supersample grid per axis
  const step = 1 / S;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cov = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = (x + (sx + 0.5) * step) / size;
          const py = (y + (sy + 0.5) * step) / size;
          let a = barCoverage(px, py);
          if (round) a *= circleCoverage(px, py);
          cov += a;
        }
      }
      cov /= S * S;

      const i = (y * size + x) * 4;
      out[i] = Math.round(FG[0] * cov + BG[0] * (1 - cov));
      out[i + 1] = Math.round(FG[1] * cov + BG[1] * (1 - cov));
      out[i + 2] = Math.round(FG[2] * cov + BG[2] * (1 - cov));
      out[i + 3] = round ? Math.round(255 * cov) : 255;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// PNG encoder (RGBA8, no interlace)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function encodePng(size: number, rgba: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, size);
  dv.setUint32(4, size);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // compression(0) filter(0) interlace(0) already zero

  // filter byte 0 per scanline
  const raw = new Uint8Array(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * size * 4, (y + 1) * size * 4), y * (size * 4 + 1) + 1);
  }

  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk("IHDR", ihdr),
    ...chunk("IDAT", deflateSync(raw, { level: 9 })),
    ...chunk("IEND", new Uint8Array(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

function save(path: string, bytes: Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  console.log("wrote", path);
}

// Source icon
save("resources/icon.png", encodePng(1024, render(1024, false)));

// Android launcher mipmaps
const DENSITIES: Array<[string, number]> = [
  ["mdpi", 48],
  ["hdpi", 72],
  ["xhdpi", 96],
  ["xxhdpi", 144],
  ["xxxhdpi", 192],
];
for (const [d, s] of DENSITIES) {
  save(`android/app/src/main/res/mipmap-${d}/ic_launcher.png`, encodePng(s, render(s, false)));
  save(`android/app/src/main/res/mipmap-${d}/ic_launcher_round.png`, encodePng(s, render(s, true)));
}

// Web SVG (same geometry)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="232" fill="rgb(${BG.join(",")})"/>
  <rect x="${Math.round((0.5 - BARS[0].hw) * 1024)}" y="${Math.round((BARS[0].cy - BARS[0].hh) * 1024)}" width="${Math.round(BARS[0].hw * 2 * 1024)}" height="${Math.round(BARS[0].hh * 2 * 1024)}" rx="${Math.round(BARS[0].hh * 1024)}" fill="rgb(${FG.join(",")})"/>
  <rect x="${Math.round((0.5 - BARS[1].hw) * 1024)}" y="${Math.round((BARS[1].cy - BARS[1].hh) * 1024)}" width="${Math.round(BARS[1].hw * 2 * 1024)}" height="${Math.round(BARS[1].hh * 2 * 1024)}" rx="${Math.round(BARS[1].hh * 1024)}" fill="rgb(${FG.join(",")})"/>
</svg>
`;
save("public/logo.svg", new TextEncoder().encode(svg));
save("src/assets/logo.svg", new TextEncoder().encode(svg));

console.log("done");
