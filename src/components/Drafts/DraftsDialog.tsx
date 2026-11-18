// ブラウザ内に残っている下書きの一覧。activeModal === 'drafts' で表示される。
// 起動時に閉じたタブの未保存の下書きがあれば自動で開き、ファイルメニューの「下書き」からも開ける。
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { setActiveModal } from '../../reduxStoreAndSlices/uiFlagSlice';
import { AppDispatch, RootState, setMessageInfo } from '../../reduxStoreAndSlices/store';
import { draftRelation, DraftRelation, draftSession } from '../../utils/draftSession';
import { v4 as uuidv4 } from 'uuid';
import type { DraftRecord } from '../../utils/draftStorage';
import { EXPORT_SCHEMA_VERSION, serializeToZip } from '../../utils/ExportImportHandler';
import { downloadBlob } from '../../utils/downloadBlob';
import { useDraftRestore } from '../../hooks/useDraftAutosave';

const DraftsDialog: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t, i18n } = useTranslation();
  const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);
  const restoreDraft = useDraftRestore();
  const [drafts, setDrafts] = useState<DraftRecord[] | null>(null);
  const isOpen = activeModal === 'drafts';
  const projectId = useSelector((state: RootState) => state.baseSettings.projectId);
  const revisionId = useSelector((state: RootState) => state.baseSettings.revisionId);

  const reload = useCallback(async () => {
    const { ownDirty, others } = await draftSession.listOtherDrafts();
    setDrafts(ownDirty ? [ownDirty, ...others] : others);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setDrafts(null);
      return;
    }
    reload().catch((error) => {
      console.error('Failed to list drafts:', error);
      setDrafts([]);
    });
  }, [isOpen, reload]);

  const handleClose = useCallback(() => dispatch(setActiveModal(null)), [dispatch]);

  const handleOpen = useCallback(async (record: DraftRecord) => {
    dispatch(setActiveModal(null));
    try {
      await restoreDraft(record);
      dispatch(setMessageInfo({ message: t('Opened the draft.'), severity: 'success' }));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      dispatch(setMessageInfo({ message: t('Failed to open the draft: ') + detail, severity: 'error' }));
    }
  }, [dispatch, restoreDraft, t]);

  const handleDownload = useCallback(async (record: DraftRecord) => {
    // 下書きの版の ID は編集を始めた版のもの。そのまま書くと中身の違うファイルが同じ版を名乗るので作り直す。
    const blob = await serializeToZip(record.draftId, { ...record.project, revisionId: uuidv4() });
    downloadBlob(blob, `${record.title || 'gantt-chart'}.zip`);
  }, []);

  const handleRemove = useCallback(async (record: DraftRecord) => {
    await draftSession.remove(record.draftId);
    await reload();
  }, [reload]);

  if (!isOpen) return null;

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
  // いま開いているファイルの続きの下書きを先頭に、同じプロジェクトの別の版、ほかのプロジェクトの順に並べる
  const relationOf = (record: DraftRecord) => draftRelation(record, projectId, revisionId);
  const relationRank: Record<DraftRelation, number> = { continuation: 0, otherVersion: 1, otherProject: 2 };
  const sortedDrafts = drafts === null ? [] : [...drafts].sort((a, b) =>
    relationRank[relationOf(a)] - relationRank[relationOf(b)] || b.updatedAt - a.updatedAt);

  return (
    <Dialog open={true} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('Drafts')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {t('Drafts description')}
        </Typography>
        {drafts === null ? null : drafts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">{t('No drafts.')}</Typography>
        ) : (
          <List dense disablePadding>
            {sortedDrafts.map((record) => (
              <ListItem
                key={record.draftId}
                divider
                data-draft-id={record.draftId}
                sx={{ alignItems: 'flex-start', flexDirection: 'column', gap: 0.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <ListItemText
                    primary={record.title || t('(Untitled)')}
                    secondary={`${dateFormatter.format(record.updatedAt)} ・ ${t('draft rows', { count: record.rowCount })}`}
                  />
                  {relationOf(record) === 'continuation' && (
                    <Chip size="small" color="success" variant="outlined" label={t('Continues this file')}
                      title={t('Continues this file tooltip')} />
                  )}
                  {relationOf(record) === 'otherVersion' && (
                    <Chip size="small" color="info" variant="outlined" label={t('From another version')}
                      title={t('From another version tooltip')} />
                  )}
                  <Chip
                    size="small"
                    color={record.status === 'dirty' ? 'warning' : 'default'}
                    label={record.status === 'dirty' ? t('Unsaved') : t('Saved')}
                  />
                </Box>
                {record.schemaVersion > EXPORT_SCHEMA_VERSION && (
                  <Alert severity="warning" sx={{ py: 0, width: '100%' }}>
                    {t('This draft was written by a newer version of the app. Some data may not load correctly.')}
                  </Alert>
                )}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="contained" onClick={() => handleOpen(record)}>{t('Open')}</Button>
                  <Button size="small" onClick={() => handleDownload(record)}>{t('Download as ZIP')}</Button>
                  <Button size="small" color="error" onClick={() => handleRemove(record)}>{t('Discard')}</Button>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('Close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DraftsDialog;
