import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDispatch, useStore } from 'react-redux';
import { RootState, setMessageInfo } from '../../reduxStoreAndSlices/store';
import { setIsLoading } from '../../reduxStoreAndSlices/uiFlagSlice';
import { handleImport, buildExportOptionsFromState, buildProjectData } from '../../utils/ExportImportHandler';
import useResetReduxStates from '../../hooks/useResetReduxStates';
import useResetIsSavedChangesFlags from '../../hooks/useResetIsSavedChangesFlags';

interface JsonDataModalProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`json-tabpanel-${index}`}
      aria-labelledby={`json-tab-${index}`}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const JsonDataModal: React.FC<JsonDataModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const resetReduxStates = useResetReduxStates();
  const resetIsSavedChangesFlags = useResetIsSavedChangesFlags();

  const [tabValue, setTabValue] = useState(0);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
  }, []);

  const handleExportJson = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // ZIP に入れる JSON と同じもの(serializeToZip と同じ整形)
      const projectData = buildProjectData(buildExportOptionsFromState(store.getState()));
      setJsonOutput(JSON.stringify(projectData, null, 2));

      dispatch(setMessageInfo({
        message: t('JSON data exported successfully.'),
        severity: 'success'
      }));
    } catch (error) {
      const errorMessage = error instanceof Error
        ? t('Export failed: ') + error.message
        : t('Export failed. An unknown error occurred.');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [store, dispatch, t]);

  const handleImportJson = useCallback(async () => {
    if (!jsonInput.trim()) {
      setError(t('Please enter JSON data.'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const projectData = JSON.parse(jsonInput);

      // Create a temporary blob to use with existing import handler
      const jsonBlob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });

      dispatch(setIsLoading(true));
      await resetReduxStates();

      // Use the existing import handler
       
      await dispatch(handleImport({ file: jsonBlob }) as any);

      resetIsSavedChangesFlags();

      dispatch(setMessageInfo({
        message: t('JSON data imported successfully.'),
        severity: 'success'
      }));

      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error
        ? t('Import failed: ') + error.message
        : t('Import failed. Invalid JSON format.');
      setError(errorMessage);
    } finally {
      setLoading(false);
      dispatch(setIsLoading(false));
    }
  }, [jsonInput, dispatch, resetReduxStates, resetIsSavedChangesFlags, onClose, t]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonOutput);
      dispatch(setMessageInfo({
        message: t('JSON data copied to clipboard.'),
        severity: 'success'
      }));
    } catch (error) {
      dispatch(setMessageInfo({
        message: t('Failed to copy to clipboard.'),
        severity: 'error'
      }));
    }
  }, [jsonOutput, dispatch, t]);

  const handleClose = useCallback(() => {
    setJsonInput('');
    setJsonOutput('');
    setError('');
    setTabValue(0);
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        {t('JSON Data Management')}
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={t('Export JSON')} />
            <Tab label={t('Import JSON')} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="body2" gutterBottom>
            {t('Export current project data as JSON format.')}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              onClick={handleExportJson}
              disabled={loading}
            >
              {loading ? t('Exporting...') : t('Generate JSON')}
            </Button>
          </Box>

          {jsonOutput && (
            <Box>
              <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">
                  {t('Generated JSON:')}
                </Typography>
                <Button
                  size="small"
                  onClick={handleCopyToClipboard}
                  variant="outlined"
                >
                  {t('Copy to Clipboard')}
                </Button>
              </Box>
              <Paper variant="outlined" sx={{ p: 1, maxHeight: 400, overflow: 'auto' }}>
                <TextField
                  multiline
                  value={jsonOutput}
                  fullWidth
                  variant="outlined"
                  InputProps={{
                    readOnly: true,
                    style: {
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      padding: 0
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { border: 'none' }
                    }
                  }}
                />
              </Paper>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="body2" gutterBottom>
            {t('Import project data from JSON format.')}
          </Typography>

          <TextField
            multiline
            rows={15}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={t('Paste JSON data here...')}
            fullWidth
            variant="outlined"
            sx={{ mb: 2 }}
            InputProps={{
              style: {
                fontFamily: 'monospace',
                fontSize: '12px'
              }
            }}
          />

          <Button
            variant="contained"
            onClick={handleImportJson}
            disabled={loading || !jsonInput.trim()}
            fullWidth
          >
            {loading ? t('Importing...') : t('Import JSON')}
          </Button>
        </TabPanel>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {t('Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JsonDataModal;