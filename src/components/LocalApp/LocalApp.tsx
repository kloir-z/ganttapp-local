import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../reduxStoreAndSlices/store';
import { setLanguage } from '../../reduxStoreAndSlices/baseSettingsSlice';
import i18n from "i18next";
import { setActiveModal, setIsLoading } from '../../reduxStoreAndSlices/uiFlagSlice';
import LocalComponents from '../Authenticated/LocalComponents';
import useResetReduxStates from '../../hooks/useResetReduxStates';
import { WelcomeUtils } from '../../utils/WelcomeUtils';
import { readEmbeddedProjectData } from '../../utils/HtmlSnapshotExport';
import { handleImport } from '../../utils/ExportImportHandler';

const LocalApp: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const resetReduxStates = useResetReduxStates();
    const isLoading = useSelector((state: RootState) => state.uiFlags.isLoading);
    const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);

    useEffect(() => {
        // Project data baked into an exported HTML snapshot, if this document is one.
        const embeddedData = readEmbeddedProjectData();
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

    // CSP は実行時注入ではなくビルド時に index.html へ静的に埋め込む
    // （vite.config.ts の inject-csp-meta プラグインを参照）。
    return (
        <>
            {!isLoading ? <LocalComponents /> : <div style={{ padding: '10px' }}>Loading...</div>}
        </>
    );
};

export default LocalApp;