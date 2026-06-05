import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { RootState, setMessageInfo } from '../reduxStoreAndSlices/store';
import { setIsExporting } from '../reduxStoreAndSlices/uiFlagSlice';
import { useTranslation } from 'react-i18next';

// Browsers cap canvas dimensions/area; keep the rendered bitmap under this on the
// longest side so very large charts still produce a valid image.
const MAX_CANVAS_SIDE = 12000;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const useGanttPdfExport = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const title = useSelector((state: RootState) => state.baseSettings.title);

  const exportPdf = useCallback(async () => {
    // Switch the Gantt into full-render mode so every row/date is in the DOM, then
    // give ReactGrid (the left table) time to render all rows for the tall container.
    dispatch(setIsExporting(true));
    try {
      await nextFrame();
      await nextFrame();
      // ReactGrid (left table) virtualizes against its scroll viewport and won't
      // render every row just because the container grew. Nudge it to re-measure
      // the now-full-height container so all rows render before the snapshot.
      window.dispatchEvent(new Event('resize'));
      await nextFrame();
      await delay(700);

      const root = document.getElementById('gantt-export-root');
      if (!root) throw new Error('Export target not found');

      // Use the explicit box size (offset*) rather than scroll* — the export root is
      // overflow:hidden and cropped, but scrollWidth would still include the clipped
      // full-width grid behind it.
      const width = root.offsetWidth;
      const height = root.offsetHeight;
      const scale = Math.min(2, MAX_CANVAS_SIDE / Math.max(width, height));
      const renderScale = scale > 0 ? scale : 1;

      // The blank (hidden) top bar sits above the calendar; crop it so the title
      // band sits right against the chart instead of leaving a big gap.
      const calendarPane = document.getElementById('gantt-calendar-pane');
      const topOffset = calendarPane ? calendarPane.offsetTop : 0;

      const canvas = await html2canvas(root, {
        backgroundColor: '#ffffff',
        scale: renderScale,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        useCORS: true,
        onclone: (clonedDoc) => {
          // Hide things that shouldn't appear in the PDF: per-row note icons and
          // the left table's blue selection/focus frame.
          clonedDoc.querySelectorAll('.row-note-icon').forEach((el) => {
            (el as HTMLElement).style.display = 'none';
          });
          clonedDoc
            .querySelectorAll('.rg-cell-focus, .rg-partial-area, .rg-fill-handle, .rg-touch-fill-handle')
            .forEach((el) => {
              (el as HTMLElement).style.display = 'none';
            });
        },
      });

      dispatch(setIsExporting(false));

      // Compose a title band above the captured chart so the PDF is labeled,
      // cropping the blank top-bar area for a tighter layout.
      const titleText = title || 'Gantt Chart';
      const bandHeight = Math.round(38 * renderScale);
      const cropTop = Math.round(topOffset * renderScale);
      const visibleHeight = Math.max(0, canvas.height - cropTop);
      const composed = document.createElement('canvas');
      composed.width = canvas.width;
      composed.height = visibleHeight + bandHeight;
      const ctx = composed.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, composed.width, composed.height);
        ctx.fillStyle = '#222222';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.round(24 * renderScale)}px "Segoe UI", "Hiragino Sans", "Meiryo", sans-serif`;
        ctx.fillText(titleText, Math.round(16 * renderScale), Math.round(bandHeight / 2));
        ctx.drawImage(canvas, 0, cropTop, canvas.width, visibleHeight, 0, bandHeight, canvas.width, visibleHeight);
      }

      const base = ctx ? composed : canvas;
      const imgData = base.toDataURL('image/png');
      if (process.env.NODE_ENV !== 'production') {
        (window as unknown as { __lastGanttExport?: string }).__lastGanttExport = imgData;
      }
      const orientation = base.width >= base.height ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [base.width, base.height],
        compress: true,
      });
      pdf.addImage(imgData, 'PNG', 0, 0, base.width, base.height);
      pdf.save(`${title || 'gantt'}.pdf`);

      dispatch(setMessageInfo({ message: t('PDF generated.'), severity: 'success' }));
    } catch (error) {
      const message = error instanceof Error
        ? t('PDF export failed: ') + error.message
        : t('PDF export failed. An unknown error occurred.');
      dispatch(setMessageInfo({ message, severity: 'error' }));
    } finally {
      dispatch(setIsExporting(false));
    }
  }, [dispatch, t, title]);

  // Dev-only: expose the export so headless tooling can trigger it directly.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as { __exportGanttPdf?: () => Promise<void> }).__exportGanttPdf = exportPdf;
    }
  }, [exportPdf]);

  return { exportPdf };
};
