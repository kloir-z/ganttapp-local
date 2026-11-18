import { useCallback } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { RootState, setMessageInfo } from '../reduxStoreAndSlices/store';
import { buildExportOptionsFromState, buildProjectData } from '../utils/ExportImportHandler';
import { useTranslation } from 'react-i18next';

export const useJsonExport = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const store = useStore<RootState>();

    const exportAndCopyJson = useCallback(async () => {
        try {
            // ZIP に入れる JSON と同じもの(serializeToZip と同じ整形)
            const projectData = buildProjectData(buildExportOptionsFromState(store.getState()));
            const jsonString = JSON.stringify(projectData, null, 2);

            await navigator.clipboard.writeText(jsonString);

            dispatch(setMessageInfo({
                message: t('JSON data generated and copied to clipboard.'),
                severity: 'success'
            }));

            return jsonString;
        } catch (error) {
            const errorMessage = error instanceof Error
                ? t('JSON export failed: ') + error.message
                : t('JSON export failed. An unknown error occurred.');
            dispatch(setMessageInfo({
                message: errorMessage,
                severity: 'error'
            }));
            throw error;
        }
    }, [store, dispatch, t]);

    return { exportAndCopyJson };
};
