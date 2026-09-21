import { memo, useCallback, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { css, styled } from 'styled-components';
import { MdCheckBox, MdCheckBoxOutlineBlank, MdChevronRight } from 'react-icons/md';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../reduxStoreAndSlices/store';
import { setOpenSubMenu } from '../reduxStoreAndSlices/subMenuSlice';

const StyledMenuItem = styled.div`
  position: relative;
  cursor: pointer;
`;

const MenuItemContent = styled.div<{ disabled?: boolean, $active?: boolean }>`
  display: flex;
  align-items: center;
  position: relative;
  cursor: pointer;
  padding: 8px 15px;
  background-color: ${({ $active }) => $active ? '#efefef' : '#FFF'};
  min-width: 100px;
  white-space: nowrap;
  &:hover {
    background-color: #efefef;
  }
  ${({ disabled }) =>
    disabled &&
    css`
      color: #d1d1d1;
    `}
`;

const CheckboxIcon = styled.span`
  display: flex;
  align-items: center;
  margin-right: 5px;
`;

const SubMenuIndicator = styled.span`
  display: flex;
  align-items: center;
  margin-left: auto;
  padding-left: 15px;
`;

const SubMenu = styled.div<{ $adjustLeft?: boolean, $adjustTop?: number }>`
  position: absolute;
  z-index: 1001;
  top: ${({ $adjustTop }) => $adjustTop}px;
  left: ${({ $adjustLeft }) => $adjustLeft ? 'auto' : '100%'};
  right: ${({ $adjustLeft }) => $adjustLeft ? '100%' : 'auto'};
  border: 1px solid #ececec;
  background-color: #FFF;
  min-width: 50px;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
`;

export interface MenuItemProps {
  onClick?: () => void;
  children: React.ReactNode;
  items?: MenuItemProps[];
  path?: string;
  closeMenu?: () => void;
  disabled?: boolean;
  checked?: boolean;
}
export const MenuItem: React.FC<MenuItemProps> = memo(({ onClick, children, items, path, closeMenu, disabled, checked }) => {
  const dispatch = useDispatch();
  const openSubMenus = useSelector((state: RootState) => state.subMenu.openSubMenus);
  const isSubMenuVisible = !!(path && items && items.length > 0 && openSubMenus.includes(path));
  const itemRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const [adjustLeft, setAdjustLeft] = useState(false);
  const [adjustTop, setAdjustTop] = useState(0);
  const enterTimeout = useRef<number | null>(null);
  const isProcessing = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (isProcessing.current) return;
    if (enterTimeout.current) {
      clearTimeout(enterTimeout.current);
      enterTimeout.current = null;
    }
    if (isSubMenuVisible) return;
    isProcessing.current = true;
    enterTimeout.current = window.setTimeout(() => {
      if (path) {
        dispatch(setOpenSubMenu(path));
      }
      isProcessing.current = false;
    }, 150);
  }, [dispatch, path, isSubMenuVisible]);

  const handleMouseLeave = useCallback(() => {
    if (enterTimeout.current) {
      clearTimeout(enterTimeout.current);
      enterTimeout.current = null;
    }
    isProcessing.current = false;
  }, []);

  // サブメニューを実寸で画面内に収める(開いた直後、描画前に測る)。項目数や文言の
  // 長さで大きさが変わるので、決め打ちの見積もりだと下や右が画面外に切れる。
  // 右に収まらなければ左側に開き、下にはみ出す分だけ上へずらす(親項目より上には
  // 画面上端までしか上げない)。
  useLayoutEffect(() => {
    const item = itemRef.current;
    const subMenu = subMenuRef.current;
    if (!isSubMenuVisible || !item || !subMenu) return;
    const margin = 4;
    const rect = item.getBoundingClientRect();
    setAdjustLeft(rect.right + subMenu.offsetWidth > window.innerWidth - margin);
    const overflowBottom = rect.top + subMenu.offsetHeight - (window.innerHeight - margin);
    setAdjustTop(overflowBottom > 0 ? -Math.min(overflowBottom, Math.max(0, rect.top - margin)) : 0);
  }, [isSubMenuVisible, items]);

  useEffect(() => {
    return () => {
      if (enterTimeout.current) {
        clearTimeout(enterTimeout.current);
      }
    };
  }, []);

  const handleClick = useCallback(() => {
    if (onClick && !disabled) {
      onClick();
      if (path) {
        dispatch(setOpenSubMenu(path));
      }
      if (closeMenu && checked === undefined) {
        closeMenu();
      }
    }
  }, [onClick, disabled, path, closeMenu, checked, dispatch]);

  return (
    <StyledMenuItem ref={itemRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <MenuItemContent disabled={disabled} onClick={handleClick} $active={isSubMenuVisible}>
        {checked !== undefined && (
          <CheckboxIcon>
            {checked ? <MdCheckBox /> : <MdCheckBoxOutlineBlank />}
          </CheckboxIcon>
        )}
        {children}
        {items && items.length > 0 && <SubMenuIndicator><MdChevronRight /></SubMenuIndicator>}
      </MenuItemContent>
      {isSubMenuVisible && (
        <SubMenu ref={subMenuRef} $adjustLeft={adjustLeft} $adjustTop={adjustTop}>
          {items?.map((item, index) => (
            <MenuItem key={index} closeMenu={closeMenu} {...item} />
          ))}
        </SubMenu>
      )}
    </StyledMenuItem>
  );
});