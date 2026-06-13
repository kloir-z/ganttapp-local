// Build dist-single/demo.html: the single-file app with the corporate-site
// sample baked in via the embedded-data mechanism (same as HTML export),
// tuned for a 1200x675 demo recording (narrow WBS, chunky bars).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// DEMO_LANG=en builds the English demo page; anything else keeps the Japanese
// default. The two languages use different samples and write to different files
// so both GIFs can be regenerated independently.
const LANG = process.env.DEMO_LANG === 'en' ? 'en' : 'ja';
const SAMPLE = LANG === 'en'
  ? '[Sample]Software Product Launch.zip'
  : '[サンプル]コーポレートサイトリニューアルプロジェクト.zip';
const OUT_HTML = LANG === 'en' ? 'demo.en.html' : 'demo.html';

const zipBuf = fs.readFileSync(path.join(root, 'public', 'samples', SAMPLE));
const zip = await JSZip.loadAsync(zipBuf);
const entry = Object.values(zip.files).find((f) => f.name.endsWith('.json'));
const pj = JSON.parse(await entry.async('string'));

console.log(`lang: ${LANG} | sample: ${SAMPLE}`);
console.log('dateRange:', JSON.stringify(pj.dateRange));
pj.wbsWidth = 430;
pj.cellWidth = 10;

// The shipped English samples have no dependencies, so dragging a bar would not
// ripple anything — the whole point of scene 1. Chain every chart row after the
// first to its predecessor (after,-1 resolves to the previous chart row,
// skipping separators) so dragging the first bar cascades down the chain. This
// staging lives only in the throwaway demo page, never in the shipped sample.
if (LANG === 'en') {
  let firstChartSeen = false;
  let chained = 0;
  for (const id of Object.keys(pj.data)) {
    const row = pj.data[id];
    if (row.rowType !== 'Chart') continue;
    if (firstChartSeen) { row.dependency = 'after,-1,1'; chained++; }
    firstChartSeen = true;
  }
  console.log(`injected after,-1,1 into ${chained} chart rows`);
}

const html = fs.readFileSync(path.join(root, 'dist-single', 'index.html'), 'utf8');
const payload = JSON.stringify(pj).replace(/</g, '\\u003c');
const tag = `<script type="application/json" id="gantt-embedded-project-data">${payload}</script>`;
// '</head>' also appears inside the inlined JS bundle, so anchor on the root
// div (unique) and insert the data script just before it.
const anchor = '<div id="root">';
if (html.split(anchor).length !== 2) throw new Error('anchor not unique');
const out = html.replace(anchor, `${tag}${anchor}`);
fs.writeFileSync(path.join(root, 'dist-single', OUT_HTML), out);
console.log(`written: dist-single/${OUT_HTML}`);
