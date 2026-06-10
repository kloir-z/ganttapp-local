// Temporary verification: open the single-file build via file:// under the
// new CSP and confirm the app boots without CSP violations.
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = 'file:///' + path.join(root, 'dist-single', 'index.html').replace(/\\/g, '/');

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();

const violations = [];
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
await page.evaluateOnNewDocument(() => {
  window.__cspViolations = [];
  document.addEventListener('securitypolicyviolation', (e) => {
    window.__cspViolations.push(`${e.violatedDirective} <- ${e.blockedURI}`);
  });
});

await page.goto(target, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 3000));

const rootHtmlLen = await page.evaluate(() => document.getElementById('root')?.innerHTML.length ?? 0);
const pageViolations = await page.evaluate(() => window.__cspViolations);
violations.push(...pageViolations);

// Exercise undo/redo-heavy UI a little: open the File menu if present.
const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200));

console.log('root innerHTML length:', rootHtmlLen);
console.log('CSP violations:', violations.length ? violations : 'none');
console.log('console errors:', consoleErrors.length ? consoleErrors : 'none');
console.log('body text head:', JSON.stringify(bodyText));

await browser.close();
if (rootHtmlLen < 1000) {
  console.error('FAIL: app did not render');
  process.exit(1);
}
if (violations.length) {
  console.error('FAIL: CSP violations detected');
  process.exit(1);
}
console.log('PASS');
