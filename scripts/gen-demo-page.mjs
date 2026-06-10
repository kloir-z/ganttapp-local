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
const zipBuf = fs.readFileSync(path.join(root, 'public', 'samples', '[サンプル]コーポレートサイトリニューアルプロジェクト.zip'));
const zip = await JSZip.loadAsync(zipBuf);
const entry = Object.values(zip.files).find((f) => f.name.endsWith('.json'));
const pj = JSON.parse(await entry.async('string'));

console.log('dateRange:', JSON.stringify(pj.dateRange));
pj.wbsWidth = 430;
pj.cellWidth = 10;

const html = fs.readFileSync(path.join(root, 'dist-single', 'index.html'), 'utf8');
const payload = JSON.stringify(pj).replace(/</g, '\\u003c');
const tag = `<script type="application/json" id="gantt-embedded-project-data">${payload}</script>`;
// '</head>' also appears inside the inlined JS bundle, so anchor on the root
// div (unique) and insert the data script just before it.
const anchor = '<div id="root">';
if (html.split(anchor).length !== 2) throw new Error('anchor not unique');
const out = html.replace(anchor, `${tag}${anchor}`);
fs.writeFileSync(path.join(root, 'dist-single', 'demo.html'), out);
console.log('written: dist-single/demo.html');
