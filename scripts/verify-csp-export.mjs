// Temporary verification: exercise PDF / Excel / HTML export from the UI under
// the new CSP and confirm no CSP violations and that downloads are produced.
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = 'file:///' + path.join(root, 'dist-single', 'index.html').replace(/\\/g, '/');
const dlDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gantt-dl-'));

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const client = await page.createCDPSession();
await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dlDir });

await page.evaluateOnNewDocument(() => {
  window.__cspViolations = [];
  document.addEventListener('securitypolicyviolation', (e) => {
    window.__cspViolations.push(`${e.violatedDirective} <- ${e.blockedURI || e.sourceFile}`);
  });
});

await page.goto(target, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

// Close the welcome modal if present (click somewhere safe / press Escape).
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 500));

// Find the deepest visible element whose own text starts with `text`
// (menu items may carry a trailing ▸ arrow), return its center.
const findByText = (text) =>
  page.evaluate((t) => {
    const els = Array.from(document.querySelectorAll('div, span, li, button, a')).filter((e) => {
      if (e.offsetParent === null) return false;
      const s = e.textContent.trim();
      return s === t || (s.startsWith(t) && s.length <= t.length + 2);
    });
    const el = els[els.length - 1];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, text);

const clickByText = async (text) => {
  const pos = await findByText(text);
  if (!pos) return false;
  await page.mouse.move(pos.x, pos.y); // hover opens submenus
  await new Promise((r) => setTimeout(r, 600));
  await page.mouse.click(pos.x, pos.y);
  await new Promise((r) => setTimeout(r, 800));
  return true;
};

const runExport = async (label) => {
  const before = fs.readdirSync(dlDir).length;
  if (!(await clickByText('ファイル'))) return `${label}: FILE MENU NOT FOUND`;
  if (!(await clickByText('エクスポート'))) return `${label}: EXPORT MENU NOT FOUND`;
  if (!(await clickByText(label))) return `${label}: ITEM NOT FOUND`;
  // PDF rasterization can take a while.
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const files = fs.readdirSync(dlDir).filter((f) => !f.endsWith('.crdownload'));
    if (files.length > before) return `${label}: OK -> ${files.join(', ')}`;
  }
  return `${label}: NO DOWNLOAD within 30s`;
};

const results = [];
for (const label of ['PDF', 'Excel', '単体HTML']) {
  results.push(await runExport(label));
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 500));
}

const violations = await page.evaluate(() => window.__cspViolations);
console.log(results.join('\n'));
console.log('CSP violations:', violations.length ? violations : 'none');
await browser.close();
fs.rmSync(dlDir, { recursive: true, force: true });
if (violations.length) process.exit(1);
