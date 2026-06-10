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
// visualOnly: glide the drawn cursor without moving the real mouse — used
// around menu interactions because Chromium (at deviceScaleFactor 2)
// re-dispatches a synthesized mousemove at HALVED coordinates after layout
// changes; if that lands on another top-bar button while a menu is open,
// the open menu switches. Real input for those steps is sent as synthetic
// DOM events instead, with the real mouse parked somewhere harmless.
const animate = async (n, { cursorTo, camTo, visualOnly } = {}) => {
  const c0 = { ...cur }; const k0 = { ...cam };
  for (let i = 1; i <= n; i++) {
    const t = ease(i / n);
    if (cursorTo) {
      cur.x = lerp(c0.x, cursorTo.x, t); cur.y = lerp(c0.y, cursorTo.y, t);
      if (!visualOnly) await page.mouse.move(cur.x, cur.y);
    }
    if (camTo) {
      cam.cx = lerp(k0.cx, camTo.cx, t); cam.cy = lerp(k0.cy, camTo.cy, t);
      cam.zoom = lerp(k0.zoom, camTo.zoom, t);
    }
    await shot();
  }
};
// A spot that is inert both as-is and when Chromium halves it (calendar
// header / top-bar title area — no hover effects at either point).
const parkRealMouse = () => page.mouse.move(1185, 40);

// Diagnostic: timestamped trace of pointer events on top-bar buttons and
// menu mount/unmount, dumped when a scene-2 step fails.
await page.evaluate(() => {
  window.__evlog = [];
  const t0 = performance.now();
  const log = (m) => window.__evlog.push(`${Math.round(performance.now() - t0)}ms ${m}`);
  for (const type of ['mousedown', 'mouseup', 'mouseenter', 'click']) {
    document.addEventListener(type, (e) => {
      const el = e.target;
      if (el.tagName === 'BUTTON' || type !== 'mouseenter') {
        log(`${type} ${el.tagName} "${(el.textContent || '').trim().slice(0, 12)}" @${Math.round(e.clientX)},${Math.round(e.clientY)}`);
      }
    }, true);
  }
  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1 && n.textContent && /チャート設定|やり直す/.test(n.textContent)) {
          log(`MENU MOUNTED: "${n.textContent.trim().slice(0, 30)}"`);
        }
      }
      for (const n of m.removedNodes) {
        if (n.nodeType === 1 && n.textContent && /チャート設定|やり直す/.test(n.textContent)) {
          log(`MENU REMOVED: "${n.textContent.trim().slice(0, 30)}"`);
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
});
const dumpLog = async (why) => {
  console.log(`--- ${why} ---`);
  console.log((await page.evaluate(() => window.__evlog.slice(-60))).join('\n'));
  await page.screenshot({ path: path.join(root, 'scripts', 'fail-state.png') });
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
const press = async () => {
  await page.mouse.down(); cur.pressed = true;
  rippleStart = frameNo; ripplePos = { x: cur.x, y: cur.y };
};
const release = async () => { await page.mouse.up(); cur.pressed = false; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = async () => {
  rippleStart = frameNo; ripplePos = { x: cur.x, y: cur.y };
  await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(120);
};
// Deepest visible element matching `text` (menu items may have a ▸ suffix);
// retries because menus render asynchronously after the opening click.
const findRect = async (text, { tag = 'button, div, span, li', tries = 8 } = {}) => {
  for (let i = 0; i < tries; i++) {
    const p = await page.evaluate((t, sel) => {
      const els = Array.from(document.querySelectorAll(sel)).filter((e) => {
        if (e.offsetParent === null) return false;
        const s = e.textContent.trim();
        return s === t || (s.startsWith(t) && s.length <= t.length + 2);
      });
      const el = els[els.length - 1];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, text, tag);
    if (p) return p;
    await sleep(250);
  }
  return null;
};

// ---- scene 1: drag a bar, dependents ripple -----------------------------
// The camera stays fixed while dragging (only the cursor and bars move) so
// inter-frame deltas stay small and the GIF compresses well; camera motion
// is confined to the short zoom-in/out transitions.
await page.evaluate((c) => window.__setCursor(c.x, c.y, false), cur);
await hold(8);                                                         // wide
await animate(16, { cursorTo: bar, camTo: { ...focus, zoom: ZOOM } }); // zoom in
await hold(2);
await press();
await hold(4);
await animate(30, { cursorTo: { x: bar.x + 100, y: bar.y } });         // drag right
await hold(6);
await animate(30, { cursorTo: { x: bar.x, y: bar.y } });               // drag back
await release();
rippleStart = frameNo; ripplePos = { x: bar.x, y: bar.y };
await hold(4);
await animate(14, { camTo: { cx: VW / 2, cy: VH / 2, zoom: 1 } });     // zoom out
await hold(6);

// ---- scene 2: live chart-color editing ----------------------------------
// The top-bar menu open/close races against real-mouse event timing when
// frames are being captured between steps, so the cursor GLIDES for the
// visuals but the menu itself is driven by synthetic DOM events (reliable).
const fakeClick = () => { rippleStart = frameNo; ripplePos = { x: cur.x, y: cur.y }; };
await parkRealMouse();
let p = await findRect('設定', { tag: 'button' });
await animate(10, { cursorTo: p, visualOnly: true });
fakeClick();
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === '設定');
  btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
});
await hold(3);
p = await findRect('チャート設定');
if (!p) { await dumpLog('menu item not found'); throw new Error('chart settings menu item not found'); }
await animate(8, { cursorTo: p, visualOnly: true });
fakeClick();
await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('div')).filter((e) => e.textContent.trim() === 'チャート設定');
  els[els.length - 1].click();
});
await hold(4);

// The settings modal opens over the chart; drag it to the bottom-left so the
// colored bars stay visible while picking.
const findModal = () => page.evaluate(() => {
  const input = Array.from(document.querySelectorAll('input')).find((i) => i.value === 'ABC');
  if (!input) return null;
  let el = input;
  while (el.parentElement) {
    el = el.parentElement;
    if (el.style.left && el.style.top && getComputedStyle(el).position === 'absolute') break;
  }
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
let modal = null;
for (let i = 0; i < 10 && !modal; i++) { modal = await findModal(); if (!modal) await sleep(300); }
if (!modal) {
  await dumpLog('modal not found');
  throw new Error('settings modal not found (see scripts/fail-state.png)');
}
const grip = { x: modal.x + modal.w / 2, y: modal.y + 10 };
const target = { x: 12, y: Math.max(40, VH - modal.h - 14) };
await animate(8, { cursorTo: grip, visualOnly: true });
await page.mouse.move(grip.x, grip.y); // real mouse joins for the actual drag
await press();
await hold(2);
await animate(12, { cursorTo: { x: grip.x + (target.x - modal.x), y: grip.y + (target.y - modal.y) } });
await release();
await hold(3);

// Open the picker on the ABC palette color (the pink planned bars).
const swatch = await page.evaluate(() => {
  const input = Array.from(document.querySelectorAll('input')).find((i) => i.value === 'ABC');
  const inner = input.parentElement.firstElementChild.firstElementChild;
  const r = inner.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await animate(8, { cursorTo: swatch, visualOnly: true });
fakeClick();
await page.evaluate(() => {
  const input = Array.from(document.querySelectorAll('input')).find((i) => i.value === 'ABC');
  input.parentElement.firstElementChild.firstElementChild.click();
});
await hold(3);

// Sweep the hue slider: grab at the current pink (~324deg) and glide to blue.
const hue = await page.evaluate(() => {
  const el = document.querySelector('.chrome-picker .hue-horizontal');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y + r.height / 2, w: r.width };
});
if (!hue) throw new Error('hue slider not found');
await animate(6, { cursorTo: { x: hue.x + hue.w * 0.9, y: hue.y }, visualOnly: true });
await page.mouse.move(hue.x + hue.w * 0.9, hue.y); // real mouse joins for the drag
await press();
await hold(2);
await animate(22, { cursorTo: { x: hue.x + hue.w * 0.45, y: hue.y } }); // bars recolor live (pink -> teal)
await hold(5);
await release();
await parkRealMouse();
await hold(4);

// Close the picker (click its backdrop), then the modal via its X button.
await animate(6, { cursorTo: { x: 900, y: 480 }, visualOnly: true });
fakeClick();
await page.evaluate(() => {
  document.querySelector('.chrome-picker')?.parentElement?.previousElementSibling?.click();
});
await hold(2);
const closeBtn = await page.evaluate(() => {
  const input = Array.from(document.querySelectorAll('input')).find((i) => i.value === 'ABC');
  let el = input;
  while (el.parentElement) {
    el = el.parentElement;
    if (el.style.left && el.style.top && getComputedStyle(el).position === 'absolute') break;
  }
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width - 13, y: r.y + 13 };
});
await animate(8, { cursorTo: closeBtn, visualOnly: true });
fakeClick();
await page.evaluate(() => {
  const input = Array.from(document.querySelectorAll('input')).find((i) => i.value === 'ABC');
  let el = input;
  while (el.parentElement) {
    el = el.parentElement;
    if (el.style.left && el.style.top && getComputedStyle(el).position === 'absolute') break;
  }
  el.querySelector('button')?.click();
});
await hold(6); // fade-out runs while we keep capturing
await animate(8, { cursorTo: { x: 620, y: 420 }, visualOnly: true }); // settle
await hold(12);

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
