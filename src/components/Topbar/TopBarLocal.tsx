import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import React from 'react';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveModal, setIsLoading, setShowCriticalPath } from '../../reduxStoreAndSlices/uiFlagSlice';
import { selectCriticalPath } from '../../reduxStoreAndSlices/criticalPathSelectors';
import { RootState, undo, redo, setMessageInfo, removePastState } from '../../reduxStoreAndSlices/store';
import { setTitle } from '../../reduxStoreAndSlices/baseSettingsSlice';
import { handleExport, handleImport, buildProjectData } from '../../utils/ExportImportHandler'; // handleImportを追加
import { exportProjectAsHtml } from '../../utils/HtmlSnapshotExport';
import { useTranslation } from 'react-i18next';
import TitleSetting from './TitleSetting';
import TopMenu from './TopMenu';
import JsonDataModal from './JsonDataModal';
import styled from 'styled-components';
import { v4 as uuidv4 } from 'uuid';
import { useGanttPdfExport } from '../../hooks/useGanttPdfExport';
import { useGanttExcelExport } from '../../hooks/useGanttExcelExport';
import { useColorBasis } from '../../hooks/useColorBasis';
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
  // Excelエクスポート時のメモシート出力確認ダイアログ(メモがある時だけ開く)
  const [excelDialogOpen, setExcelDialogOpen] = useState(false);
  const [includeNotesInExcel, setIncludeNotesInExcel] = useState(true);

  // Redux state
  const currentRegularDaysOffSetting = useSelector((state: RootState) => state.wbsData.regularDaysOffSetting);
  const currentColors = useSelector((state: RootState) => state.color.colors);
  const colorSchemes = useSelector((state: RootState) => state.color.schemes);
  const colorBasisColumn = useSelector((state: RootState) => state.color.basisColumnId);
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
  const rowNoteData = useSelector((state: RootState) => state.notes.rowNoteData);
  const notesModalState = useSelector((state: RootState) => state.notes.modalState);
  const treeExpandedKeys = useSelector((state: RootState) => state.notes.treeExpandedKeys);
  const treeScrollPosition = useSelector((state: RootState) => state.notes.treeScrollPosition);
  const editorStates = useSelector((state: RootState) => state.notes.editorStates);
  const selectedNodeKey = useSelector((state: RootState) => state.notes.selectedNodeKey);
  const scrollPosition = useSelector((state: RootState) => state.baseSettings.scrollPosition);
  const historySnapshots = useSelector((state: RootState) => state.history?.snapshots || []);
  const pastLength = useSelector((state: RootState) => state.wbsData.past.length);
  const futureLength = useSelector((state: RootState) => state.wbsData.future.length);
  const showCriticalPath = useSelector((state: RootState) => state.uiFlags.showCriticalPath);
  // トグルON中のみ評価される(短絡)。循環リンクを検出したら警告を出す。
  const cpHasCycle = useSelector((state: RootState) => state.uiFlags.showCriticalPath && selectCriticalPath(state).hasCycle);

  const [visibleMenu, setVisibleMenu] = useState<string | null>(null);
  const fileButtonRef = useRef<HTMLButtonElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const settingButtonRef = useRef<HTMLButtonElement>(null);
  const coloringButtonRef = useRef<HTMLButtonElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const { basisColumnId, candidates, switchTo } = useColorBasis();
  const resetIsSavedChangesFlags = useResetIsSavedChangesFlags();
  const resetReduxStates = useResetReduxStates();
  const { exportPdf } = useGanttPdfExport();
  const { exportExcel } = useGanttExcelExport();

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
      const zipData = await handleExport({
        fileId: uuidv4(),
        colors,
        colorSchemes,
        colorBasisColumn,
        dateRange,
        columns,
        data,
        holidayInput,
        holidayColor,
        regularDaysOffSetting,
        wbsWidth,
        calendarWidth,
        cellWidth,
        title: effectiveTitle,
        showYear,
        dateFormat,
        treeData,
        noteData,
        rowNoteData,
        language: currentLanguage,
        scrollPosition,
        notesModalState,
        treeExpandedKeys,
        treeScrollPosition,
        editorStates,
        selectedNodeKey,
        historySnapshots,
      });

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
  }, [colors, colorSchemes, colorBasisColumn, dateRange, columns, data, holidayInput, holidayColor, regularDaysOffSetting, wbsWidth, calendarWidth, cellWidth, title, showYear, dateFormat, treeData, noteData, rowNoteData, currentLanguage, notesModalState, historySnapshots, resetIsSavedChangesFlags, handleClose, dispatch, t]);

  const handleSaveAsSubmit = useCallback(async () => {
    if (!newTitle) return;
    dispatch(setTitle(newTitle));
    handleLocalSave(newTitle);
  }, [dispatch, handleLocalSave, newTitle]);

  const handleExportHtml = useCallback(async () => {
    try {
      const projectData = buildProjectData({
        fileId: uuidv4(),
        colors,
        colorSchemes,
        colorBasisColumn,
        dateRange,
        columns,
        data,
        holidayInput,
        holidayColor,
        regularDaysOffSetting,
        wbsWidth,
        calendarWidth,
        cellWidth,
        title,
        showYear,
        dateFormat,
        treeData,
        noteData,
        rowNoteData,
        language: currentLanguage,
        scrollPosition,
        notesModalState,
        treeExpandedKeys,
        treeScrollPosition,
        editorStates,
        selectedNodeKey,
        historySnapshots,
      });
      await exportProjectAsHtml(projectData, title);
      handleClose();
      dispatch(setMessageInfo({ message: t('HTML file downloaded successfully.'), severity: 'success' }));
    } catch (error) {
      const errorMessage = error instanceof Error
        ? t('HTML export failed: ') + error.message
        : t('HTML export failed. An unknown error occurred.');
      dispatch(setMessageInfo({ message: errorMessage, severity: 'error' }));
    }
  }, [colors, colorSchemes, colorBasisColumn, dateRange, columns, data, holidayInput, holidayColor, regularDaysOffSetting, wbsWidth, calendarWidth, cellWidth, title, showYear, dateFormat, treeData, noteData, rowNoteData, currentLanguage, scrollPosition, notesModalState, treeExpandedKeys, treeScrollPosition, editorStates, selectedNodeKey, historySnapshots, handleClose, dispatch, t]);

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
      },
      {
        children: t('Export'),
        path: '5',
        items: [
          {
            children: t('Export PDF'),
            onClick: () => exportPdf(),
            path: '5.0'
          },
          {
            children: t('Export Excel'),
            onClick: () => {
              // メモがあるプロジェクトだけ「メモシートを含めるか」を確認する。
              const hasRowNotes = Object.values(rowNoteData || {}).some(
                v => typeof v === 'string' && v.trim() !== ''
              );
              if ((treeData && treeData.length > 0) || hasRowNotes) {
                setExcelDialogOpen(true);
              } else {
                exportExcel();
              }
            },
            path: '5.1'
          },
          {
            children: t('Export HTML'),
            onClick: () => handleExportHtml(),
            path: '5.2'
          }
        ]
      }
    ];
    return options;
  }, [t, handleNewClick, handleLocalOpen, handleLocalSave, handleSaveAsClick, handleJsonModalOpen, exportPdf, exportExcel, handleExportHtml, treeData, rowNoteData]);

  // 色分け基準列のクイック切替メニュー。列名はユーザーのリネームをそのまま表示する。
  const coloringMenuOptions = useMemo(() => {
    return candidates.map((candidate, index) => ({
      children: candidate.label,
      onClick: () => switchTo(candidate.columnId),
      checked: candidate.columnId === basisColumnId,
      path: String(index),
    }));
  }, [candidates, basisColumnId, switchTo]);

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
      },
      {
        children: `${showCriticalPath ? '✓ ' : ''}${t('Show Critical Path')}`,
        onClick: () => dispatch(setShowCriticalPath(!showCriticalPath)),
        path: '4'
      }
      // 'Manage Access'は除外（認証が必要なため）
    ];
    return options;
  }, [dispatch, t, showCriticalPath]);

  // クリティカルパス表示中に循環リンクが見つかったら知らせる(循環部分は判定から除外される)。
  useEffect(() => {
    if (cpHasCycle) {
      dispatch(setMessageInfo({
        message: t('Critical path: circular links detected. Cyclic tasks are excluded.'),
        severity: 'warning'
      }));
    }
  }, [cpHasCycle, dispatch, t]);

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
        <MenuButton ref={coloringButtonRef} disabled={isViewingPast}>
          {t('Coloring')}
        </MenuButton>
        {!isViewingPast && (
          <TopMenu
            menuType='coloring'
            targetRef={coloringButtonRef}
            items={coloringMenuOptions}
            visibleMenu={visibleMenu}
            setVisibleMenu={setVisibleMenu}
          />
        )}
        <MenuButton onClick={handleNotesClick}>
          {t('Notes')}
        </MenuButton>
        <MenuButton onClick={() => dispatch(setActiveModal('history'))}>
          {t('History')}
        </MenuButton>
        <MenuButton onClick={() => dispatch(setActiveModal('help'))}>
          {t('Help')}
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
        <Dialog open={excelDialogOpen} onClose={() => setExcelDialogOpen(false)}>
          <DialogTitle>{t('Export Excel')}</DialogTitle>
          <DialogContent>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeNotesInExcel}
                  onChange={(e) => setIncludeNotesInExcel(e.target.checked)}
                />
              }
              label={t('Include notes sheet')}
            />
          </DialogContent>
          <DialogActions>
            <Button
              color="primary"
              onClick={() => {
                setExcelDialogOpen(false);
                exportExcel({ includeNotes: includeNotesInExcel });
              }}
            >
              OK
            </Button>
            <Button onClick={() => setExcelDialogOpen(false)}>{t('Cancel')}</Button>
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