// useResetReduxStates.ts
import { useDispatch } from 'react-redux';
import { resetBaseSettings, setCurrentFileId, setHolidayInput } from '../reduxStoreAndSlices/baseSettingsSlice';
import { resetColor } from '../reduxStoreAndSlices/colorSlice';
import { resetNotes } from '../reduxStoreAndSlices/notesSlice';
import { clearHistory } from '../reduxStoreAndSlices/historySlice';
import { resetStore, setColumns, setDateFormat, setHolidays } from '../reduxStoreAndSlices/store';
import { t } from 'i18next';
import { initialColumns } from '../reduxStoreAndSlices/initialColumns';
import { determineDateFormat, getInitialHolidays } from '../utils/CommonUtils';
import { useNavigate, useLocation } from 'react-router-dom';

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

        dispatch(resetStore());
        dispatch(resetNotes());
        dispatch(resetBaseSettings());
        dispatch(resetColor());
        dispatch(clearHistory());
        dispatch(setCurrentFileId(''));
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