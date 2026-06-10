// Temporary verification: export the standalone HTML from the app, then open
// the exported file itself and confirm it boots with the CSP meta intact.
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

await page.goto(target, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 500));

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
  if (!pos) throw new Error(`not found: ${text}`);
  await page.mouse.move(pos.x, pos.y);
  await new Promise((r) => setTimeout(r, 600));
  await page.mouse.click(pos.x, pos.y);
  await new Promise((r) => setTimeout(r, 800));
};

await clickByText('ファイル');
await clickByText('エクスポート');
await clickByText('単体HTML');
let exported = null;
for (let i = 0; i < 20; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const files = fs.readdirSync(dlDir).filter((f) => f.endsWith('.html'));
  if (files.length) { exported = path.join(dlDir, files[0]); break; }
}
if (!exported) throw new Error('export did not produce an html file');

const page2 = await browser.newPage();
await page2.evaluateOnNewDocument(() => {
  window.__cspViolations = [];
  document.addEventListener('securitypolicyviolation', (e) => {
    window.__cspViolations.push(`${e.violatedDirective} <- ${e.blockedURI}`);
  });
});
await page2.goto('file:///' + exported.replace(/\\/g, '/'), { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 3000));
const result = await page2.evaluate(() => ({
  rootLen: document.getElementById('root')?.innerHTML.length ?? 0,
  cspMeta: document.querySelector('meta[http-equiv="Content-Security-Policy" i]')?.getAttribute('content') ?? null,
  violations: window.__cspViolations,
}));
console.log('exported file boots, root length:', result.rootLen);
console.log('CSP meta in exported file:', result.cspMeta ? 'present' : 'MISSING');
console.log('violations:', result.violations.length ? result.violations : 'none');
await browser.close();
fs.rmSync(dlDir, { recursive: true, force: true });
if (result.rootLen < 1000 || !result.cspMeta || result.violations.length) {
  console.error('FAIL');
  process.exit(1);
}
console.log('PASS');
