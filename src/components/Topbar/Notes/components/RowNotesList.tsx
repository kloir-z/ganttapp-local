// RowNotesList.tsx
// Lists every WBS row that currently has a (non-empty) row note. Selecting an
// item loads that row's note into the modal's main editor (row mode), so row
// notes can be reviewed and edited alongside tree notes from one place.
import React, { memo, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { MdStickyNote2 } from 'react-icons/md';
import { RootState } from '../../../../reduxStoreAndSlices/store';
import { setSelectedRowNoteId } from '../../../../reduxStoreAndSlices/notesSlice';
import { isEmptyRowNote } from '../../../../utils/rowNoteUtils';

const RowNotesList: React.FC = memo(() => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const rowNoteData = useSelector((state: RootState) => state.notes.rowNoteData);
  const data = useSelector((state: RootState) => state.wbsData.data);
  const selectedRowNoteId = useSelector((state: RootState) => state.notes.selectedRowNoteId);

  // Keep WBS row order, drop notes whose row no longer exists (orphans) and
  // notes that are effectively empty.
  const items = useMemo(() => {
    return Object.values(data)
      .filter((row) => !isEmptyRowNote(rowNoteData[row.id]))
      .map((row) => ({ id: row.id, no: row.no, displayName: row.displayName }));
  }, [data, rowNoteData]);

  const handleSelect = useCallback((id: string) => {
    dispatch(setSelectedRowNoteId(id));
  }, [dispatch]);

  return (
    <div style={{ borderTop: '1px solid #e0e0e0', marginTop: '4px', padding: '6px 4px 8px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#555', padding: '2px 6px 4px' }}>
        {t('Task Notes')}
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#9e9e9e', padding: '2px 6px' }}>
          {t('No task notes yet')}
        </div>
      ) : (
        items.map((item) => {
          const isSelected = item.id === selectedRowNoteId;
          return (
            <div
              key={item.id}
              onClick={() => handleSelect(item.id)}
              title={item.displayName || t('(Untitled row)')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 6px',
                fontSize: '13px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: isSelected ? '#e6f4ff' : 'transparent',
                color: isSelected ? '#1677ff' : 'inherit',
              }}
            >
              <MdStickyNote2 style={{ color: '#4a90e2', flexShrink: 0 }} />
              <span style={{ color: '#999', flexShrink: 0, minWidth: '1.5em', textAlign: 'right' }}>
                {item.no}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.displayName || t('(Untitled row)')}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
});

export default RowNotesList;
