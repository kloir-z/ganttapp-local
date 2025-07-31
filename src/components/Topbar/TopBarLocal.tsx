import { memo, useCallback, useMemo, useRef, useState } from 'react';
import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveModal, setIsLoading } from '../../reduxStoreAndSlices/uiFlagSlice';
import { RootState, undo, redo, setMessageInfo, removePastState } from '../../reduxStoreAndSlices/store';
import { setTitle } from '../../reduxStoreAndSlices/baseSettingsSlice';
import { handleExport, handleImport } from '../../utils/ExportImportHandler'; // handleImportを追加
import { useTranslation } from 'react-i18next';
import TitleSetting from './TitleSetting';
import TopMenu from './TopMenu';
import JsonDataModal from './JsonDataModal';
import styled from 'styled-components';
import { v4 as uuidv4 } from 'uuid';
import useWarnIfUnsavedChanges from '../../hooks/useWarnIfUnsavedChanges';
import useResetIsSavedChangesFlags from '../../hooks/useResetIsSavedChangesFlags';
import useResetReduxStates from '../../hooks/useResetReduxStates';
import { useNavigate } from 'react-router-dom';
import { WelcomeUtils } from '../../utils/WelcomeUtils';
import { returnToPresentWithRestore } from '../../reduxStoreAndSlices/historyThunks';

const MenuButton = styled.button`
  border: none;
  border-radius: 3px;
  height: 100%;
  padding: 0px 15px;
  background-color: transparent;
  transition: background-color 0.3s ease;
  &:hover:not(:disabled) {
    background-color: #d6d6d6;
  }
  &:disabled {
    color: #999;
    cursor: not-allowed;
  }
`;

const ReturnButton = styled.button`
  border: none;
  border-radius: 3px;
  height: 100%;
  padding: 0px 15px;
  background-color: #ff9800;
  color: white;
  font-weight: bold;
  transition: background-color 0.3s ease;
  &:hover {
    background-color: #f57c00;
  }
`;

const TopBarLocal: React.FC = memo(() => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [jsonModalOpen, setJsonModalOpen] = useState(false);

  // Redux state
  const currentRegularDaysOffSetting = useSelector((state: RootState) => state.wbsData.regularDaysOffSetting);
  const currentColors = useSelector((state: RootState) => state.color.colors);
  const isSavedStore = useSelector((state: RootState) => state.wbsData.isSavedChanges);
  const isSavedColor = useSelector((state: RootState) => state.color.isSavedChanges);
  const isSavedSettings = useSelector((state: RootState) => state.baseSettings.isSavedChanges);
  const isSavedNotes = useSelector((state: RootState) => state.notes.isSavedChanges);
  const currentLanguage = useSelector((state: RootState) => state.baseSettings.language);
  const dateRange = useSelector((state: RootState) => state.baseSettings.dateRange);
  const currentHolidayInput = useSelector((state: RootState) => state.baseSettings.holidayInput);
  const holidayColor = useSelector((state: RootState) => state.wbsData.holidayColor);
  const wbsWidth = useSelector((state: RootState) => state.baseSettings.wbsWidth);
  const cellWidth = useSelector((state: RootState) => state.baseSettings.cellWidth);
  const calendarWidth = useSelector((state: RootState) => state.baseSettings.calendarWidth);
  const showYear = useSelector((state: RootState) => state.wbsData.showYear);
  const dateFormat = useSelector((state: RootState) => state.wbsData.dateFormat);
  const data = useSelector((state: RootState) => state.wbsData.data);
  // Historical data for preview functionality
  const isViewingPast = useSelector((state: RootState) => state.history?.isViewingPast || false);
  const previewData = useSelector((state: RootState) => state.history?.previewData);
  const currentTitle = useSelector((state: RootState) => state.baseSettings.title);
  const title = isViewingPast && previewData?.title ? previewData.title : currentTitle;
  const regularDaysOffSetting = isViewingPast && previewData?.regularDaysOffSetting ? previewData.regularDaysOffSetting : currentRegularDaysOffSetting;
  const colors = isViewingPast && previewData?.colors ? previewData.colors : currentColors;
  const holidayInput = isViewingPast && previewData?.holidayInput ? previewData.holidayInput : currentHolidayInput;
  const columns = useSelector((state: RootState) => state.wbsData.columns);
  const treeData = useSelector((state: RootState) => state.notes.treeData);
  const noteData = useSelector((state: RootState) => state.notes.noteData);
  const notesModalState = useSelector((state: RootState) => state.notes.modalState);
  const treeExpandedKeys = useSelector((state: RootState) => state.notes.treeExpandedKeys);
  const treeScrollPosition = useSelector((state: RootState) => state.notes.treeScrollPosition);
  const editorStates = useSelector((state: RootState) => state.notes.editorStates);
  const selectedNodeKey = useSelector((state: RootState) => state.notes.selectedNodeKey);
  const scrollPosition = useSelector((state: RootState) => state.baseSettings.scrollPosition);
  const historySnapshots = useSelector((state: RootState) => state.history?.snapshots || []);
  const pastLength = useSelector((state: RootState) => state.wbsData.past.length);
  const futureLength = useSelector((state: RootState) => state.wbsData.future.length);

  const [visibleMenu, setVisibleMenu] = useState<string | null>(null);
  const fileButtonRef = useRef<HTMLButtonElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const settingButtonRef = useRef<HTMLButtonElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const resetIsSavedChangesFlags = useResetIsSavedChangesFlags();
  const resetReduxStates = useResetReduxStates();

  useWarnIfUnsavedChanges(!isSavedColor)
  useWarnIfUnsavedChanges(!isSavedNotes)
  useWarnIfUnsavedChanges(!isSavedSettings)
  useWarnIfUnsavedChanges(!isSavedStore)

  const handleClose = useCallback(() => {
    dispatch(setActiveModal(null));
    setSaveAsDialogOpen(false);
    setNewTitle('');
  }, [dispatch]);

  const handleJsonModalOpen = useCallback(() => {
    setJsonModalOpen(true);
  }, []);

  const handleJsonModalClose = useCallback(() => {
    setJsonModalOpen(false);
  }, []);

  const handleNewClick = useCallback(async () => {
    await resetReduxStates();
    resetIsSavedChangesFlags();
    handleClose();
  }, [handleClose, resetReduxStates, resetIsSavedChangesFlags]);

  const handleSaveAsClick = useCallback(() => {
    setNewTitle(title);
    setSaveAsDialogOpen(true);
  }, [title]);

  const handleNotesClick = useCallback(() => {
    dispatch(setActiveModal('notes'));
  }, [dispatch]);

  const handleLocalSave = useCallback(async (newTitle?: string) => {
    const effectiveTitle = newTitle || title;
    try {
      const zipData = await handleExport(
        uuidv4(),
        colors,
        dateRange,
        columns,
        data,
        holidayInput,
        holidayColor,
        regularDaysOffSetting,
        wbsWidth,
        calendarWidth,
        cellWidth,
        effectiveTitle,
        showYear,
        dateFormat,
        treeData,
        noteData,
        currentLanguage,
        scrollPosition,
        notesModalState,
        treeExpandedKeys,
        treeScrollPosition,
        editorStates,
        selectedNodeKey,
        historySnapshots,
      );

      const blob = new Blob([zipData], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${effectiveTitle || 'gantt-chart'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      resetIsSavedChangesFlags();
      handleClose();
      dispatch(setMessageInfo({ message: t('File downloaded successfully.'), severity: 'success' }));
    } catch (error) {
      const errorMessage = error instanceof Error
        ? t('Download failed: ') + error.message
        : t('Download failed. An unknown error occurred.');
      dispatch(setMessageInfo({ message: errorMessage, severity: 'error' }));
    }
  }, [colors, dateRange, columns, data, holidayInput, holidayColor, regularDaysOffSetting, wbsWidth, calendarWidth, cellWidth, title, showYear, dateFormat, treeData, noteData, currentLanguage, notesModalState, historySnapshots, resetIsSavedChangesFlags, handleClose, dispatch, t]);

  const handleSaveAsSubmit = useCallback(async () => {
    if (!newTitle) return;
    dispatch(setTitle(newTitle));
    handleLocalSave(newTitle);
  }, [dispatch, handleLocalSave, newTitle]);

  const handleLocalOpen = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          dispatch(setIsLoading(true));
          const fileBlob = new Blob([file], { type: file.type });
          await resetReduxStates();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await dispatch(handleImport({ file: fileBlob }) as any);
          dispatch(removePastState(1));
          resetIsSavedChangesFlags();
          dispatch(setMessageInfo({
            message: t('Saved data opened successfully.'),
            severity: 'success'
          }));
          if (visibleMenu) {
            setVisibleMenu(null);
          }
        } catch (error) {
          console.error('Failed to open data.', error);
          const errorMessage = error instanceof Error
            ? t('Failed to open data: ') + error.message
            : t('Failed to open data. An unknown error occurred.');
          dispatch(setMessageInfo({
            message: errorMessage,
            severity: 'error'
          }));
        } finally {
          dispatch(setIsLoading(false));
        }
      }
    };
    input.click();
  }, [dispatch, t, resetIsSavedChangesFlags, resetReduxStates, visibleMenu, setVisibleMenu]);

  const fileMenuOptions = useMemo(() => {
    const options = [
      {
        children: t('New'),
        onClick: handleNewClick,
        path: '0'
      },
      {
        children: t('Open File'),
        onClick: handleLocalOpen,
        path: '1'
      },
      {
        children: t('Download'),
        onClick: () => handleLocalSave(),
        path: '2'
      },
      {
        children: t('Download As'),
        onClick: handleSaveAsClick,
        path: '3'
      },
      {
        children: t('JSON Data'),
        onClick: handleJsonModalOpen,
        path: '4'
      }
    ];
    return options;
  }, [t, handleNewClick, handleLocalOpen, handleLocalSave, handleSaveAsClick, handleJsonModalOpen]);

  const editMenuOptions = useMemo(() => {
    const options = [
      {
        children: `${t('Undo')} (${pastLength - 1})`,
        onClick: () => dispatch(undo()),
        path: '0'
      },
      {
        children: `${t('Redo')} (${futureLength})`,
        onClick: () => dispatch(redo()),
        path: '1'
      }
    ];
    return options;
  }, [dispatch, futureLength, pastLength, t]);

  const settingMenuOptions = useMemo(() => {
    const options = [
      {
        children: t('Basic'),
        onClick: () => dispatch(setActiveModal('settingsbasic')),
        path: '0'
      },
      {
        children: t('Chart Setting'),
        onClick: () => dispatch(setActiveModal('settingschart')),
        path: '1'
      },
      {
        children: t('Table'),
        onClick: () => dispatch(setActiveModal('settingstable')),
        path: '2'
      },
      {
        children: t('Days Off'),
        onClick: () => dispatch(setActiveModal('settingsdaysoff')),
        path: '3'
      }
      // 'Manage Access'は除外（認証が必要なため）
    ];
    return options;
  }, [dispatch, t]);

  const handleResetWelcome = useCallback(() => {
    WelcomeUtils.resetWelcomeFlag();
    dispatch(setActiveModal('welcome'));
  }, [dispatch]);

  const handleBackToLogin = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleReturnToPresent = useCallback(() => {
    dispatch(returnToPresentWithRestore() as any);
    dispatch(setMessageInfo({ 
      message: t('Returned to the latest state'), 
      severity: 'success' 
    }));
  }, [dispatch]);

  const userMenuOptions = useMemo(() => {
    const options = [
      {
        children: t('Show Welcome Screen'),
        onClick: handleResetWelcome,
        path: '0'
      }
    ];
    return options;
  }, [t, handleResetWelcome, handleBackToLogin]);

  const [error, setError] = useState('');
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewTitle(value);
    if (value.length > 150) {
      setError('Title must be 150 characters or less.');
    } else {
      setError('');
    }
  }, []);

  return (
    <div className="Topbar" style={{ display: 'flex', height: '100%', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
      <div className="TopMenus" style={{ height: '100%', marginLeft: '2px', flex: '0 0 auto' }}>
        <MenuButton ref={fileButtonRef} disabled={isViewingPast}>
          {t('File')}
        </MenuButton>
        {!isViewingPast && (
          <TopMenu
            menuType='file'
            targetRef={fileButtonRef}
            items={fileMenuOptions}
            visibleMenu={visibleMenu}
            setVisibleMenu={setVisibleMenu}
          />
        )}
        <MenuButton ref={editButtonRef} disabled={isViewingPast}>
          {t('Edit')}
        </MenuButton>
        {!isViewingPast && (
          <TopMenu
            menuType='edit'
            targetRef={editButtonRef}
            items={editMenuOptions}
            visibleMenu={visibleMenu}
            setVisibleMenu={setVisibleMenu}
          />
        )}
        <MenuButton ref={settingButtonRef} disabled={false}>
          {t('Setting')}
        </MenuButton>
        <TopMenu
            menuType='setting'
            targetRef={settingButtonRef}
            items={settingMenuOptions}
            visibleMenu={visibleMenu}
            setVisibleMenu={setVisibleMenu}
          />
        <MenuButton onClick={handleNotesClick}>
          {t('Notes')}
        </MenuButton>
        <MenuButton onClick={() => dispatch(setActiveModal('history'))}>
          {t('History')}
        </MenuButton>
        {isViewingPast && (
          <ReturnButton onClick={handleReturnToPresent}>
            {t('Return to Latest')}
          </ReturnButton>
        )}
        <Dialog open={saveAsDialogOpen} onClose={handleClose} maxWidth='lg'>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              type="text"
              fullWidth
              variant="outlined"
              value={newTitle}
              onChange={handleChange}
              error={!!error}
              helperText={error}
              sx={{ width: '400px' }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSaveAsSubmit} color="primary">OK</Button>
            <Button onClick={handleClose}>{t('Cancel')}</Button>
          </DialogActions>
        </Dialog>
        <JsonDataModal
          open={jsonModalOpen}
          onClose={handleJsonModalClose}
        />
      </div>
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', height: '100%', display: 'flex', justifyContent: 'center' }}>
        <TitleSetting />
      </div>
      <div style={{ height: '100%' }}>
        <MenuButton ref={userButtonRef}>
          {t('Local Mode')}
        </MenuButton>
        <TopMenu
          menuType='user'
          targetRef={userButtonRef}
          items={userMenuOptions}
          visibleMenu={visibleMenu}
          setVisibleMenu={setVisibleMenu}
        />
      </div>
    </div>
  );
});

export default TopBarLocal;