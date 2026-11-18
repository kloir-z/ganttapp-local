// Self-contained HTML snapshot export.
//
// Produces a single .html file that embeds both the running application and the
// current project data. Opening the file boots the app and auto-loads the data,
// so the recipient sees the finished Gantt chart (and can scroll/edit/view notes)
// without any server — ideal for the single-file build opened via file://.
// Writing the file (download or overwrite save) lives in projectSave.ts.
//
// The exported data is read back on startup by `readEmbeddedProjectData` (see
// LocalApp), which feeds it through the normal import path.

import type { ProjectData } from './ExportImportHandler';

// Id of the <script> tag that carries the embedded project JSON.
export const EMBEDDED_DATA_SCRIPT_ID = 'gantt-embedded-project-data';

// Read the embedded project data injected into this document by a previous
// HTML export. Returns null when the document was not produced by buildProjectHtml.
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
    // From file:// a fetch is always blocked (and logs a console error each time — now on
    // every Ctrl+S), so drop the link without trying.
    if (location.protocol === 'file:') {
      icon.remove();
      continue;
    }
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

// Build a self-contained HTML document of the current app with `projectData`
// baked in. Used both for "Export ▸ HTML" (download) and for overwrite-saving
// to an HTML file.
export const buildProjectHtml = async (projectData: ProjectData): Promise<string> => {
  // Clone the live DOM rather than the static template so all runtime-inlined
  // assets (the single-file build) come along for free.
  const clone = document.documentElement.cloneNode(true) as HTMLElement;

  // Keep the build-time CSP meta (injected by vite.config.ts) in the export:
  // the policy allows inline scripts but no external hosts, so the exported
  // file inherits the same "cannot phone home" guarantee as the app itself.

  // Boot fresh: the exported app rebuilds the UI from the embedded data.
  const root = clone.querySelector('#root');
  if (root) root.innerHTML = '';
  // Menus, dialogs and snackbars render into portals directly under <body>. The
  // source document's body holds only #root (and scripts), so drop everything
  // else — otherwise a save from an open dialog (Ctrl+S) would bake it in as dead HTML.
  const body = clone.querySelector('body');
  if (body) {
    for (const child of Array.from(body.children)) {
      if (child.id !== 'root' && child.tagName !== 'SCRIPT') child.remove();
    }
  }

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

  return `<!DOCTYPE html>\n${clone.outerHTML}`;
};

// Read the project data embedded in a saved HTML file's text (the counterpart of
// buildProjectHtml, for files on disk rather than the running document).
export const readEmbeddedProjectDataFromHtml = (html: string): Partial<ProjectData> | null => {
  const match = html.match(new RegExp(`<script[^>]*id="${EMBEDDED_DATA_SCRIPT_ID}"[^>]*>([\\s\\S]*?)</script>`));
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as Partial<ProjectData>;
  } catch {
    return null;
  }
};

export const htmlFileNameForTitle = (title: string): string =>
  `${(title || 'gantt-chart').replace(/[\\/:*?"<>|]/g, '_')}.html`;
