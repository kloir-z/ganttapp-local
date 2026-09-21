import React, { useState, useEffect, useLayoutEffect, useRef, memo, useCallback } from 'react';
import { MenuItemProps, MenuItem } from '../MenuItem';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { setIsContextMenuOpen } from '../../reduxStoreAndSlices/uiFlagSlice';
import { closeAllSubMenus } from '../../reduxStoreAndSlices/subMenuSlice';
import LazyContextMenuItems, { LazyContextMenuOptions } from './LazyContextMenuItems';

const StyledMenu = styled.div`
  position: fixed;
  z-index: 1000;
  border: 1px solid #e6e6e6;
  background-color: #FFF;
  min-width: 100px;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
`;

interface ContextMenuProps {
  items?: MenuItemProps[];
  /**
   * items の代わりに渡すと、メニューが開いている間だけ useContextMenuOptions で項目を組み立てる。
   * チャートの行のように数が多いコンポーネントでは、閉じている間の計算と購読を省ける。
   */
  options?: LazyContextMenuOptions;
  targetRef: React.RefObject<HTMLElement>;
}

const ContextMenu: React.FC<ContextMenuProps> = memo(({ items, options, targetRef }) => {
  const dispatch = useDispatch();
  // anchor は右クリックした点、menuPosition は画面内に収めたあとの実際の位置。
  const [anchor, setAnchor] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [menuPosition, setMenuPosition] = useState<{ x: number, y: number, maxHeight?: number }>({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  // 項目は子(LazyContextMenuItems など)の再描画でも増減するので、その大きさの
  // 変化を拾って測り直すためのカウンタ。
  const [sizeVersion, setSizeVersion] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault();
    // position: fixed なのでビューポート座標(client*)で置く。位置の補正は描画後に
    // 実寸を測って行う(下の useLayoutEffect)。
    setAnchor({ x: event.clientX, y: event.clientY });
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setIsVisible(true);
    dispatch(setIsContextMenuOpen(true));
  }, [dispatch]);

  // メニューを実寸で画面内に収める。項目数は右クリックした場所や選択状態で変わるので、
  // 大きさを決め打ちにすると下側の項目が画面外に切れる。
  // - 右にはみ出すなら左へ寄せる
  // - 下にはみ出すなら、上に開く余地があれば(OS のメニューと同じく)クリック点の上へ、
  //   無ければ画面下端に合わせる
  // - 画面の高さ自体に収まらないときだけ最大高さを付けてスクロールさせる
  // 描画のたびに測り直すが、位置が変わらなければ state は更新しない。
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!isVisible || !menu) return;
    const margin = 4;
    const width = menu.offsetWidth;
    const naturalHeight = menu.scrollHeight;
    const available = window.innerHeight - margin * 2;
    const maxHeight = naturalHeight > available ? available : undefined;
    const height = Math.min(naturalHeight, available);
    let x = anchor.x;
    if (x + width > window.innerWidth - margin) {
      x = Math.max(margin, window.innerWidth - width - margin);
    }
    let y = anchor.y;
    if (y + height > window.innerHeight - margin) {
      y = anchor.y - height >= margin ? anchor.y - height : Math.max(margin, window.innerHeight - height - margin);
    }
    if (x !== menuPosition.x || y !== menuPosition.y || maxHeight !== menuPosition.maxHeight) {
      setMenuPosition({ x, y, maxHeight });
    }
  }, [anchor, isVisible, menuPosition, sizeVersion]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!isVisible || !menu || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => setSizeVersion(v => v + 1));
    observer.observe(menu);
    return () => observer.disconnect();
  }, [isVisible]);

  const closeMenu = useCallback(() => {
    dispatch(closeAllSubMenus());
    setIsVisible(false);
    dispatch(setIsContextMenuOpen(false));
  }, [dispatch]);

  useEffect(() => {
    const targetElement = targetRef.current;
    if (!targetElement) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };
    targetElement.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      targetElement.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [closeMenu, handleContextMenu, targetRef]);

  useEffect(() => {
    return () => {
      if (isVisible) {
        dispatch(setIsContextMenuOpen(false));
      }
    };
  }, [isVisible, dispatch]);

  return isVisible ? (
    <StyledMenu
      ref={menuRef}
      // チャートの上に浮いている UI の印。チャート側の「空白を押した」判定から除外され、
      // 矩形選択の開始やバー選択の解除が起きないようにする(メニュー操作の途中で
      // 選択が消えると、その再描画で項目が無効化されてしまう)。
      data-chart-overlay="true"
      style={{
        top: `${menuPosition.y}px`,
        left: `${menuPosition.x}px`,
        ...(menuPosition.maxHeight !== undefined ? { maxHeight: `${menuPosition.maxHeight}px`, overflowY: 'auto' } : {}),
      }}
    >
      {options ? (
        <LazyContextMenuItems options={options} closeMenu={closeMenu} />
      ) : items?.map((item, index) => (
        <MenuItem
          key={index}
          closeMenu={closeMenu}
          {...item}
        />
      ))}
    </StyledMenu>
  ) : null;
});

export default ContextMenu;