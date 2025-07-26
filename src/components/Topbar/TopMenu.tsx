import React, { useEffect, useRef, memo, useCallback, useMemo } from 'react';
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
  menuType: string;
  items?: MenuItemProps[];
  targetRef: React.RefObject<HTMLElement>;
  visibleMenu: string | null;
  setVisibleMenu: React.Dispatch<React.SetStateAction<string | null>>;
}

const ContextMenu: React.FC<ContextMenuProps> = memo(({ menuType, items, targetRef, visibleMenu, setVisibleMenu }) => {
  const dispatch = useDispatch();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuPosition = useMemo(() => {
    const targetElement = targetRef.current;
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      return { x: rect.left, y: rect.bottom };
    }
    return { x: 0, y: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRef, visibleMenu]);

  const closeMenu = useCallback(() => {
    dispatch(closeAllSubMenus());
    setVisibleMenu(null);
    dispatch(setIsContextMenuOpen(false));
  }, [dispatch, setVisibleMenu]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (visibleMenu) {
      closeMenu();
    } else {
      setVisibleMenu(menuType);
      dispatch(setIsContextMenuOpen(true));
    }
  }, [closeMenu, dispatch, menuType, setVisibleMenu, visibleMenu]);

  const handleMouseEnter = useCallback(() => {
    if (visibleMenu) {
      setVisibleMenu(menuType);
    }
  }, [menuType, setVisibleMenu, visibleMenu]);

  useEffect(() => {
    const targetElement = targetRef.current;
    if (targetElement) {
      targetElement.addEventListener('mousedown', handleMouseDown);
      targetElement.addEventListener('mouseenter', handleMouseEnter);
      document.addEventListener('mousedown', (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          closeMenu();
        }
      });
      return () => {
        targetElement.removeEventListener('mousedown', handleMouseDown);
        targetElement.removeEventListener('mouseenter', handleMouseEnter);
        document.removeEventListener('mousedown', closeMenu);
      };
    }
  }, [closeMenu, handleMouseDown, handleMouseEnter, targetRef]);

  return (visibleMenu === menuType) ? (
    <StyledMenu
      ref={menuRef}
      style={{
        top: `${menuPosition.y}px`,
        ...(menuType === 'user' ? { right: '2px' } : { left: `${menuPosition.x}px` })
      }}
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
