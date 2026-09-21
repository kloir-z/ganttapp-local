import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
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
  const [menuPosition, setMenuPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault();
    const menuWidth = 150;
    const menuHeight = 204;
    let x = event.pageX;
    let y = event.pageY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight;
    }

    setIsVisible(true);
    setMenuPosition({ x, y });
    dispatch(setIsContextMenuOpen(true));
  }, [dispatch]);

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
      style={{ top: `${menuPosition.y}px`, left: `${menuPosition.x}px` }}
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