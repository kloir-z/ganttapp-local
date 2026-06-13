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

// DEMO_LANG=en records the English demo (English UI + English sample served as
// demo.en.html by gen-demo-page.mjs). All on-screen labels the storyboard reaches
// for — the dragged bar, the Setting button, the Chart settings item — and the
// output filename are switched here; the palette alias 'ABC' is the same in both
// samples so the color scene needs no per-language label.
const LANG = process.env.DEMO_LANG === 'en' ? 'en' : 'ja';
// depBarLabel / editDepItem / daysOffItem drive scenes 4 (dependency editing) and
// 5 (days-off). The English values are verified against the Software-Launch sample;
// the Japanese values are best-effort (the ja demo is not regenerated here, only en).
const L = LANG === 'en'
  ? { page: 'demo.en.html', barLabel: 'Conduct competitor analysis', settingBtn: 'Setting', chartItem: 'Chart', menuPat: 'Chart|Redo', out: 'demo.en.mp4',
      depBarLabel: 'Define target audience', editDepItem: 'Edit dependency', daysOffItem: 'Days Off', collapseSep: 'Go-to-Market Planning' }
  : { page: 'demo.html', barLabel: 'クライアント要件整理', settingBtn: '設定', chartItem: 'チャート設定', menuPat: 'チャート設定|やり直す', out: 'demo.mp4',
      depBarLabel: 'クライアント要件整理', editDepItem: '依存関係を編集', daysOffItem: '休日設定', collapseSep: '' };

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DSF });
await page.goto(`http://localhost:5050/${L.page}`, { waitUntil: 'networkidle0', timeout: 60000 });
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
await page.evaluate((menuPat) => {
  window.__evlog = [];
  const re = new RegExp(menuPat);
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
        if (n.nodeType === 1 && n.textContent && re.test(n.textContent)) {
          log(`MENU MOUNTED: "${n.textContent.trim().slice(0, 30)}"`);
        }
      }
      for (const n of m.removedNodes) {
        if (n.nodeType === 1 && n.textContent && re.test(n.textContent)) {
          log(`MENU REMOVED: "${n.textContent.trim().slice(0, 30)}"`);
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}, L.menuPat);
const dumpLog = async (why) => {
  console.log(`--- ${why} ---`);
  console.log((await page.evaluate(() => window.__evlog.slice(-60))).join('\n'));
  await page.screenshot({ path: path.join(root, 'scripts', 'fail-state.png') });
};

// ---- locate the target bar --------------------------------------------
const bar = await page.evaluate((barLabel) => {
  for (const el of document.querySelectorAll('div')) {
    const s = el.style;
    if (s.height === '21px' && s.left && s.width && el.offsetParent !== null) {
      const input = el.querySelector('input');
      if (input && input.value === barLabel) {
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
    }
  }
  return null;
}, L.barLabel);
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
let p = await findRect(L.settingBtn, { tag: 'button' });
await animate(10, { cursorTo: p, visualOnly: true });
fakeClick();
await page.evaluate((settingBtn) => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === settingBtn);
  btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
}, L.settingBtn);
await hold(3);
p = await findRect(L.chartItem);
if (!p) { await dumpLog('menu item not found'); throw new Error('chart settings menu item not found'); }
await animate(8, { cursorTo: p, visualOnly: true });
fakeClick();
await page.evaluate((chartItem) => {
  const els = Array.from(document.querySelectorAll('div')).filter((e) => e.textContent.trim() === chartItem);
  els[els.length - 1].click();
}, L.chartItem);
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

// Shared helpers for the remaining scenes. Discrete UI actions (menu items,
// stepper buttons, checkboxes, chevrons) are driven by synthetic DOM events for
// determinism — the fake cursor only GLIDES to them for the visuals — because at
// deviceScaleFactor 2 a real click can be followed by a halved-coordinate
// mousemove that lands on the wrong element (see the note on `animate`).
const findBarRect = (label) => page.evaluate((barLabel) => {
  for (const el of document.querySelectorAll('div')) {
    const s = el.style;
    if (s.height === '21px' && s.left && s.width && el.offsetParent !== null) {
      const input = el.querySelector('input');
      if (input && input.value === barLabel) {
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width };
      }
    }
  }
  return null;
}, label);
const clickItemByText = (text) => page.evaluate((t) => {
  const els = Array.from(document.querySelectorAll('div, span, button, li'))
    .filter((e) => e.offsetParent && e.textContent.trim() === t);
  els[els.length - 1]?.click();
}, text);
// Park over the WBS table body instead of the calendar: the date header has a
// followCursor "Current Column Width" tooltip that pops after ~500ms of hover,
// and parkRealMouse() sits right on it — which would leave the tooltip floating
// through the later (held) scenes. Both this point and its DSF2-halved echo land
// on inert grid cells.
const parkLow = () => page.mouse.move(200, 560);

// ---- scene 3: shrink the columns for a bird's-eye overview --------------
// Hover the date header and wheel: every day-column compresses, so half a year
// of timeline fits on screen at once. Then wheel back to the working width. A
// real hover is used (not synthetic) so the "Current Column Width" tooltip shows.
const calCenter = await page.evaluate(() => {
  const cell = document.querySelector('[data-index]');
  if (!cell) return { x: 700, y: 40 };
  let el = cell;
  for (let i = 0; i < 6 && el.parentElement; i++) { el = el.parentElement; if (el.getBoundingClientRect().width > 1500) break; }
  const r = el.getBoundingClientRect();
  return { x: 700, y: Math.round(r.y + r.height / 2) };
});
await animate(12, { cursorTo: calCenter, visualOnly: true });
await page.mouse.move(calCenter.x, calCenter.y); // real hover -> width tooltip
await hold(10);
for (let i = 0; i < 13; i++) { await page.mouse.wheel({ deltaY: 120 }); await sleep(30); await shot(); } // narrow to ~3.5px
await hold(16); // dwell on the overview
for (let i = 0; i < 13; i++) { await page.mouse.wheel({ deltaY: -120 }); await sleep(30); await shot(); } // restore to 10px
await parkLow(); // off the calendar so the width tooltip fades before the next scenes
await hold(8);

// ---- scene 4: edit one dependency; the whole downstream chain reschedules --
// Right-click a bar -> "Edit dependency" -> nudge the offset up; because every
// task is chained to its predecessor, pushing this one cascades all the bars and
// table dates below it in real time.
const depBar = await findBarRect(L.depBarLabel);
if (!depBar) throw new Error('dependency-edit bar not found');
await animate(14, { cursorTo: { x: depBar.x, y: depBar.y }, camTo: { cx: depBar.x + 90, cy: depBar.y + 150, zoom: 1.3 }, visualOnly: true });
await parkLow();
fakeClick();
await page.evaluate((label) => {
  for (const el of document.querySelectorAll('div')) {
    const s = el.style;
    if (s.height === '21px' && s.left && s.width && el.offsetParent !== null) {
      const input = el.querySelector('input');
      if (input && input.value === label) {
        const r = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
        return;
      }
    }
  }
}, L.depBarLabel);
await hold(4);
let p2 = await findRect(L.editDepItem);
if (!p2) { await dumpLog('edit-dependency item not found'); throw new Error('Edit dependency menu item not found'); }
await animate(8, { cursorTo: p2, visualOnly: true });
fakeClick();
await clickItemByText(L.editDepItem);
await hold(5);
// The Offset stepper is the LAST ▲ in the popover (a relative-target stepper
// precedes it). Click it repeatedly; bars slide right between clicks.
const upBtn = await page.evaluate(() => {
  const pop = document.querySelector('.dependency-builder');
  if (!pop) return null;
  const ups = Array.from(pop.querySelectorAll('button')).filter((b) => b.textContent.trim() === '▲');
  const up = ups[ups.length - 1];
  if (!up) return null;
  const r = up.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (!upBtn) { await dumpLog('offset stepper not found'); throw new Error('offset ▲ not found'); }
await animate(8, { cursorTo: upBtn, visualOnly: true });
for (let i = 0; i < 7; i++) {
  fakeClick();
  await page.evaluate(() => {
    const pop = document.querySelector('.dependency-builder');
    const ups = Array.from(pop.querySelectorAll('button')).filter((b) => b.textContent.trim() === '▲');
    ups[ups.length - 1].click();
  });
  await sleep(50);
  await hold(3);
}
await hold(4);
// Apply (the bold accent button), then zoom back out.
const applyBtn = await page.evaluate(() => {
  const pop = document.querySelector('.dependency-builder');
  const b = Array.from(pop.querySelectorAll('button')).find((x) => x.style.fontWeight === 'bold');
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await animate(8, { cursorTo: applyBtn, visualOnly: true });
fakeClick();
await page.evaluate(() => {
  const pop = document.querySelector('.dependency-builder');
  Array.from(pop.querySelectorAll('button')).find((x) => x.style.fontWeight === 'bold').click();
});
await hold(6);
await animate(12, { camTo: { cx: VW / 2, cy: VH / 2, zoom: 1 } });
await hold(6);

// ---- scene 5: change the days-off; the chart reshades those columns -------
await parkLow();
let p3 = await findRect(L.settingBtn, { tag: 'button' });
await animate(10, { cursorTo: p3, visualOnly: true });
fakeClick();
await page.evaluate((settingBtn) => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === settingBtn);
  btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
}, L.settingBtn);
await hold(3);
p3 = await findRect(L.daysOffItem);
if (!p3) { await dumpLog('days-off item not found'); throw new Error('Days Off menu item not found'); }
await animate(8, { cursorTo: p3, visualOnly: true });
fakeClick();
await clickItemByText(L.daysOffItem);
await hold(4);
// Locate the regular-days-off table (fixed 278px wide) and its modal wrapper.
const findDaysModal = () => page.evaluate(() => {
  const table = Array.from(document.querySelectorAll('table')).find((t) => (t.getAttribute('style') || '').includes('278px'));
  if (!table) return null;
  let el = table;
  while (el.parentElement) { el = el.parentElement; if (el.style.left && el.style.top && getComputedStyle(el).position === 'absolute') break; }
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
let dModal = null;
for (let i = 0; i < 10 && !dModal; i++) { dModal = await findDaysModal(); if (!dModal) await sleep(300); }
if (!dModal) { await dumpLog('days-off modal not found'); throw new Error('days-off modal not found'); }
// Drag it to the top-left so the chart columns to the right stay visible.
const dGrip = { x: dModal.x + dModal.w / 2, y: dModal.y + 10 };
const dDest = { x: 12, y: 58 };
await animate(8, { cursorTo: dGrip, visualOnly: true });
await page.mouse.move(dGrip.x, dGrip.y);
await press();
await hold(2);
await animate(12, { cursorTo: { x: dGrip.x + (dDest.x - dModal.x), y: dGrip.y + (dDest.y - dModal.y) } });
await release();
await parkLow();
await hold(3);
// Toggle Wednesday (column index 4: 0=swatch, 1=Sun … 7=Sat) on the 2nd
// (red-tinted) day-off set — every Wednesday column turns red. Re-query after
// the drag so coordinates are current.
const wedCell = await page.evaluate(() => {
  const table = Array.from(document.querySelectorAll('table')).find((t) => (t.getAttribute('style') || '').includes('278px'));
  const tr = table.querySelectorAll('tbody tr')[1];
  const td = tr.querySelectorAll('td')[4];
  const r = td.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await animate(8, { cursorTo: wedCell, visualOnly: true });
fakeClick();
await page.evaluate(() => {
  const table = Array.from(document.querySelectorAll('table')).find((t) => (t.getAttribute('style') || '').includes('278px'));
  table.querySelectorAll('tbody tr')[1].querySelectorAll('td')[4].click();
});
await hold(14); // chart reshades every Wednesday
// Close the days-off modal via its X.
const dClose = await page.evaluate(() => {
  const table = Array.from(document.querySelectorAll('table')).find((t) => (t.getAttribute('style') || '').includes('278px'));
  let el = table;
  while (el.parentElement) { el = el.parentElement; if (el.style.left && el.style.top && getComputedStyle(el).position === 'absolute') break; }
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width - 13, y: r.y + 13 };
});
await animate(8, { cursorTo: dClose, visualOnly: true });
fakeClick();
await page.evaluate(() => {
  const table = Array.from(document.querySelectorAll('table')).find((t) => (t.getAttribute('style') || '').includes('278px'));
  let el = table;
  while (el.parentElement) { el = el.parentElement; if (el.style.left && el.style.top && getComputedStyle(el).position === 'absolute') break; }
  el.querySelector('button')?.click();
});
await hold(6);

// ---- scene 6: collapse a section into a summary band, then expand it ------
// Click the section's chevron in the table; its child rows fold away and a grey
// summary bar spans the section's date range. Click again to expand.
const findChevron = (sepName) => page.evaluate((name) => {
  const spans = Array.from(document.querySelectorAll('span')).filter((s) => s.textContent.trim() === name && s.style.whiteSpace === 'nowrap');
  for (const span of spans) {
    const wrap = span.parentElement;
    const chev = wrap && wrap.firstElementChild;
    if (chev && chev !== span && chev.querySelector('svg')) {
      const r = chev.getBoundingClientRect();
      if (r.x < 420) return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; // table side only
    }
  }
  return null;
}, sepName);
const clickChevron = (sepName) => page.evaluate((name) => {
  const spans = Array.from(document.querySelectorAll('span')).filter((s) => s.textContent.trim() === name && s.style.whiteSpace === 'nowrap');
  for (const span of spans) {
    const wrap = span.parentElement;
    const chev = wrap && wrap.firstElementChild;
    if (chev && chev !== span && chev.querySelector('svg')) {
      const r = chev.getBoundingClientRect();
      if (r.x < 420) { chev.click(); return true; }
    }
  }
  return false;
}, sepName);
if (L.collapseSep) {
  const chev = await findChevron(L.collapseSep);
  if (!chev) { await dumpLog('separator chevron not found'); throw new Error('separator chevron not found'); }
  await animate(12, { cursorTo: chev, camTo: { cx: 470, cy: 250, zoom: 1.2 }, visualOnly: true });
  fakeClick();
  await clickChevron(L.collapseSep);
  await hold(12); // section folds; grey summary band appears
  fakeClick();
  await clickChevron(L.collapseSep);
  await hold(12); // section expands again
  await animate(10, { camTo: { cx: VW / 2, cy: VH / 2, zoom: 1 } });
  await hold(14);
}

await browser.close();

// ---- apply the camera per frame, then assemble the MP4 ------------------
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

const out = path.join(root, 'docs', 'images', L.out);
// H.264 MP4: yuv420p + even dimensions for universal playback (incl. GitHub's
// inline <video>); +faststart moves the moov atom up so it streams immediately.
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(camDir, 'f%04d.png'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-preset', 'slow',
  '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-movflags', '+faststart',
  out,
]);
fs.rmSync(rawDir, { recursive: true, force: true });
fs.rmSync(camDir, { recursive: true, force: true });
const size = fs.statSync(out).size;
console.log(`written: ${out} (${(size / 1024 / 1024).toFixed(2)} MB, ${frameNo} frames @ ${FPS}fps)`);
