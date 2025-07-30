import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { clearMessageInfo, setMessageInfo, RootState } from '../../reduxStoreAndSlices/store';
import { setTitle } from '../../reduxStoreAndSlices/baseSettingsSlice';
import { useTranslation } from 'react-i18next';

const TitleWrapper = styled.div`
  position: absolute;
  display: inline-block;
`;

const AutoWidthDiv = styled.div`
  display: inline-block;
  font-size: 14px;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 2em;
  padding: 2px 5px;
  white-space: nowrap;
  opacity: 0;
  &::before {
    content: '';
  }
  &:empty::before {
    content: attr(data-placeholder);
  }
`;

const StyledInput = styled.input`
  position: absolute;
  left: 0;
  font-size: 14px;
  color: #000000ed;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 2px 4px;
  background: none;
  border: none;
  &::placeholder {
    color: #c1c1c1;
  }
  &:focus {
    outline: none;
    text-decoration:underline;
  }
`;

const TitleSetting: React.FC = memo(() => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  // Historical data for preview functionality
  const isViewingPast = useSelector((state: RootState) => state.history?.isViewingPast || false);
  const previewData = useSelector((state: RootState) => state.history?.previewData);
  const currentTitle = useSelector((state: RootState) => state.baseSettings.title);
  const globalTitle = isViewingPast && previewData?.title ? previewData.title : currentTitle;
  const [title, setTitleLocal] = useState(globalTitle);
  const [isEditing, setIsEditing] = useState(false);
  const dummyRef = useRef<HTMLDivElement>(null);
  const placeholder = t('Enter Chart Title');
  const maxLength = 150;

  const validateTextLength = useCallback((text: string, maxLength: number) => {
    const length = text.length;
    return length <= maxLength;
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitleLocal(e.target.value);
  }, []);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  useEffect(() => {
    if (dummyRef.current) {
      dummyRef.current.textContent = title || placeholder;
    }
  }, [title, placeholder]);

  useEffect(() => {
    if (!isEditing) {
      setTitleLocal(globalTitle)
    }
  }, [globalTitle, isEditing]);

  const syncToStore = useCallback(() => {
    if (isEditing) {
      if (validateTextLength(title, maxLength)) {
        dispatch(setTitle(title));
      } else {
        dispatch(clearMessageInfo());

        const errorMessage = t('Too long text.', { maxLength, inputLength: title.length });
        dispatch(setMessageInfo({ message: errorMessage, severity: 'error' }));
      }
    }
  }, [isEditing, validateTextLength, title, dispatch, t]);

  useEffect(() => {
    syncToStore();
  }, [syncToStore]);

  const handleDoubleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };

  return (
    <TitleWrapper>
      <AutoWidthDiv ref={dummyRef} data-placeholder={placeholder}></AutoWidthDiv>
      <StyledInput
        type="text"
        placeholder={placeholder}
        value={title}
        onChange={isViewingPast ? undefined : handleChange}
        onFocus={isViewingPast ? undefined : handleFocus}
        onBlur={isViewingPast ? undefined : handleBlur}
        onDoubleClick={handleDoubleClick}
        disabled={isViewingPast}
        readOnly={isViewingPast}
      />
    </TitleWrapper>
  );
});

export default TitleSetting;