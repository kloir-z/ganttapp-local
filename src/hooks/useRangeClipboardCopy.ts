import { RefObject, useEffect } from 'react';
import { ClipboardCell, buildClipboardHtml, buildClipboardTsv } from '../components/Table/utils/clipboardCopy';

/**
 * 選択範囲のコピー/切り取りで、タブ区切りのプレーンテキストも一緒にクリップボードへ載せるフック。
 *
 * ReactGrid は text/plain にコピー用テーブルの textContent(区切り文字なしの連結)を書くため、
 * メモ帳などアプリ外へ貼ると全セルが1行につながってしまう。ここでコピーイベントを
 * キャプチャ段階で横取りし、行=改行・列=タブのプレーンテキストと、ReactGrid と同じ形式の
 * text/html(セルの型情報つき)を自前で書き込む。アプリ内への貼り戻しは HTML 側を読むので
 * 従来どおり動く。
 *
 * @param containerRef ReactGrid を含むラッパー要素
 * @param getCopyCells コピー対象(選択範囲のセルを表示順の2次元配列で返す。無ければ null)
 * @param enabled 無効にすると ReactGrid の既定動作に任せる
 */
export function useRangeClipboardCopy(
  containerRef: RefObject<HTMLElement>,
  getCopyCells: () => ClipboardCell[][] | null,
  enabled = true
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    // 自分で投げ直したイベントを再度横取りしないための目印
    let reissuedEvent: ClipboardEvent | null = null;

    const handleCopyCapture = (event: ClipboardEvent) => {
      if (event === reissuedEvent) return;
      // セル選択中のフォーカスは ReactGrid の隠しinputが持つ。セル編集中や
      // モーダル内の入力のコピーは通常のテキストコピーなので触らない。
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains('rg-hidden-element')) return;

      const clipboardData = event.clipboardData;
      if (!clipboardData) return;
      const cells = getCopyCells();
      if (!cells || cells.length === 0 || cells[0].length === 0) return;

      clipboardData.setData('text/html', buildClipboardHtml(cells));
      clipboardData.setData('text/plain', buildClipboardTsv(cells));
      event.preventDefault();
      event.stopPropagation();

      if (event.type === 'cut') {
        // 切り取りのセル消去は ReactGrid に任せる(合成イベントを投げ直す)。
        // ただし ReactGrid はクリップボードを navigator.clipboard.write で
        // 上書きしてしまうため、その間だけ write を無効化する。
        let cutEvent: ClipboardEvent;
        try {
          cutEvent = new ClipboardEvent('cut', { clipboardData: new DataTransfer(), bubbles: true, cancelable: true });
        } catch {
          return;
        }
        const clipboard = navigator.clipboard as (Clipboard & { write?: unknown }) | undefined;
        const originalWrite = clipboard?.write;
        if (clipboard && originalWrite) {
          (clipboard as unknown as { write: unknown }).write = () => Promise.resolve();
        }
        reissuedEvent = cutEvent;
        try {
          target.dispatchEvent(cutEvent);
        } finally {
          reissuedEvent = null;
          if (clipboard && originalWrite) {
            (clipboard as unknown as { write: unknown }).write = originalWrite;
          }
        }
      }
    };

    container.addEventListener('copy', handleCopyCapture, true);
    container.addEventListener('cut', handleCopyCapture, true);
    return () => {
      container.removeEventListener('copy', handleCopyCapture, true);
      container.removeEventListener('cut', handleCopyCapture, true);
    };
  }, [containerRef, getCopyCells, enabled]);
}
