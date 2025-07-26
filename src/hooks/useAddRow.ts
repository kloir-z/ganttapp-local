import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RowType } from '../types/DataTypes';
import { wbsDataSlice } from '../reduxStoreAndSlices/store';
import { useCallback } from 'react';

const useAddRow = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const addRow = useCallback((rowType: RowType, insertAtId: string, numberOfRows: number) => {
    const maxRowsMessage = t('Cannot add more than 999 lines.');

    dispatch(wbsDataSlice.actions.addRow({
      rowType: rowType,
      insertAtId,
      numberOfRows,
      maxRowsMessage
    }));
  }, [dispatch, t]);

  return addRow;
};

export default useAddRow;
