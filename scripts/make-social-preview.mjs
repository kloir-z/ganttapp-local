// Generate docs/images/social-preview.png (1280x640) for the GitHub social
// preview, composing the README screenshot with a headline. Re-run after
// updating the screenshot: `node scripts/make-social-preview.mjs`
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shot = fs.readFileSync(path.join(root, 'docs', 'images', 'screenshot.png')).toString('base64');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1280px; height: 640px; overflow: hidden;
    font-family: 'Segoe UI', 'Hiragino Kaku Gothic Pro', Meiryo, sans-serif;
    background: linear-gradient(160deg, #f4f8fc 0%, #e8f0f9 55%, #dce9f6 100%);
    display: flex; flex-direction: column; align-items: center;
  }
  .head { text-align: center; padding: 52px 60px 30px; }
  h1 { font-size: 52px; color: #1a3550; letter-spacing: 0.5px; }
  p.en { font-size: 25px; color: #3c5a78; margin-top: 14px; }
  p.ja { font-size: 20px; color: #57708c; margin-top: 8px; }
  .shot-wrap {
    width: 1120px; flex: 1; overflow: hidden;
    border-radius: 14px 14px 0 0;
    box-shadow: 0 12px 40px rgba(20, 50, 90, 0.28);
    border: 1px solid #c3d4e6; border-bottom: none;
  }
  .shot-wrap img { width: 100%; display: block; }
</style></head>
<body>
  <div class="head">
    <h1>Excel-like Gantt Chart</h1>
    <p class="en">Runs entirely in your browser — free, offline, your data never leaves your machine</p>
    <p class="ja">インストール不要・アカウント不要・データは外部送信されないガントチャート</p>
  </div>
  <div class="shot-wrap"><img src="data:image/png;base64,${shot}"></div>
</body></html>`;

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 640, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle0' });
const out = path.join(root, 'docs', 'images', 'social-preview.png');
await page.screenshot({ path: out });
await browser.close();
console.log('written:', out);
