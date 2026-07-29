import { RefObject, useEffect } from 'react';
import {
  isReactGridClipboardHtml,
  tileClipboardHtml,
  tileClipboardText,
} from '../components/Table/utils/pasteTiling';

export interface PasteRange {
  /** 貼り付け先として選択されている行ID(表示順) */
  rowIds: string[];
  /** 貼り付け先として選択されている列数 */
  columnCount: number;
}

/**
 * 選択範囲いっぱいに繰り返し貼り付ける(Excel ライク)ためのフック。
 *
 * ReactGrid はコピー元のブロックサイズぶんしか貼り付けないため、貼り付けイベントを
 * キャプチャ段階で横取りし、クリップボードの内容を選択範囲のサイズまで複製した
 * 新しい貼り付けイベントを同じ要素へ投げ直す。ReactGrid から見ると「最初から
 * 選択範囲ぴったりのデータがコピーされていた」のと同じ状態になるので、セルの型解決や
 * onCellsChanged 以降の処理(handleGridChanges / undo)は一切変わらない。
 *
 * @param containerRef ReactGrid を含むラッパー要素
 * @param getPasteRange 貼り付け先の選択範囲を返す(選択なしなら null)
 * @param onPaste 横取りした貼り付けごとに、その貼り付け先範囲を通知する
 *   (タイル化の有無によらず呼ぶ。貼り付けた行を依存計算から守るために使う)
 * @param enabled 履歴プレビュー中など編集不可のときは false
 */
export function useRangePasteFill(
  containerRef: RefObject<HTMLElement>,
  getPasteRange: () => PasteRange | null,
  onPaste: (range: PasteRange) => void,
  enabled = true
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    // 自分で投げ直したイベントを再度横取りしないための目印
    let reissuedEvent: ClipboardEvent | null = null;

    const handlePasteCapture = (event: ClipboardEvent) => {
      if (event === reissuedEvent) return;
      // セル選択中のフォーカスは ReactGrid の隠しinputが持つ。セル編集中(.rg-input)や
      // モーダル内の入力への貼り付けは通常のテキスト入力なので触らない。
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains('rg-hidden-element')) return;

      const pasteRange = getPasteRange();
      const clipboardData = event.clipboardData;
      if (!pasteRange || !clipboardData) return;

      // タイル化するかどうかに関わらず、この貼り付けが埋める範囲を知らせる
      onPaste(pasteRange);

      const pasteTarget = { rowCount: pasteRange.rowIds.length, columnCount: pasteRange.columnCount };
      const html = clipboardData.getData('text/html');
      const text = clipboardData.getData('text/plain');
      // ReactGrid 形式の HTML があるときは ReactGrid もそちらを読むので HTML 側を複製する
      const useHtml = isReactGridClipboardHtml(html);
      const tiledHtml = useHtml ? tileClipboardHtml(html, pasteTarget) : null;
      const tiledText = useHtml ? null : tileClipboardText(text, pasteTarget);
      if (!tiledHtml && !tiledText) return;

      let tiledEvent: ClipboardEvent;
      try {
        const dataTransfer = new DataTransfer();
        if (tiledHtml) dataTransfer.setData('text/html', tiledHtml);
        dataTransfer.setData('text/plain', tiledText ?? text);
        tiledEvent = new ClipboardEvent('paste', { clipboardData: dataTransfer, bubbles: true, cancelable: true });
      } catch {
        // ClipboardEvent を組み立てられない環境では既定の貼り付けに任せる
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      reissuedEvent = tiledEvent;
      try {
        target.dispatchEvent(tiledEvent);
      } finally {
        reissuedEvent = null;
      }
    };

    container.addEventListener('paste', handlePasteCapture, true);
    return () => container.removeEventListener('paste', handlePasteCapture, true);
  }, [containerRef, getPasteRange, onPaste, enabled]);
}
