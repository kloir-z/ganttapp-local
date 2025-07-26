//GanttStyles.tsx
import styled from 'styled-components';
import { css, keyframes } from 'styled-components';

export const GanttRow = styled.div`
  box-sizing: border-box;
  display: flex;
  border-bottom: solid 1px #00000016;
  user-select: none;
`;

interface StyledBarProps {
  $chartBarColor?: string;
  $left?: number;
  $width?: number;
  $height?: number;
  $isBarDragging?: boolean;
}

export const StyledBar = styled.div.attrs<StyledBarProps>(({ $left, $width, $height }) => ({
  style: {
    left: $left ? `${$left}px` : '',
    width: $width ? `${$width}px` : '21.1px',
    height: $height ? `${$height}px` : '21px',
  },
})) <StyledBarProps>`
  display:flex;
  align-items:center;
  position: absolute;
  box-sizing: border-box;
  text-align: center;
  top: -0.5px;
  border: 0.2px solid transparent;
  background-color: ${props => props.$chartBarColor ? props.$chartBarColor : '#99ff937e'};
  border: ${props => props.$isBarDragging ? '2px solid #0026ff9c' : '0.2px solid transparent'};
  &:hover {
    border: ${props => props.$chartBarColor ? '0.2px solid #000dff5f' : '0.2px solid transparent'};
  }
`;

export const BarLabel = styled.div`
  position: absolute;
  left: 0;
  display: flex;
  align-items: center;
`;

interface CalendarCellProps {
  $isContentStart?: boolean;
  $bgColor?: string;
  $isMonthStart?: boolean;
  $isFirstDate?: boolean;
  $borderLeft?: string;
}

export const CalendarCell = styled.div<CalendarCellProps>`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: ${props => props.$isContentStart ? 'flex-start' : 'center'};
  box-sizing: border-box;
  border-left: ${props => {
    if (props.$isFirstDate) return 'none';
    if (props.$isMonthStart) return '1px solid #00000055';
    if (props.$borderLeft) return `1px solid ${props.$borderLeft}`;
    return 'none';
  }};
  background-color: ${props => props.$bgColor ? props.$bgColor : 'transparent'};
`;

const createFadeAnimation = (fromOpacity: number, toOpacity: number) => keyframes`
  from { opacity: ${fromOpacity}};
  to { opacity: ${toOpacity}};
`;

const fadeAnimation = (fromOpacity: number, toOpacity: number) => css`
  animation: ${createFadeAnimation(fromOpacity, toOpacity)} 0.2s ease-out forwards;
`;

export const Overlay = styled.div<{ $fadeStatus: 'in' | 'out' }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.163);
  display: flex;
  z-index: 11;
  ${props => props.$fadeStatus === 'out' ? fadeAnimation(1, 0) : fadeAnimation(0, 1)}
  border: none;
  color: #ebebeb;
`;

export const ModalContainer = styled.div<{ $fadeStatus: 'in' | 'out' }>`
  will-change: transform;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  padding-top: 20px;
  padding-bottom: 10px;
  background: #ffffff;
  border: solid 1px rgb(83 87 97);
  border-radius: 5px;
  z-index: 15;
  ${props => props.$fadeStatus === 'out' ? fadeAnimation(1, 0) : fadeAnimation(0, 1)}
  color: #1b1b1b;
`;

export const ModalDragBar = styled.div`
  position: absolute;
  top: 0px;
  width : 100%;
  height: 25px;
  padding: 5px;
  border-bottom: 1px solid #eeeeee;
  border-radius: 5px 5px 0px 0px;
  cursor: move;
  background-color: #f8f8f8;
`;

export const ModalCloseButton = styled.button`
  position: absolute;
  display: flex;
  right: 0px;
  top: 0px;
  padding: 2.5px;
  border: none;
  border-radius: 0px 5px 0px 0px;
  cursor: pointer;
  background-color: transparent;
`;