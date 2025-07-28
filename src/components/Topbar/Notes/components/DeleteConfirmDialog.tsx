// DeleteConfirmDialog.tsx
import React, { memo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button as MuiButton } from "@mui/material";
import { useTranslation } from 'react-i18next';

interface DeleteConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = memo(({ 
  open, 
  onConfirm, 
  onCancel 
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        {t('Confirm Delete')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {t('Are you sure you want to delete this? This action cannot be undone.')}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <MuiButton onClick={onCancel} color="primary">
          {t('Cancel')}
        </MuiButton>
        <MuiButton onClick={onConfirm} color="primary" autoFocus>
          {t('Confirm')}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
});

export default DeleteConfirmDialog;