import { memo, useCallback, useState, useRef, useEffect } from 'react';
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
        if (items && items.length > 0) {
          const rect = itemRef.current?.getBoundingClientRect();
          const subMenuWidth = 170;
          const subMenuHeight = (items.length - 1) * 34;
          const overflowRight = rect ? rect.right + subMenuWidth > window.innerWidth : false;
          const overflowBottom = rect ? rect.bottom + subMenuHeight > window.innerHeight : false;
          setAdjustLeft(overflowRight);
          setAdjustTop(overflowBottom ? -(subMenuHeight) : 0);
        }
      }
      isProcessing.current = false;
    }, 150);
  }, [dispatch, items, path, isSubMenuVisible]);

  const handleMouseLeave = useCallback(() => {
    if (enterTimeout.current) {
      clearTimeout(enterTimeout.current);
      enterTimeout.current = null;
    }
    isProcessing.current = false;
  }, []);

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
        <SubMenu $adjustLeft={adjustLeft} $adjustTop={adjustTop}>
          {items?.map((item, index) => (
            <MenuItem key={index} closeMenu={closeMenu} {...item} />
          ))}
        </SubMenu>
      )}
    </StyledMenuItem>
  );
});