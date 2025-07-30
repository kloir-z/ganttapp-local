// AutoWidthInputBox.tsx
import React, { useState, useRef, useEffect, useCallback, ChangeEvent, memo } from 'react';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setDisplayName, setEventDisplayName, pushPastState, removePastState, setMessageInfo, clearMessageInfo } from '../../reduxStoreAndSlices/store';
import { isEventRow } from '../../types/DataTypes';
import { useTranslation } from 'react-i18next';

const AutoWidthDiv = styled.div`
  display: inline-block;
  box-sizing: border-box;
  overflow: hidden;
  height: 17px;
  min-width: 2em;
  padding: 0px 4px;
  white-space: pre;
  opacity: 0;
  &::before {
    content: '';
  }
  &:empty::before {
    content: attr(data-placeholder);
  }
`;

interface StyledInputProps {
  $isEditingText?: boolean;
}

const StyledReadOnlyInput = styled.input<StyledInputProps>`
  position: absolute;
  left: 0;
  color: #000000ef;
  box-sizing: border-box;
  height: 21px;
  width: 100%;
  padding: 0px 4px;
  background: none;
  border: none;
  cursor: 'default';
  user-select: none;
`;

const StyledInput = styled.input<StyledInputProps>`
  position: absolute;
  left: 0;
  color: #000000ef;
  box-sizing: border-box;
  height: 21px;
  width: 100%;
  padding: 0px 4px;
  background: none;
  border: none;
  cursor: ${props => props.$isEditingText ? 'text' : 'default'};
  &:focus {
    outline: none;
    text-decoration:underline;
  }
`;

interface AutoWidthInputBoxProps {
  entryId: string;
  eventIndex?: number;
  isBarDragged?: boolean;
}

const AutoWidthInputBox: React.FC<AutoWidthInputBoxProps> = memo(({
  entryId,
  eventIndex,
  isBarDragged
}) => {
  const { t } = useTranslation();
  const storeDisplayName = useSelector((state: RootState) => {
    // Handle preview data for historical viewing
    const isViewingPast = state.history?.isViewingPast || false;
    const previewData = state.history?.previewData;
    const dataSource = isViewingPast && previewData?.data ? previewData.data : state.wbsData.data;
    
    const rowData = dataSource[entryId];
    if (isEventRow(rowData) && typeof eventIndex === 'number') {
      if (rowData.eventData && rowData.eventData[eventIndex]) {
        return rowData.eventData[eventIndex].eachDisplayName;
      } else {
        return "";
      }
    }
    return rowData?.displayName;
  });
  const dispatch = useDispatch();
  const [localDisplayName, setLocalDisplayName] = useState(storeDisplayName);
  const [isEditingText, setIsEditingText] = useState(false);
  const originalDisplayNameRef = useRef<string | undefined>(undefined);
  const dummyRef = useRef<HTMLDivElement>(null);
  const placeholder = '    '
  const maxLength = 150;

  const validateTextLength = useCallback((text: string, maxLength: number) => {
    const length = text.length;
    return length <= maxLength;
  }, []);

  const syncToStore = useCallback(() => {
    if (isEditingText) {
      if (validateTextLength(localDisplayName, maxLength)) {
        if (typeof eventIndex === 'number') {
          dispatch(setEventDisplayName({ id: entryId, eventIndex, displayName: localDisplayName }));
        } else {
          dispatch(setDisplayName({ id: entryId, displayName: localDisplayName }));
        }
      } else {
        dispatch(clearMessageInfo());
        const errorMessage = t('Too long text.', { maxLength, inputLength: localDisplayName.length });
        dispatch(setMessageInfo({ message: errorMessage, severity: 'error' }));
      }
    }
  }, [isEditingText, validateTextLength, localDisplayName, eventIndex, dispatch, entryId, t]);

  const handleFocus = useCallback(() => {
    setIsEditingText(true);
    originalDisplayNameRef.current = localDisplayName;
    dispatch(pushPastState());
  }, [dispatch, localDisplayName]);

  const handleBlur = useCallback(() => {
    if (originalDisplayNameRef.current === localDisplayName) {
      dispatch(removePastState(1));
      originalDisplayNameRef.current = undefined;
    }
    setIsEditingText(false);
    syncToStore();
  }, [dispatch, localDisplayName, syncToStore]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (originalDisplayNameRef.current === localDisplayName) {
        dispatch(removePastState(1));
        originalDisplayNameRef.current = undefined;
      }
      syncToStore();
    }
  }, [dispatch, localDisplayName, syncToStore]);

  useEffect(() => {
    if (isBarDragged && originalDisplayNameRef.current === localDisplayName) {
      dispatch(removePastState(1));
      originalDisplayNameRef.current = undefined;
    }
    setIsEditingText(false);
    syncToStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBarDragged]);

  useEffect(() => {
    if (dummyRef.current) {
      dummyRef.current.textContent = localDisplayName || placeholder;
    }
  }, [localDisplayName, placeholder]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setLocalDisplayName(e.target.value);
  }, []);

  useEffect(() => {
    setLocalDisplayName(storeDisplayName)
  }, [storeDisplayName, isEditingText]);

  return (
    <>
      <AutoWidthDiv
        ref={dummyRef}
        data-placeholder={placeholder}
      ></AutoWidthDiv>
      {isBarDragged ? (
        <StyledReadOnlyInput
          type="text"
          readOnly={true}
          value={localDisplayName}
          onBlur={handleBlur}
        />
      ) : (
        <StyledInput
          type="text"
          placeholder={placeholder}
          value={localDisplayName}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          $isEditingText={isEditingText}
        />
      )}
    </>
  );
});

export default AutoWidthInputBox;