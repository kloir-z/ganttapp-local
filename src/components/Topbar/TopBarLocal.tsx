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
import { useDispatch, useSelector, useStore } from 'react-redux';
import { setActiveModal, setBarSelectionMode, setIsLoading, setShowCriticalPath, setViewMode } from '../../reduxStoreAndSlices/uiFlagSlice';
import { selectCriticalPath } from '../../reduxStoreAndSlices/criticalPathSelectors';
import { RootState, undo, redo, setMessageInfo, removePastState } from '../../reduxStoreAndSlices/store';
import { handleImport } from '../../utils/ExportImportHandler';
import { readEmbeddedProjectDataFromHtml } from '../../utils/HtmlSnapshotExport';
import { useProjectSave } from '../../hooks/useProjectSave';
import { useTranslation } from 'react-i18next';
import TitleSetting from './TitleSetting';
import TopMenu from './TopMenu';
import JsonDataModal from './JsonDataModal';
import styled from 'styled-components';
import { draftSession } from '../../utils/draftSession';
import { useGanttPdfExport } from '../../hooks/useGanttPdfExport';
import { useGanttExcelExport } from '../../hooks/useGanttExcelExport';
import { useColorBasis } from '../../hooks/useColorBasis';
import useWarnIfUnsavedChanges from '../../hooks/useWarnIfUnsavedChanges';
import useResetIsSavedChangesFlags from '../../hooks/useResetIsSavedChangesFlags';
import useResetReduxStates from '../../hooks/useResetReduxStates';
import { useNavigate } from 'react-router-dom';
import { WelcomeUtils } from '../../utils/WelcomeUtils';

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

// バー選択モードのトグル。ON の間はひと目で分かるよう色を変える。
const ToggleMenuButton = styled.button<{ $active?: boolean }>`
  border: none;
  border-radius: 3px;
  height: 100%;
  padding: 0px 15px;
  background-color: ${props => props.$active ? 'rgba(53, 121, 248, 0.95)' : 'transparent'};
  color: ${props => props.$active ? '#fff' : 'inherit'};
  transition: background-color 0.3s ease;
  &:hover:not(:disabled) {
    background-color: ${props => props.$active ? 'rgba(53, 121, 248, 0.8)' : '#d6d6d6'};
  }
  &:disabled {
    color: #999;
    cursor: not-allowed;
  }
`;

const TopBarLocal: React.FC = memo(() => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  // Excelエクスポート時のメモシート出力確認ダイアログ(メモがある時だけ開く)
  const [excelDialogOpen, setExcelDialogOpen] = useState(false);
  const [includeNotesInExcel, setIncludeNotesInExcel] = useState(true);

  // Redux state
  const isBarSelectionMode = useSelector((state: RootState) => state.uiFlags.isBarSelectionMode);
  const isViewMode = useSelector((state: RootState) => state.uiFlags.isViewMode);
  const isSavedStore = useSelector((state: RootState) => state.wbsData.isSavedChanges);
  const isSavedColor = useSelector((state: RootState) => state.color.isSavedChanges);
  const isSavedSettings = useSelector((state: RootState) => state.baseSettings.isSavedChanges);
  const isSavedNotes = useSelector((state: RootState) => state.notes.isSavedChanges);
  const title = useSelector((state: RootState) => state.baseSettings.title);
  const treeData = useSelector((state: RootState) => state.notes.treeData);
  const rowNoteData = useSelector((state: RootState) => state.notes.rowNoteData);
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
  const { save, saveAs, downloadZip, exportHtml } = useProjectSave();

  // 閲覧モードでは、閉じれば変更が消えることを承知で使っているので警告しない
  useWarnIfUnsavedChanges(!isViewMode && !isSavedColor)
  useWarnIfUnsavedChanges(!isViewMode && !isSavedNotes)
  useWarnIfUnsavedChanges(!isViewMode && !isSavedSettings)
  useWarnIfUnsavedChanges(!isViewMode && !isSavedStore)

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

  const handleSaveAsSubmit = useCallback(async () => {
    if (!newTitle) return;
    handleClose();
    await downloadZip(newTitle);
  }, [handleClose, downloadZip, newTitle]);

  const handleLocalOpen = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.html,.htm';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          dispatch(setIsLoading(true));
          // 書き出した HTML も開ける(埋め込まれたプロジェクトのデータを読む)
          let fileBlob: Blob;
          if (/\.html?$/i.test(file.name)) {
            const embedded = readEmbeddedProjectDataFromHtml(await file.text());
            if (!embedded) throw new Error(t('This HTML file has no project data.'));
            fileBlob = new Blob([JSON.stringify(embedded)], { type: 'application/json' });
          } else {
            fileBlob = new Blob([file], { type: file.type });
          }
          await resetReduxStates();
           
          await dispatch(handleImport({ file: fileBlob }) as any);
          dispatch(removePastState(1));
          resetIsSavedChangesFlags();
          // 同じプロジェクトの未保存の下書きがブラウザに残っていれば、一覧を開いて知らせる
          const hasDraft = await draftSession.hasDirtyDraftForProject(store.getState().baseSettings.projectId);
          if (hasDraft) dispatch(setActiveModal('drafts'));
          dispatch(setMessageInfo(hasDraft
            ? { message: t('This project has an unsaved draft in this browser. Open it from File > Drafts.'), severity: 'warning' }
            : { message: t('Saved data opened successfully.'), severity: 'success' }));
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
  }, [dispatch, store, t, resetIsSavedChangesFlags, resetReduxStates, visibleMenu, setVisibleMenu]);

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
        // 前に保存したファイル(書き出した HTML を開いているならそのファイル)に上書きする
        children: t('Save File'),
        onClick: () => { handleClose(); void save(); },
        path: '7'
      },
      {
        children: t('Save File As'),
        onClick: () => { handleClose(); void saveAs(); },
        path: '8'
      },
      {
        children: t('Download'),
        onClick: () => { handleClose(); void downloadZip(); },
        path: '2'
      },
      {
        children: t('Download As'),
        onClick: handleSaveAsClick,
        path: '3'
      },
      {
        // ブラウザ内に残っている下書き(閉じたタブ・切り替える前のプロジェクト・保存済み)
        children: t('Drafts'),
        onClick: () => dispatch(setActiveModal('drafts')),
        path: '6'
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
            // 書き出した HTML を作業ファイルとして使うので、これも保存として扱う(useProjectSave)
            children: t('Export HTML'),
            onClick: () => { handleClose(); void exportHtml(); },
            path: '5.2'
          }
        ]
      }
    ];
    return options;
  }, [t, dispatch, handleNewClick, handleLocalOpen, handleClose, save, saveAs, downloadZip, exportHtml, handleSaveAsClick, handleJsonModalOpen, exportPdf, exportExcel, treeData, rowNoteData]);

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
        <MenuButton ref={fileButtonRef}>
          {t('File')}
        </MenuButton>
        <TopMenu
          menuType='file'
          targetRef={fileButtonRef}
          items={fileMenuOptions}
          visibleMenu={visibleMenu}
          setVisibleMenu={setVisibleMenu}
        />
        <MenuButton ref={editButtonRef}>
          {t('Edit')}
        </MenuButton>
        <TopMenu
          menuType='edit'
          targetRef={editButtonRef}
          items={editMenuOptions}
          visibleMenu={visibleMenu}
          setVisibleMenu={setVisibleMenu}
        />
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
        <MenuButton ref={coloringButtonRef}>
          {t('Coloring')}
        </MenuButton>
        <TopMenu
          menuType='coloring'
          targetRef={coloringButtonRef}
          items={coloringMenuOptions}
          visibleMenu={visibleMenu}
          setVisibleMenu={setVisibleMenu}
        />
        <MenuButton onClick={handleNotesClick}>
          {t('Notes')}
        </MenuButton>
        <ToggleMenuButton
          $active={isBarSelectionMode}
          onClick={() => dispatch(setBarSelectionMode(!isBarSelectionMode))}
          title={t('Bar Selection Mode')}
        >
          {t('Bar Selection Mode')}
        </ToggleMenuButton>
        {/* 閲覧モード: 変更はできるが、ブラウザに一時保存せず、閉じれば消える(保存はできる) */}
        <ToggleMenuButton
          $active={isViewMode}
          data-view-mode-toggle
          onClick={() => {
            dispatch(setViewMode(!isViewMode));
            dispatch(setMessageInfo({
              message: isViewMode ? t('Switched to edit mode.') : t('Switched to view mode.'),
              severity: 'info',
            }));
          }}
          title={t('View Mode tooltip')}
        >
          {t('View Mode')}
        </ToggleMenuButton>
        <MenuButton onClick={() => dispatch(setActiveModal('help'))}>
          {t('Help')}
        </MenuButton>
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
      {/* タイトルはメニューと右端ボタンの間の可変領域に置く(絶対配置で中央固定にすると
          画面が狭いときメニューに重なるため、flexで縮んでクリップされるようにする) */}
      <div style={{ flex: '1 1 auto', minWidth: 0, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        <TitleSetting />
      </div>
      <div style={{ height: '100%', flex: '0 0 auto' }}>
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