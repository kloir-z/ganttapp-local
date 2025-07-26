import styled from "styled-components";

export const StyledContainer = styled.div`
  display: flex;
  position: relative;
  flex-direction: row;
  margin: 20px;
`;

export const StyledTreeContainer = styled.div`
  margin-right: 10px;
  flex-grow: 0;
  flex-shrink: 0;
  overflow-y: scroll;
  overflow-x: hidden;
  .draggable-tree .ant-tree-node-content-wrapper {
    white-space: nowrap;
  }
`;

export const StyledTextAreaContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
  margin-left: 10px;
  .ql-tooltip {
    z-index: 999;
  }
  .ql-editor {
    padding: 4px;
    font-size: 14px;
  }
`;

interface StyledResizeBarProps {
  $left: number;
  $ismousedown: boolean;
}

export const StyledResizeBar = styled.div<StyledResizeBarProps>`
  width: 7px;
  cursor: ew-resize;
  position: absolute;
  left: ${props => props.$left}px;
  height: 100%;
  z-index: 10;
  background-color: transparent;
  transition: width 0.2s ease-out;
  background-color: ${props => props.$ismousedown ? '#2773ff90' : 'transparent'};
  &:hover {
    background-color: #2773ff90;
  }
`;

export const StyledQuillContainer = styled.div`
  .ql-editor h1 {
    font-size: 1.5rem;
    padding-left: 0.7rem;
    margin-bottom: 0.7rem;
    border-bottom: solid 1px #b9b9b9;
    border-left: solid 3px #b9b9b9;
  }
  .ql-editor h2 {
    font-size: 1.1rem;
    padding-left: 0.5rem;
    margin-bottom: 0.5rem;
    border-bottom: solid 1px #b9b9b9;
    border-left: solid 3px #b9b9b9;
  }
  .ql-editor h3 {
    font-size: 0.9rem;
    padding-left: 0.3rem;
    margin-bottom: 0.3rem;
    border-bottom: solid 1px #b9b9b9;
    border-left: solid 3px #b9b9b9;
  }
  .ql-editor p {
    padding: 0.1rem;
  }
`;