// Self-contained HTML snapshot export.
//
// Produces a single .html file that embeds both the running application and the
// current project data. Opening the file boots the app and auto-loads the data,
// so the recipient sees the finished Gantt chart (and can scroll/edit/view notes)
// without any server — ideal for the single-file build opened via file://.
//
// The exported data is read back on startup by `readEmbeddedProjectData` (see
// LocalApp), which feeds it through the normal import path.

import type { ProjectData } from './ExportImportHandler';

// Id of the <script> tag that carries the embedded project JSON.
export const EMBEDDED_DATA_SCRIPT_ID = 'gantt-embedded-project-data';

// Read the embedded project data injected into this document by a previous
// HTML export. Returns null when the document was not produced by exportProjectAsHtml.
export const readEmbeddedProjectData = (): ProjectData | null => {
  const el = document.getElementById(EMBEDDED_DATA_SCRIPT_ID);
  if (!el || !el.textContent) return null;
  try {
    return JSON.parse(el.textContent) as ProjectData;
  } catch (error) {
    console.error('Failed to parse embedded project data:', error);
    return null;
  }
};

// Fetch and inline every external <script src> / <link rel="stylesheet" href>
// so the cloned document is fully self-contained. In the single-file build there
// are no external references, so this is effectively a no-op. From a served build
// the assets are fetched same-origin and inlined.
const inlineExternalAssets = async (root: HTMLElement): Promise<void> => {
  const scripts = Array.from(root.querySelectorAll('script[src]'));
  for (const script of scripts) {
    const src = script.getAttribute('src');
    if (!src) continue;
    try {
      const res = await fetch(new URL(src, document.baseURI).href);
      if (!res.ok) continue;
      const code = await res.text();
      const inline = document.createElement('script');
      const type = script.getAttribute('type');
      if (type) inline.setAttribute('type', type);
      inline.textContent = code;
      script.replaceWith(inline);
    } catch (error) {
      console.warn('Could not inline script, leaving as external reference:', src, error);
    }
  }

  const links = Array.from(root.querySelectorAll('link[rel="stylesheet"][href]'));
  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href) continue;
    try {
      const res = await fetch(new URL(href, document.baseURI).href);
      if (!res.ok) continue;
      const css = await res.text();
      const style = document.createElement('style');
      style.textContent = css;
      link.replaceWith(style);
    } catch (error) {
      console.warn('Could not inline stylesheet, leaving as external reference:', href, error);
    }
  }

  // Inline the favicon as a data URI (or drop it) so an exported file opened via
  // file:// does not emit a noisy ERR_FILE_NOT_FOUND for a sibling icon file.
  const icons = Array.from(root.querySelectorAll('link[rel~="icon"][href]'));
  for (const icon of icons) {
    const href = icon.getAttribute('href');
    if (!href || href.startsWith('data:')) continue;
    try {
      const res = await fetch(new URL(href, document.baseURI).href);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const blob = await res.blob();
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      icon.setAttribute('href', dataUri);
    } catch (error) {
      // Cannot fetch (e.g. exporting from file://): drop the link entirely.
      console.warn('Could not inline favicon, removing it:', href, error);
      icon.remove();
    }
  }
};

const triggerDownload = (html: string, fileName: string): void => {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Build a self-contained HTML snapshot of the current app with `projectData`
// baked in, then download it as `<title>.html`.
export const exportProjectAsHtml = async (projectData: ProjectData, title: string): Promise<void> => {
  // Clone the live DOM rather than the static template so all runtime-inlined
  // assets (the single-file build) come along for free.
  const clone = document.documentElement.cloneNode(true) as HTMLElement;

  // Drop the runtime CSP meta tag (injected by react-helmet-async after mount).
  // If it were present at parse time in the exported file, `script-src 'self'`
  // would block the inlined bootstrap script. Helmet re-adds it at runtime.
  clone
    .querySelectorAll('meta[http-equiv="Content-Security-Policy" i]')
    .forEach((node) => node.remove());

  // Boot fresh: the exported app rebuilds the UI from the embedded data.
  const root = clone.querySelector('#root');
  if (root) root.innerHTML = '';

  // Avoid stacking embedded payloads when re-exporting an already-exported file.
  clone.querySelector(`#${EMBEDDED_DATA_SCRIPT_ID}`)?.remove();

  await inlineExternalAssets(clone);

  // Inject the project data as a non-executable JSON script. Escaping `<`
  // prevents a "</script>" inside note content from terminating the tag early;
  // "<" remains valid JSON inside string literals.
  const dataScript = document.createElement('script');
  dataScript.id = EMBEDDED_DATA_SCRIPT_ID;
  dataScript.type = 'application/json';
  dataScript.textContent = JSON.stringify(projectData).replace(/</g, '\\u003c');
  const head = clone.querySelector('head');
  (head ?? clone).appendChild(dataScript);

  const html = `<!DOCTYPE html>\n${clone.outerHTML}`;
  const safeTitle = (title || 'gantt-chart').replace(/[\\/:*?"<>|]/g, '_');
  triggerDownload(html, `${safeTitle}.html`);
};
