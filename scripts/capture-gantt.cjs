// Headless capture harness for the Gantt PDF export.
// Loads the dev app, injects synthetic data (>100 rows), triggers the export hook,
// and saves the resulting PNG so the output can be inspected without a human.
//
// Usage: node scripts/capture-gantt.cjs [url] [rows]
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const URL = process.argv[2] || 'http://localhost:5174/ganttapp-local/';
const ROWS = parseInt(process.argv[3] || '150', 10);
const OUT_DIR = path.join(__dirname, 'out');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
  page.on('console', (m) => console.log('[page]', m.type(), m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  console.log('navigating to', URL);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait for the dev store hook to be exposed.
  await page.waitForFunction(() => !!window.__store, { timeout: 30000 });

  // Inject synthetic data.
  await page.evaluate((rows) => {
    const pad = (n) => String(n).padStart(2, '0');
    const day = (m, d) => `2026/${pad(m)}/${pad(d)}`;
    const data = {};
    let no = 1;
    for (let i = 0; i < rows; i++) {
      const id = 'row' + i;
      if (i % 20 === 0) {
        data[id] = { no: no++, id, rowType: 'Separator', displayName: 'Section ' + (i / 20 + 1), isCollapsed: false, level: 0 };
      } else {
        const m = (i % 2) + 1;
        const startD = (i % 24) + 1;
        const endD = Math.min(28, startD + 5);
        data[id] = {
          no: no++, id, rowType: 'Chart', displayName: 'Task ' + i + ' name', color: '#4a90d9',
          plannedStartDate: day(m, startD), plannedEndDate: day(m, endD), plannedDays: 6,
          actualStartDate: '', actualEndDate: '', dependentId: '', dependency: '',
          progress: String((i * 7) % 100), textColumn1: 'A' + i, textColumn2: '', textColumn3: '', isIncludeHolidays: false,
        };
      }
    }
    const s = window.__store;
    s.dispatch({ type: 'baseSettings/setTitle', payload: 'Headless Test Project' });
    s.dispatch({ type: 'baseSettings/setDateRange', payload: { startDate: '2026/01/01', endDate: '2026/03/31' } });
    s.dispatch({ type: 'wbsData/setEntireData', payload: data });
    s.dispatch({ type: 'uiFlags/setActiveModal', payload: null });
    s.dispatch({ type: 'uiFlags/setIsLoading', payload: false });
  }, ROWS);

  await new Promise((r) => setTimeout(r, 1500));

  // Reference screenshot of the live app.
  await page.screenshot({ path: path.join(OUT_DIR, 'app.png') });

  // Trigger the real export hook.
  const hasExport = await page.evaluate(() => typeof window.__exportGanttPdf === 'function');
  if (!hasExport) {
    console.log('ERROR: window.__exportGanttPdf not available');
    await browser.close();
    process.exit(2);
  }
  await page.evaluate(() => window.__exportGanttPdf());

  // Wait for the export to publish its PNG.
  await page.waitForFunction(() => !!window.__lastGanttExport, { timeout: 60000 });
  const dataUrl = await page.evaluate(() => window.__lastGanttExport);
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(OUT_DIR, 'export.png'), Buffer.from(base64, 'base64'));
  console.log('saved', path.join(OUT_DIR, 'export.png'), 'bytes:', base64.length);

  // Save cropped regions for detailed inspection (done in-page via canvas).
  const crops = await page.evaluate(async (du) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = du; });
    const mk = (sx, sy, sw, sh) => {
      const c = document.createElement('canvas');
      c.width = sw; c.height = sh;
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      return c.toDataURL('image/png');
    };
    return {
      topleft: mk(0, 0, Math.min(1000, img.width), Math.min(900, img.height)),
      boundary: mk(0, 0, Math.min(1400, img.width), Math.min(1600, img.height)),
      fullw: img.width, fullh: img.height,
    };
  }, dataUrl);
  for (const key of ['topleft', 'boundary']) {
    const b = crops[key].replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(OUT_DIR, `crop_${key}.png`), Buffer.from(b, 'base64'));
  }
  console.log('image size:', crops.fullw, 'x', crops.fullh);

  // Crop the top-left and bottom-left of the final image so the table header and the
  // last rows can be inspected for completeness and alignment.
  const tails = await page.evaluate(async () => {
    const load = (du) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = du; });
    const crop = (img, sx, sy, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, sx, sy, w, h, 0, 0, w, h); return c.toDataURL('image/png'); };
    const img = await load(window.__lastGanttExport);
    return {
      topleft: crop(img, 0, 0, Math.min(1000, img.width), Math.min(900, img.height)),
      bottomleft: crop(img, 0, Math.max(0, img.height - 700), Math.min(1600, img.width), Math.min(700, img.height)),
    };
  });
  for (const [name, du] of Object.entries(tails)) {
    const b = du.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(OUT_DIR, `crop_${name}.png`), Buffer.from(b, 'base64'));
  }

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
