import React, { useState, useEffect, memo, useRef, useCallback } from 'react';
import { clearMessageInfo, ExtendedColumn, setMessageInfo } from '../../../reduxStoreAndSlices/store';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

type ColumnRowProps = {
  column: ExtendedColumn;
  updateColumnName: (columnId: string, newName: string) => void;
  toggleColumnVisibility: (columnId: string) => void;
};

const ColumnRow: React.FC<ColumnRowProps> = memo(({ column, updateColumnName, toggleColumnVisibility }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [localColumnName, setLocalColumnName] = useState(column.columnName);
  const aliasTimeoutRef = useRef<number | null>(null);
  const maxLength = 150;

  const validateTextLength = (text: string, maxLength: number) => {
    const length = text.length;
    return length <= maxLength;
  };

  const resetAliasTimeout = useCallback(() => {
    if (aliasTimeoutRef.current) {
      clearTimeout(aliasTimeoutRef.current);
    }
    aliasTimeoutRef.current = window.setTimeout(() => {

      if (validateTextLength(localColumnName, maxLength)) {
        updateColumnName(column.columnId, localColumnName);
      } else {
        dispatch(clearMessageInfo());
        const errorMessage = t('Too long text.', { maxLength, inputLength: localColumnName.length });
        dispatch(setMessageInfo({ message: errorMessage, severity: 'error' }));
      }
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [column.columnId, localColumnName]);

  useEffect(() => {
    resetAliasTimeout();
  }, [localColumnName, resetAliasTimeout]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
      <input
        type="checkbox"
        checked={column.visible}
        onChange={() => toggleColumnVisibility(column.columnId)}
      />
      <span onClick={() => toggleColumnVisibility(column.columnId)} style={{ 
        width: '110px', 
        marginRight: '10px', 
        cursor: 'pointer',
        fontFamily: 'inherit'
      }}>
        {t(column.columnId)}
      </span>
      <input
        type="text"
        value={localColumnName}
        onChange={(e) => setLocalColumnName(e.target.value)}
        style={{
          height: '28px',
          padding: '6px 12px',
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          fontFamily: 'inherit',
          background: '#ffffff',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          outline: 'none',
          minWidth: '120px',
          boxSizing: 'border-box',
          marginRight: '10px'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#1976d2';
          e.target.style.boxShadow = '0 0 0 2px rgba(25, 118, 210, 0.2)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e0e0e0';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
});

export default ColumnRow;