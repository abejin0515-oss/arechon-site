// scripts/gen-depth-map.mjs
// Generates an APPROXIMATE grayscale depth map for the /motion 2.5D treatment.
//
// This is a deliberate stand-in. The hero photo (public/motion/rice-macro.jpg,
// Ben Libby / Pexels) has its focus plane in the lower-center foreground and
// recedes to bokeh toward the top — a natural near→far gradient. We approximate
// that with a smooth field: brightest (= nearest, displaced toward the camera)
// at the lower-center focus point, falling off toward the top and the edges,
// then softened. White = near, black = far.
//
// In PRODUCTION this file should be replaced by an AI-generated monocular depth
// map (Depth Anything V2 or MiDaS) for per-grain accuracy. The shader reads
// whatever grayscale lives at public/motion/rice-depth.png, so swapping is a
// drop-in.
//
// No external deps: emits a valid 8-bit grayscale PNG via zlib.deflateSync.
// Run: "C:\Program Files\nodejs\node.exe" scripts/gen-depth-map.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'motion', 'rice-depth.png');

// Map matches the photo's 4:3 framing; resolution is modest because depth is
// low-frequency and gets bilinear-sampled in the shader anyway.
const W = 512;
const H = 384;

// Focus point (normalized): the sharp grains sit slightly below center.
const FX = 0.5;
const FY = 0.62; // 0 = top, 1 = bottom

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// Raw depth field, pre-blur.
const raw = new Float32Array(W * H);
for (let y = 0; y < H; y++) {
  const ny = y / (H - 1);
  for (let x = 0; x < W; x++) {
    const nx = x / (W - 1);

    // Radial falloff from the focus point (elliptical: wider horizontally so
    // the foreground band reads as a plane, not a dot).
    const dx = (nx - FX) / 0.85;
    const dy = (ny - FY) / 0.62;
    const r = Math.sqrt(dx * dx + dy * dy);
    let near = 1 - smoothstep(0.15, 1.05, r);

    // Vertical bias: the top of the frame is the deep bokeh, push it far.
    const verticalFar = smoothstep(0.55, 0.0, ny); // 1 at very top → 0 mid
    near *= 1 - 0.65 * verticalFar;

    // Keep a soft floor so the far plane still parallaxes a little.
    raw[y * W + x] = 0.08 + 0.92 * Math.max(0, near);
  }
}

// Separable box blur (a few passes ≈ gaussian) so displacement is smooth and
// never tears the mesh. Depth maps must be low-frequency for clean parallax.
function boxBlur(src, radius, passes) {
  let buf = src;
  for (let p = 0; p < passes; p++) {
    const tmp = new Float32Array(W * H);
    // horizontal
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let sum = 0;
        let n = 0;
        for (let k = -radius; k <= radius; k++) {
          const xx = Math.min(W - 1, Math.max(0, x + k));
          sum += buf[y * W + xx];
          n++;
        }
        tmp[y * W + x] = sum / n;
      }
    }
    const out = new Float32Array(W * H);
    // vertical
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let sum = 0;
        let n = 0;
        for (let k = -radius; k <= radius; k++) {
          const yy = Math.min(H - 1, Math.max(0, y + k));
          sum += tmp[yy * W + x];
          n++;
        }
        out[y * W + x] = sum / n;
      }
    }
    buf = out;
  }
  return buf;
}

const blurred = boxBlur(raw, 12, 3);

// --- Encode 8-bit grayscale PNG (color type 0) ---------------------------- //
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'latin1');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 0; // color type: grayscale
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// Raw scanlines, each prefixed with filter byte 0.
const stride = W + 1;
const rawImg = Buffer.alloc(stride * H);
for (let y = 0; y < H; y++) {
  rawImg[y * stride] = 0; // filter: none
  for (let x = 0; x < W; x++) {
    const v = Math.round(Math.min(1, Math.max(0, blurred[y * W + x])) * 255);
    rawImg[y * stride + 1 + x] = v;
  }
}

const idat = deflateSync(rawImg, { level: 9 });

const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

writeFileSync(OUT, png);
console.log(`wrote ${OUT} (${W}x${H}, ${png.length} bytes)`);
