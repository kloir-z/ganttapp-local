// Record the README demo GIF: drag the first task bar right and back, showing
// dependent tasks rippling automatically. Frames are captured per mouse step
// and assembled with ffmpeg (palette-optimized GIF).
//
// Prereqs: `node scripts/gen-demo-page.mjs` and a static server on :5050
// (`npx serve dist-single -l 5050`), ffmpeg on PATH.
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFileSync } from 'child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gantt-frames-'));
let frameNo = 0;

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 675 });
await page.goto('http://localhost:5050/demo.html', { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 3500));

// Fake cursor (screenshots don't include the real one).
await page.evaluate(() => {
  const c = document.createElement('div');
  c.id = 'fake-cursor';
  c.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;left:0;top:0;will-change:transform;';
  c.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24">
    <path d="M5 2 L5 19 L9.5 15.5 L12.5 21.5 L15 20 L12 14.5 L18 14 Z"
          fill="white" stroke="black" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
  document.body.appendChild(c);
  window.__setCursor = (x, y) => { c.style.transform = `translate(${x}px, ${y}px)`; };
});

let cx = 980; let cy = 480; // cursor start, over the empty chart area
const setCursor = (x, y) => page.evaluate((a, b) => window.__setCursor(a, b), x, y);
const shot = async () => {
  await page.screenshot({ path: path.join(frameDir, `f${String(frameNo++).padStart(4, '0')}.png`) });
};
const hold = async (n) => { for (let i = 0; i < n; i++) await shot(); };
const glide = async (tx, ty, steps) => {
  for (let i = 1; i <= steps; i++) {
    // ease-in-out
    const t = i / steps; const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const x = cx + (tx - cx) * e; const y = cy + (ty - cy) * e;
    await page.mouse.move(x, y);
    await setCursor(x, y);
    await shot();
  }
  cx = tx; cy = ty;
};
const dragTo = async (tx, steps) => {
  for (let i = 1; i <= steps; i++) {
    const x = cx + ((tx - cx) * i) / steps;
    await page.mouse.move(x, cy);
    await setCursor(x, cy);
    await shot();
  }
  cx = tx;
};

// Locate the target bar by its task-name input.
const bar = await page.evaluate(() => {
  for (const el of document.querySelectorAll('div')) {
    const s = el.style;
    if (s.height === '21px' && s.left && s.width && el.offsetParent !== null) {
      const input = el.querySelector('input');
      if (input && input.value === 'クライアント要件整理') {
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
    }
  }
  return null;
});
if (!bar) throw new Error('target bar not found');

await setCursor(cx, cy);
await hold(6);
await glide(bar.x, bar.y, 12);
await hold(3);
await page.mouse.down();
await dragTo(bar.x + 100, 20); // +10 days, dependents follow
await hold(6);
await dragTo(bar.x, 20); // and back
await page.mouse.up();
await hold(10);

await browser.close();

const out = path.join(root, 'docs', 'images', 'demo.gif');
execFileSync('ffmpeg', [
  '-y', '-framerate', '12', '-i', path.join(frameDir, 'f%04d.png'),
  '-vf', 'fps=12,scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=5',
  out,
]);
fs.rmSync(frameDir, { recursive: true, force: true });
const size = fs.statSync(out).size;
console.log(`written: ${out} (${(size / 1024 / 1024).toFixed(2)} MB, ${frameNo} frames)`);
