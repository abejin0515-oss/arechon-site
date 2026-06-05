// One-shot downloader for the 3 /motion editorial photos (Unsplash License).
// node scripts/fetch-motion-photos.mjs
import { createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

const OUT = path.resolve('public/motion');

const PHOTOS = [
  {
    file: 'flow-ink.jpg',
    id: 'photo-1612742492308-82bde3e15c7c',
    by: 'engin akyurt',
  },
  {
    file: 'flow-silk.jpg',
    id: 'photo-1631663027473-3671aa7c4503',
    by: 'Susan Wilkinson',
  },
  {
    file: 'flow-iris.jpg',
    id: 'photo-1723384960692-1c2565e14b18',
    by: 'Marcin Krawczynski',
  },
];

const url = (id) =>
  `https://images.unsplash.com/${id}?fm=jpg&q=88&w=2880&fit=max&auto=format`;

await mkdir(OUT, { recursive: true });

for (const p of PHOTOS) {
  const dest = path.join(OUT, p.file);
  const res = await fetch(url(p.id), {
    headers: { 'User-Agent': 'Mozilla/5.0 (fetch-motion-photos)' },
  });
  if (!res.ok || !res.body) {
    console.error(`FAIL ${p.file}: HTTP ${res.status}`);
    process.exitCode = 1;
    continue;
  }
  await pipeline(res.body, createWriteStream(dest));
  const s = await stat(dest);
  console.log(`OK   ${p.file}  ${(s.size / 1024).toFixed(0)} KB  by ${p.by}`);
}
