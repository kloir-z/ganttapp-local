// src/components/Help/HelpModal.tsx
// トピック別の使い方ガイド。activeModal === 'help' で表示される
// (WelcomeModal と同じ activeModal 駆動 + MUI Dialog パターン)。
// 左がトピックのナビ、右が選択トピックの本文。
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { setActiveModal } from '../../reduxStoreAndSlices/uiFlagSlice';
import { AppDispatch, RootState } from '../../reduxStoreAndSlices/store';
import { helpTopics } from './helpTopics';
import HelpTopicContent from './HelpTopicContent';

const HelpModal: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);
  const { t } = useTranslation();
  const [selectedTopicId, setSelectedTopicId] = useState(helpTopics[0].id);

  const selectedTopic = helpTopics.find((topic) => topic.id === selectedTopicId) ?? helpTopics[0];

  return (
    (activeModal === 'help') && (
      <Dialog
        open={true}
        onClose={() => dispatch(setActiveModal(null))}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle>{t('help.title')}</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', p: 0, overflow: 'hidden' }}>
          <List
            sx={{
              width: 220,
              flexShrink: 0,
              overflowY: 'auto',
              borderRight: 1,
              borderColor: 'divider',
              py: 0,
            }}
          >
            {helpTopics.map((topic) => (
              <ListItemButton
                key={topic.id}
                selected={topic.id === selectedTopicId}
                onClick={() => setSelectedTopicId(topic.id)}
              >
                <ListItemText
                  primary={t(topic.titleKey)}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItemButton>
            ))}
          </List>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
            <HelpTopicContent topic={selectedTopic} />
          </Box>
        </DialogContent>
      </Dialog>
    )
  );
};

export default HelpModal;
