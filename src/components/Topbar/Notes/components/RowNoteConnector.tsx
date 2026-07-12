// RowNoteConnector.tsx
// メモ帳(Notesモーダル)で行メモ(Task Note)を表示しているとき、対象タスクの
// チャート上の位置からモーダルへ向かう矢印を描く。RowNoteButton のポップアップが
// 描くコネクタ(バー→ウィンドウ、矢頭がメモ側)と同じ見た目に合わせている。
// アンカーは各行のメモアイコン(data-row-note-anchor)。行が仮想化で画面外の
// 場合はアンカーが存在しないため、矢印は表示しない。
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface RowNoteConnectorProps {
  rowId: string;
}

const RowNoteConnector: React.FC<RowNoteConnectorProps> = ({ rowId }) => {
  // チャートのスクロールやウィンドウリサイズで再計測するためのカウンタ。
  const [, setTick] = useState(0);
  useEffect(() => {
    const update = () => setTick(t => t + 1);
    // capture=true でチャート内側のスクロールコンテナの scroll も拾う。
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, []);

  const anchorEl = document.querySelector(`[data-row-note-anchor="${CSS.escape(rowId)}"]`);
  const modalEl = document.getElementById('notes-modal');
  if (!anchorEl || !modalEl) return null;

  const a = anchorEl.getBoundingClientRect();
  const m = modalEl.getBoundingClientRect();
  const x1 = a.left + a.width / 2;
  const y1 = a.top + a.height / 2;
  // モーダル矩形上の最近点へ向けて線を引く(アンカーがモーダル内なら描かない)。
  const x2 = Math.max(m.left, Math.min(x1, m.right));
  const y2 = Math.max(m.top, Math.min(y1, m.bottom));
  if (x1 >= m.left && x1 <= m.right && y1 >= m.top && y1 <= m.bottom) return null;

  return createPortal(
    <svg
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9998 }}
    >
      <defs>
        <marker
          id="notesModalRowNoteArrow"
          markerWidth={12}
          markerHeight={12}
          refX={8}
          refY={4}
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill="#3579f8" />
        </marker>
      </defs>
      {/* バー側の起点に丸印、メモ帳側に矢頭(RowNoteButton のコネクタと同じ向き)。 */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#3579f8"
        strokeWidth={2}
        strokeOpacity={0.9}
        markerEnd="url(#notesModalRowNoteArrow)"
      />
      <circle cx={x1} cy={y1} r={3} fill="#3579f8" fillOpacity={0.9} />
    </svg>,
    document.body
  );
};

export default RowNoteConnector;
