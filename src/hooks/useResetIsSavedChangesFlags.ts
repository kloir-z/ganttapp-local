// useResetIsSavedChangesFlags.ts
import { useDispatch } from 'react-redux';
import { setIsSavedChangesSettings } from '../reduxStoreAndSlices/baseSettingsSlice';
import { setIsSavedChangesColor } from '../reduxStoreAndSlices/colorSlice';
import { setIsSavedChangesNotes } from '../reduxStoreAndSlices/notesSlice';
import { setIsSavedChangesStore } from '../reduxStoreAndSlices/store';

const useResetIsSavedChangesFlags = (): () => void => {
    const dispatch = useDispatch();

    const resetIsSavedChangesFlags = (): void => {
        dispatch(setIsSavedChangesColor(true));
        dispatch(setIsSavedChangesNotes(true));
        dispatch(setIsSavedChangesSettings(true));
        dispatch(setIsSavedChangesStore(true));
    };

    return resetIsSavedChangesFlags;
};

export default useResetIsSavedChangesFlags;