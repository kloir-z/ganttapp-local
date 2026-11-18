import { useCallback, useMemo } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState, setMessageInfo } from '../reduxStoreAndSlices/store';
import {
  currentPageFileName,
  downloadProjectHtml,
  downloadProjectZip,
  saveProject,
  saveProjectAs,
  SaveContext,
  SaveOutcome,
} from '../utils/projectSave';

// 保存の操作(上書き保存・名前を付けて保存・ZIP のダウンロード・HTML の書き出し)と、その結果のメッセージ。
export const useProjectSave = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();

  const ctx = useMemo<SaveContext>(() => ({
    getState: store.getState,
    dispatch,
    confirmOverwrite: (fileName) => window.confirm(t('overwrite newer file confirm', { fileName })),
    pageFileName: currentPageFileName(),
  }), [store, dispatch, t]);

  const run = useCallback(async (
    action: () => Promise<SaveOutcome>, failedLabel: string, downloadedMessage: string
  ): Promise<SaveOutcome> => {
    try {
      const outcome = await action();
      if (outcome.status === 'saved') {
        dispatch(setMessageInfo({
          message: outcome.method === 'file' ? t('Saved to {{fileName}}.', { fileName: outcome.fileName }) : downloadedMessage,
          severity: 'success',
        }));
      }
      return outcome;
    } catch (error) {
      const detail = error instanceof Error ? error.message : t('An unknown error occurred.');
      dispatch(setMessageInfo({ message: failedLabel + detail, severity: 'error' }));
      return { status: 'cancelled' };
    }
  }, [dispatch, t]);

  const save = useCallback(
    () => run(() => saveProject(ctx), t('Save failed: '), t('HTML file downloaded successfully.')),
    [run, ctx, t]);
  const saveAs = useCallback(
    () => run(() => saveProjectAs(ctx), t('Save failed: '), t('HTML file downloaded successfully.')),
    [run, ctx, t]);
  const downloadZip = useCallback(
    (titleOverride?: string) => run(() => downloadProjectZip(ctx, titleOverride), t('Download failed: '), t('File downloaded successfully.')),
    [run, ctx, t]);
  const exportHtml = useCallback(
    () => run(() => downloadProjectHtml(ctx), t('HTML export failed: '), t('HTML file downloaded successfully.')),
    [run, ctx, t]);

  return { save, saveAs, downloadZip, exportHtml };
};
