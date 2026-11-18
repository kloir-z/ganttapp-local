import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState, setMessageInfo } from '../reduxStoreAndSlices/store';
import { setActiveModal, setIsLoading } from '../reduxStoreAndSlices/uiFlagSlice';
import { draftSession } from '../utils/draftSession';
import type { DraftRecord } from '../utils/draftStorage';
import useResetReduxStates from './useResetReduxStates';
import useResetIsSavedChangesFlags from './useResetIsSavedChangesFlags';

// 下書きを開いてこのタブの作業にする。今の作業は(未保存なら)下書きとして残る。
export const useDraftRestore = () => {
  const dispatch = useDispatch<AppDispatch>();
  const resetReduxStates = useResetReduxStates();
  const resetIsSavedChangesFlags = useResetIsSavedChangesFlags();

  return useCallback(async (record: DraftRecord) => {
    dispatch(setIsLoading(true));
    try {
      await resetReduxStates({ skipNavigation: true });
      // 「新規作成」と同じく空の状態を保存済みにしてから読み込む(空の状態を下書きにしない)
      resetIsSavedChangesFlags();
      await draftSession.adopt(record);
    } finally {
      dispatch(setIsLoading(false));
    }
  }, [dispatch, resetReduxStates, resetIsSavedChangesFlags]);
};

// 起動が終わったら下書きの記録を始める。前回このタブで書いた未保存の下書き(再読み込み)は
// 自動で戻し、閉じたタブの未保存の下書きがあれば一覧を出す。
export const useDraftAutosave = (isLoading: boolean) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const restoreDraft = useDraftRestore();
  const startedRef = useRef(false);

  // ページを離れる・隠れるときは、待たずに書きかけを書く
  useEffect(() => {
    const flush = () => { void draftSession.flush(); };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    // 起動後に 1 回だけ。isLoading はファイルを開く間も切り替わるので startedRef で止める。
    if (isLoading || startedRef.current) return;
    startedRef.current = true;

    const begin = async () => {
      await draftSession.start(store);
      const { ownDirty, others } = await draftSession.listOtherDrafts();
      if (ownDirty) {
        await restoreDraft(ownDirty);
        dispatch(setMessageInfo({ message: t('Restored the unsaved changes from before the reload.'), severity: 'info' }));
      } else if (others.some((record) => record.status === 'dirty')) {
        dispatch(setActiveModal('drafts'));
      }
    };
    begin().catch((error) => console.error('Failed to start draft autosave:', error));
  }, [isLoading, store, restoreDraft, dispatch, t]);
};
