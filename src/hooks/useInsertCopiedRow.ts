
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { WBSData } from '../types/DataTypes';
import { wbsDataSlice } from '../reduxStoreAndSlices/store';
import { useCallback } from 'react';

const useInsertCopiedRow = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const insertCopiedRow = useCallback((insertAtId: string, copiedRows: WBSData[]) => {
    const maxRowsMessage = t('Cannot add more than 999 lines.');

    dispatch(wbsDataSlice.actions.insertCopiedRow({
      insertAtId,
      copiedRows,
      maxRowsMessage
    }));
  }, [dispatch, t]);

  return insertCopiedRow;
};

export default useInsertCopiedRow;
