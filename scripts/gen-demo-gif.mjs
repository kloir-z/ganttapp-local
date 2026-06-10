// Record the README demo GIF in the "polished screencast" style: a virtual
// camera eases in on the task bar, follows the drag while dependent tasks
// ripple, then eases back out. Click ripples and the fake cursor are drawn
// in-page; the camera (crop + zoom) is applied per frame with ffmpeg.
//
// Prereqs: `node scripts/gen-demo-page.mjs`, a static server on :5050
// (`npx serve dist-single -l 5050`), ffmpeg on PATH.
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFileSync } from 'child_process';

const FPS = 15;
const VW = 1200, VH = 675; // CSS px
const DSF = 2;             // capture at 2x for sharp zooms
const OUT_W = 900, OUT_H = 506;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gantt-raw-'));
const camDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gantt-cam-'));

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DSF });
await page.goto('http://localhost:5050/demo.html', { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 3500));

// Fake cursor + manually-driven click ripple (CSS animations would run on
// real time, not capture time, so the ripple is positioned per frame).
await page.evaluate(() => {
  const c = document.createElement('div');
  c.id = 'fake-cursor';
  c.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;left:0;top:0;will-change:transform;';
  c.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24">
    <path d="M5 2 L5 19 L9.5 15.5 L12.5 21.5 L15 20 L12 14.5 L18 14 Z"
          fill="white" stroke="black" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
  document.body.appendChild(c);
  const r = document.createElement('div');
  r.id = 'click-ripple';
  r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border-radius:50%;border:2.5px solid rgba(74,144,226,.9);background:rgba(74,144,226,.18);left:0;top:0;width:0;height:0;opacity:0;';
  document.body.appendChild(r);
  window.__setCursor = (x, y, pressed) => {
    c.style.transform = `translate(${x}px, ${y}px) scale(${pressed ? 0.82 : 1})`;
  };
  window.__ripple = (x, y, t) => {
    if (t >= 1 || t < 0) { r.style.opacity = '0'; return; }
    const d = 14 + 46 * t;
    r.style.width = `${d}px`; r.style.height = `${d}px`;
    r.style.left = `${x - d / 2}px`; r.style.top = `${y - d / 2}px`;
    r.style.opacity = String(0.9 * (1 - t));
  };
});

// ---- capture machinery ------------------------------------------------
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

let frameNo = 0;
const camTrack = []; // {cx, cy, zoom} per frame, CSS px
let cur = { x: 980, y: 480, pressed: false };
let cam = { cx: VW / 2, cy: VH / 2, zoom: 1 };
let rippleStart = -99; let ripplePos = { x: 0, y: 0 };

const shot = async () => {
  const rt = (frameNo - rippleStart) / 9; // ripple spans ~9 frames
  await page.evaluate((c, rp, t) => {
    window.__setCursor(c.x, c.y, c.pressed);
    window.__ripple(rp.x, rp.y, t);
  }, cur, ripplePos, rt);
  await page.screenshot({ path: path.join(rawDir, `f${String(frameNo).padStart(4, '0')}.png`) });
  camTrack.push({ ...cam });
  frameNo++;
};
const hold = async (n) => { for (let i = 0; i < n; i++) await shot(); };

// Move cursor and/or camera simultaneously over n eased steps.
const animate = async (n, { cursorTo, camTo, drag } = {}) => {
  const c0 = { ...cur }; const k0 = { ...cam };
  for (let i = 1; i <= n; i++) {
    const t = ease(i / n);
    if (cursorTo) {
      cur.x = lerp(c0.x, cursorTo.x, t); cur.y = lerp(c0.y, cursorTo.y, t);
      await page.mouse.move(cur.x, cur.y);
    }
    if (camTo) {
      cam.cx = lerp(k0.cx, camTo.cx, t); cam.cy = lerp(k0.cy, camTo.cy, t);
      cam.zoom = lerp(k0.zoom, camTo.zoom, t);
    }
    await shot();
  }
  void drag;
};

// ---- locate the target bar --------------------------------------------
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

// Focus point: between the dragged bar and its dependent rows below-right.
const focus = { cx: bar.x + 130, cy: bar.y + 80 };
const ZOOM = 1.55;

// ---- storyboard ---------------------------------------------------------
// The camera stays fixed while dragging (only the cursor and bars move) so
// inter-frame deltas stay small and the GIF compresses well; camera motion
// is confined to the short zoom-in/out transitions.
await page.evaluate((c) => window.__setCursor(c.x, c.y, false), cur);
await hold(10);                                                        // wide
await animate(16, { cursorTo: bar, camTo: { ...focus, zoom: ZOOM } }); // zoom in
await hold(3);
await page.mouse.down(); cur.pressed = true;
rippleStart = frameNo; ripplePos = { x: bar.x, y: bar.y };
await hold(4);
await animate(32, { cursorTo: { x: bar.x + 100, y: bar.y } });         // drag right
await hold(8);
await animate(32, { cursorTo: { x: bar.x, y: bar.y } });               // drag back
await page.mouse.up(); cur.pressed = false;
rippleStart = frameNo; ripplePos = { x: bar.x, y: bar.y };
await hold(5);
await animate(16, { camTo: { cx: VW / 2, cy: VH / 2, zoom: 1 } });     // zoom out
await hold(14);

await browser.close();

// ---- apply the camera per frame, then assemble the GIF ------------------
console.log(`captured ${frameNo} frames, applying camera...`);
for (let i = 0; i < frameNo; i++) {
  const k = camTrack[i];
  let w = Math.round((VW / k.zoom) * DSF); let h = Math.round((VH / k.zoom) * DSF);
  w -= w % 2; h -= h % 2;
  let x = Math.round(k.cx * DSF - w / 2); let y = Math.round(k.cy * DSF - h / 2);
  x = Math.max(0, Math.min(VW * DSF - w, x));
  y = Math.max(0, Math.min(VH * DSF - h, y));
  const name = `f${String(i).padStart(4, '0')}.png`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(rawDir, name),
    '-vf', `crop=${w}:${h}:${x}:${y},scale=${OUT_W}:${OUT_H}:flags=lanczos`,
    path.join(camDir, name)]);
}

const out = path.join(root, 'docs', 'images', 'demo.gif');
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(camDir, 'f%04d.png'),
  '-vf', `fps=${FPS},split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=bayer:bayer_scale=5`,
  out,
]);
fs.rmSync(rawDir, { recursive: true, force: true });
fs.rmSync(camDir, { recursive: true, force: true });
const size = fs.statSync(out).size;
console.log(`written: ${out} (${(size / 1024 / 1024).toFixed(2)} MB, ${frameNo} frames @ ${FPS}fps)`);
