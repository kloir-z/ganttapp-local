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
import { useDispatch, useSelector } from 'react-redux';
import { RootState, setMessageInfo } from '../../reduxStoreAndSlices/store';
import { setIsLoading } from '../../reduxStoreAndSlices/uiFlagSlice';
import { handleImport, handleExport } from '../../utils/ExportImportHandler';
import useResetReduxStates from '../../hooks/useResetReduxStates';
import useResetIsSavedChangesFlags from '../../hooks/useResetIsSavedChangesFlags';
import { v4 as uuidv4 } from 'uuid';

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
  const resetReduxStates = useResetReduxStates();
  const resetIsSavedChangesFlags = useResetIsSavedChangesFlags();

  const [tabValue, setTabValue] = useState(0);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redux state for export
  const colors = useSelector((state: RootState) => state.color.colors);
  const dateRange = useSelector((state: RootState) => state.baseSettings.dateRange);
  const columns = useSelector((state: RootState) => state.wbsData.columns);
  const data = useSelector((state: RootState) => state.wbsData.data);
  const holidayInput = useSelector((state: RootState) => state.baseSettings.holidayInput);
  const holidayColor = useSelector((state: RootState) => state.wbsData.holidayColor);
  const regularDaysOffSetting = useSelector((state: RootState) => state.wbsData.regularDaysOffSetting);
  const wbsWidth = useSelector((state: RootState) => state.baseSettings.wbsWidth);
  const calendarWidth = useSelector((state: RootState) => state.baseSettings.calendarWidth);
  const cellWidth = useSelector((state: RootState) => state.baseSettings.cellWidth);
  const title = useSelector((state: RootState) => state.baseSettings.title);
  const showYear = useSelector((state: RootState) => state.wbsData.showYear);
  const dateFormat = useSelector((state: RootState) => state.wbsData.dateFormat);
  const treeData = useSelector((state: RootState) => state.notes.treeData);
  const noteData = useSelector((state: RootState) => state.notes.noteData);
  const treeExpandedKeys = useSelector((state: RootState) => state.notes.treeExpandedKeys);
  const treeScrollPosition = useSelector((state: RootState) => state.notes.treeScrollPosition);
  const editorStates = useSelector((state: RootState) => state.notes.editorStates);
  const selectedNodeKey = useSelector((state: RootState) => state.notes.selectedNodeKey);
  const currentLanguage = useSelector((state: RootState) => state.baseSettings.language);
  const scrollPosition = useSelector((state: RootState) => state.baseSettings.scrollPosition);
  const notesModalState = useSelector((state: RootState) => state.notes.modalState);
  const historySnapshots = useSelector((state: RootState) => state.history?.snapshots || []);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
  }, []);

  const handleExportJson = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const zipBlob = await handleExport(
        uuidv4(),
        colors,
        dateRange,
        columns,
        data,
        holidayInput,
        holidayColor,
        regularDaysOffSetting,
        wbsWidth,
        calendarWidth,
        cellWidth,
        title,
        showYear,
        dateFormat,
        treeData,
        noteData,
        currentLanguage,
        scrollPosition,
        notesModalState,
        treeExpandedKeys,
        treeScrollPosition,
        editorStates,
        selectedNodeKey,
        historySnapshots,
      );

      // Extract JSON from ZIP for display
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(zipBlob);
      const jsonFileEntry = Object.values(loadedZip.files).find(file => file.name.endsWith('.json'));
      if (!jsonFileEntry) throw new Error("No JSON file found in ZIP");
      const jsonString = await jsonFileEntry.async("string");
      
      setJsonOutput(jsonString);

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
  }, [
    colors, dateRange, columns, data, holidayInput, holidayColor,
    regularDaysOffSetting, wbsWidth, calendarWidth, cellWidth, title,
    showYear, dateFormat, treeData, noteData, currentLanguage, scrollPosition, notesModalState, historySnapshots, dispatch, t
  ]);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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