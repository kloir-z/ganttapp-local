// ColorPickerPopover.tsx
// 色見本の下に出すカラーピッカー。設定モーダルは中身が伸びるとスクロールするため、
// モーダル内に絶対配置するとピッカーが切れてしまう。document.body へポータルして
// 画面座標で固定表示し、画面外へはみ出す場合は内側へ寄せる。
import { RefObject, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChromePicker, ColorResult } from 'react-color';

// ChromePicker のおおよそのサイズ(はみ出し判定用)
const PICKER_WIDTH = 225;
const PICKER_HEIGHT = 260;
const GAP = 4;

type Props = {
  anchorRef: RefObject<HTMLElement>;
  color: string;
  onChange: (color: ColorResult) => void;
  onClose: () => void;
};

const ColorPickerPopover: React.FC<Props> = ({ anchorRef, color, onChange, onClose }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const top = Math.max(GAP, Math.min(rect.bottom + GAP, window.innerHeight - PICKER_HEIGHT - GAP));
    const left = Math.max(GAP, Math.min(rect.left, window.innerWidth - PICKER_WIDTH - GAP));
    setPosition({ top, left });
  }, [anchorRef]);

  if (!position) return null;

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 9998 }}
        onClick={onClose}
      />
      <div
        style={{ position: 'fixed', top: `${position.top}px`, left: `${position.left}px`, zIndex: 9999 }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ChromePicker color={color} onChange={onChange} />
      </div>
    </>,
    document.body
  );
};

export default ColorPickerPopover;
