import { RefObject, useEffect } from 'react';

/**
 * ExcelライクなIME(日本語)直接入力を実現するためのフック。
 *
 * ReactGridはセル選択中(編集モードに入る前)、フォーカスを `<input class="rg-hidden-element">`
 * という1px・opacity:0・画面中央(top/left:50%)固定の隠しinputで保持している。
 * 何もしないと、IME変換中の文字や変換候補ウィンドウはこの「画面中央の見えない1px」の中で
 * 起き、変換を確定して初めて compositionend 経由でセルに値が入る — つまり変換中はセルに何も
 * 見えない。
 *
 * このフックは compositionstart のあいだだけ、その隠しinputをフォーカス中のセル
 * (`.rg-cell-focus`)の真上へ移動・可視化する。これにより:
 *   - 変換中テキストがセルの中に下線付きで表示される
 *   - IMEの変換候補ウィンドウがセルの直下に出る
 * compositionend で元の隠し状態へ戻すと、確定文字を受け取った各CellTemplateの
 * handleCompositionEnd が本物のエディタ(.rg-celleditor)を同じ位置に出すので、ほぼ
 * 継ぎ目なく繋がる。
 *
 * 隠しinputには React 側で `style` プロップが付いていない(スタイルはCSSクラスのみ)ため、
 * ここでインラインstyleを上書きしても React の再レンダリングと競合しない。
 */
export function useImeCellOverlay(containerRef: RefObject<HTMLElement>): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // compositionstart 時点の元インラインstyleを保持し、終了時にそのまま戻す。
    let savedCssText: string | null = null;

    const isHiddenElement = (el: EventTarget | null): el is HTMLInputElement =>
      el instanceof HTMLElement && el.classList.contains('rg-hidden-element');

    const restore = (hidden: HTMLElement) => {
      if (savedCssText !== null) {
        hidden.style.cssText = savedCssText;
        savedCssText = null;
      }
    };

    const handleCompositionStart = (e: Event) => {
      const hidden = e.target;
      if (!isHiddenElement(hidden)) return;
      const focusedCell = container.querySelector<HTMLElement>('.rg-cell-focus');
      if (!focusedCell) return;

      // 隠しinputには前回確定したテキストが value として残っており、可視化した瞬間に
      // それが一瞬表示されてしまう(変換すると新しい文字だけが入る)。表示前にクリアする。
      hidden.value = '';

      const rect = focusedCell.getBoundingClientRect();
      const cs = window.getComputedStyle(focusedCell);

      savedCssText = hidden.style.cssText;
      // フォーカスセルの矩形にぴったり重ね、本物のエディタ(.rg-celleditor: 2px primaryの
      // 枠 + padding 0 4px)に近い見た目にして確定時の段差を抑える。
      Object.assign(hidden.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: '0',
        padding: '0 4px',
        opacity: '1',
        zIndex: '5',
        boxSizing: 'border-box',
        border: '2px solid #3579f8',
        outline: 'none',
        background: '#ffffff',
        color: cs.color || '#000000',
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        textAlign: cs.textAlign,
      } as Partial<CSSStyleDeclaration>);
    };

    const handleCompositionEnd = (e: Event) => {
      const hidden = e.target;
      if (!isHiddenElement(hidden)) return;
      restore(hidden);
    };

    // 変換キャンセル等で compositionend が来ないケースの保険。フォーカスが外れたら必ず戻す。
    const handleBlur = (e: Event) => {
      const hidden = e.target;
      if (!isHiddenElement(hidden)) return;
      restore(hidden);
    };

    container.addEventListener('compositionstart', handleCompositionStart);
    container.addEventListener('compositionend', handleCompositionEnd);
    container.addEventListener('blur', handleBlur, true);
    return () => {
      container.removeEventListener('compositionstart', handleCompositionStart);
      container.removeEventListener('compositionend', handleCompositionEnd);
      container.removeEventListener('blur', handleBlur, true);
    };
  }, [containerRef]);
}
