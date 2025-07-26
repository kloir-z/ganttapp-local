import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../reduxStoreAndSlices/store';
import { closeRowDialog } from '../../reduxStoreAndSlices/rowDialogSlice';
import useAddRow from '../../hooks/useAddRow';

const CustomRowCountDialogContainer: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const addRow = useAddRow();

    const { isOpen, rowType, insertAtId, maxRows } = useSelector(
        (state: RootState) => state.rowDialog
    );

    const [rowCount, setRowCount] = useState('');
    const [error, setError] = useState('');

    const handleClose = () => {
        setRowCount('');
        setError('');
        dispatch(closeRowDialog());
    };

    const handleConfirm = () => {
        const count = parseInt(rowCount, 10);

        if (isNaN(count)) {
            setError(t('Please enter a valid number'));
            return;
        }

        if (count < 1) {
            setError(t('Number must be at least 1'));
            return;
        }

        if (count > maxRows) {
            setError(t('Cannot exceed {{max}} rows', { max: maxRows }));
            return;
        }

        if (rowType) {
            addRow(rowType, insertAtId, count);
        }
        handleClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Only allow positive integers
        if (value === '' || /^[1-9]\d*$/.test(value)) {
            setRowCount(value);
            setError('');
        }
    };

    if (!isOpen || !rowType) {
        return null;
    }

    return (
        <Dialog open={isOpen} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle>{t('Add {{type}} Rows', { type: t(rowType) })}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {t('Enter the number of rows to add (1-{{max}})', { max: maxRows })}
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    label={t('Number of Rows')}
                    type="text"
                    fullWidth
                    value={rowCount}
                    onChange={handleChange}
                    error={!!error}
                    helperText={error}
                    inputProps={{
                        inputMode: 'numeric',
                        pattern: '[0-9]*'
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{t('Cancel')}</Button>
                <Button onClick={handleConfirm} color="primary">
                    {t('Add')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CustomRowCountDialogContainer;