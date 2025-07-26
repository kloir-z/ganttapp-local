import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { MenuItemProps, MenuItem } from '../MenuItem';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { setIsContextMenuOpen } from '../../reduxStoreAndSlices/uiFlagSlice';
import { closeAllSubMenus } from '../../reduxStoreAndSlices/subMenuSlice';

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
  targetRef: React.RefObject<HTMLElement>;
}

const ContextMenu: React.FC<ContextMenuProps> = memo(({ items, targetRef }) => {
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
      style={{ top: `${menuPosition.y}px`, left: `${menuPosition.x}px` }}
    >
      {items?.map((item, index) => (
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