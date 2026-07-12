import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, ExtendedColumn, setColumns, pushPastState } from '../../reduxStoreAndSlices/store';

interface RenameColumnDialogProps {
    column: ExtendedColumn | null;
    onClose: () => void;
}

// ヘッダー右クリックから列名を変更する小ダイアログ。
// 設定モーダル(ColumnRow)と同じく setColumns で columnName を書き換える。
const RenameColumnDialog: React.FC<RenameColumnDialogProps> = ({ column, onClose }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const allColumns = useSelector((state: RootState) => state.wbsData.columns);
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const maxLength = 150;

    useEffect(() => {
        if (column) {
            setName(column.columnName ?? '');
            setError('');
        }
    }, [column]);

    const handleConfirm = () => {
        if (!column) return;
        if (name.length > maxLength) {
            setError(t('Too long text.', { maxLength, inputLength: name.length }));
            return;
        }
        dispatch(pushPastState());
        dispatch(setColumns(
            allColumns.map(col =>
                col.columnId === column.columnId ? { ...col, columnName: name } : col
            )
        ));
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
    };

    return (
        <Dialog open={!!column} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{t('Rename Column')}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label={t('Column Name')}
                    type="text"
                    fullWidth
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    onKeyDown={handleKeyDown}
                    error={!!error}
                    helperText={error}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('Cancel')}</Button>
                <Button onClick={handleConfirm} color="primary">
                    {t('Rename')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RenameColumnDialog;
