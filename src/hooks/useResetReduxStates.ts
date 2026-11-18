// useResetReduxStates.ts
import { useDispatch } from 'react-redux';
import { resetBaseSettings, setCurrentFileId, setHolidayInput, setProjectId } from '../reduxStoreAndSlices/baseSettingsSlice';
import { resetColor } from '../reduxStoreAndSlices/colorSlice';
import { setViewMode } from '../reduxStoreAndSlices/uiFlagSlice';
import { resetNotes } from '../reduxStoreAndSlices/notesSlice';
import { resetStore, setColumns, setDateFormat, setHolidays } from '../reduxStoreAndSlices/store';
import { t } from 'i18next';
import { initialColumns } from '../reduxStoreAndSlices/initialColumns';
import { determineDateFormat, getInitialHolidays } from '../utils/CommonUtils';
import { useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { draftSession } from '../utils/draftSession';

interface ResetOptions {
    skipNavigation?: boolean;
    isLocalMode?: boolean;
}

const useResetReduxStates = (): (options?: ResetOptions) => Promise<void> => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const dateFormat = determineDateFormat();

    const resetReduxStates = async (options: ResetOptions = {}): Promise<void> => {
        const { skipNavigation = false, isLocalMode } = options;

        // 別のプロジェクトに切り替える前に、書きかけの下書きをタブから切り離して残す
        // (中身はこの時点で取るので、続く reset より前に呼ぶ)。
        void draftSession.detach();

        dispatch(resetStore());
        dispatch(resetNotes());
        dispatch(resetBaseSettings());
        dispatch(resetColor());
        dispatch(setCurrentFileId(''));
        dispatch(setProjectId(uuidv4()));
        // 新規作成・ファイルを開く・下書きを開くのは作業を始める操作なので、編集モードに戻す
        dispatch(setViewMode(false));
        dispatch(setDateFormat(dateFormat));

        if (!skipNavigation) {
            const shouldUseLocalMode = isLocalMode ?? location.pathname.startsWith('/local');
            if (shouldUseLocalMode) {
                navigate(`/local`, { replace: true });
            } else {
                navigate(`/app`, { replace: true });
            }
        }

        try {
            const { holidayInput, parsedHolidays } = await getInitialHolidays(dateFormat);
            dispatch(setHolidayInput(holidayInput));
            dispatch(setHolidays(parsedHolidays));
        } catch (error) {
            console.error('Error fetching initial holidays:', error);
        }

        const translatedColumns = initialColumns.map(column => ({
            ...column,
            columnName: t(column.columnName ?? ""),
        }));
        dispatch(setColumns(translatedColumns));
    };

    return resetReduxStates;
};

export default useResetReduxStates;