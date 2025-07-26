import React, { memo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setShowYear } from '../../../reduxStoreAndSlices/store';
import { setColumns, toggleColumnVisibility } from '../../../reduxStoreAndSlices/store';
import ColumnRow from './ColumnRow';
import SettingChildDiv from '../SettingChildDiv';
import { useTranslation } from 'react-i18next';
import Switch from '@mui/material/Switch/Switch';

const ColumnSetting: React.FC = memo(() => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const allColumns = useSelector((state: RootState) => state.wbsData.columns);
  const showYear = useSelector((state: RootState) => state.wbsData.showYear);
  const initialColumnOrder = [
    'displayName', 'color', 'plannedStartDate', 'plannedEndDate',
    'plannedDays', 'actualStartDate', 'actualEndDate', 'progress', 'dependency',
    'textColumn1', 'textColumn2', 'textColumn3', 'isIncludeHolidays'
  ];
  const filteredColumns = initialColumnOrder
    .map(id => allColumns.find(col => col.columnId === id))
    .filter(col => col !== undefined && col.columnId !== 'no') as typeof allColumns;

  const updateColumnName = (columnId: string, newName: string) => {
    dispatch(setColumns(
      allColumns.map(column =>
        column.columnId === columnId ? { ...column, columnName: newName } : column
      )
    ));
  };

  const handleShowYearChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    dispatch(setShowYear(isChecked));
  }, [dispatch]);

  return (
    <>
      <SettingChildDiv text={t('Column (Visiblity & Name)')}>
        {filteredColumns.map(column => (
          <ColumnRow
            key={column.columnId}
            column={column}
            updateColumnName={updateColumnName}
            toggleColumnVisibility={() => dispatch(toggleColumnVisibility(column.columnId))}
          />
        ))}
      </SettingChildDiv>
      <SettingChildDiv text={t('Date Cell Format')}>
        <div>
          <label>{t('Short(e.g. M/d)')}</label>
          <Switch
            checked={showYear}
            onChange={handleShowYearChange}
            name="showYearSwitch"
          />
          <label>{t('Long(e.g. y/M/d)')}</label>
        </div>
      </SettingChildDiv>
    </>
  );
});

export default ColumnSetting;