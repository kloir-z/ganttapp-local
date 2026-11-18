import React, { useEffect } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { AppDispatch, RootState, setMessageInfo } from '../../reduxStoreAndSlices/store';
import { setLanguage } from '../../reduxStoreAndSlices/baseSettingsSlice';
import i18n from "i18next";
import { setActiveModal, setIsLoading, setViewMode } from '../../reduxStoreAndSlices/uiFlagSlice';
import LocalComponents from '../Authenticated/LocalComponents';
import useResetReduxStates from '../../hooks/useResetReduxStates';
import useResetIsSavedChangesFlags from '../../hooks/useResetIsSavedChangesFlags';
import { WelcomeUtils } from '../../utils/WelcomeUtils';
import { readEmbeddedProjectData } from '../../utils/HtmlSnapshotExport';
import { handleImport } from '../../utils/ExportImportHandler';
import { useDraftAutosave } from '../../hooks/useDraftAutosave';
import { draftSession } from '../../utils/draftSession';
import { loadSavedFileHandle } from '../../utils/draftStorage';
import { decideInitialViewMode, readRememberedViewMode, rememberViewMode } from '../../utils/viewMode';

const LocalApp: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const resetReduxStates = useResetReduxStates();
    const resetIsSavedChangesFlags = useResetIsSavedChangesFlags();
    const isLoading = useSelector((state: RootState) => state.uiFlags.isLoading);
    const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);
    const isViewMode = useSelector((state: RootState) => state.uiFlags.isViewMode);
    const store = useStore<RootState>();
    // 未保存の変更をブラウザ内の下書きに書き続ける(起動が終わってから始める)
    useDraftAutosave(isLoading);

    useEffect(() => {
        // Project data baked into an exported HTML snapshot, if this document is one.
        const embeddedData = readEmbeddedProjectData();
        // 同じタブで再読み込みしたときのモード。下の useEffect が書き換える前に読んでおく。
        const rememberedViewMode = readRememberedViewMode();
        const initializeLocalApp = async () => {
            try {
                dispatch(setLanguage(i18n.language));
                await resetReduxStates({ skipNavigation: true });
                // Auto-load the embedded snapshot so the finished chart appears on open.
                if (embeddedData) {
                    try {
                        const blob = new Blob([JSON.stringify(embeddedData)], { type: 'application/json' });
                        await dispatch(handleImport({ file: blob }));
                    } catch (error) {
                        console.error('Failed to load embedded project data:', error);
                    }
                }
                // 起動直後の空のプロジェクト(または埋め込みデータ)を保存済みとして始める。
                // 「新規作成」と同じ扱い。こうしないと何も編集していないのに未保存になり、
                // ほかのプロジェクトに切り替えたときに空のプロジェクトが下書きとして残る。
                resetIsSavedChangesFlags();
                // 書き出した HTML は、自分が保存したことのないものなら閲覧モードで開く
                if (embeddedData) {
                    const { projectId } = store.getState().baseSettings;
                    const [savedHandle, hasDirtyDraft] = await Promise.all([
                        loadSavedFileHandle(projectId).catch(() => undefined),
                        draftSession.storageHasDirtyDraft(projectId).catch(() => false),
                    ]);
                    const isView = decideInitialViewMode({
                        hasEmbeddedData: true,
                        rememberedViewMode,
                        hasSavedFileHandle: savedHandle !== undefined,
                        hasDirtyDraft,
                    });
                    dispatch(setViewMode(isView));
                    if (isView) {
                        dispatch(setMessageInfo({ message: i18n.t('Opened in view mode.'), severity: 'info' }));
                    }
                }
                dispatch(setIsLoading(false));
            } catch (error) {
                console.error('Error initializing local app:', error);
            }
        };
        initializeLocalApp();
        // Suppress the welcome modal when opening an exported snapshot.
        if (!embeddedData && WelcomeUtils.isFirstLogin() && activeModal !== 'welcome') {
            dispatch(setActiveModal('welcome'));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 選んだモードをタブに覚えておく(同じタブで再読み込みしたら引き継ぐ)。起動中は初期値なので書かない。
    useEffect(() => {
        if (!isLoading) rememberViewMode(isViewMode);
    }, [isLoading, isViewMode]);

    // CSP は実行時注入ではなくビルド時に index.html へ静的に埋め込む
    // （vite.config.ts の inject-csp-meta プラグインを参照）。
    return (
        <>
            {!isLoading ? <LocalComponents /> : <div style={{ padding: '10px' }}>Loading...</div>}
        </>
    );
};

export default LocalApp;