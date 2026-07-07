// src/components/Help/HelpTopicContent.tsx
// helpTopics.ts の HelpBlock[] を MUI 要素に変換する純粋なレンダラ。
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Typography } from '@mui/material';
import { HelpBlock, HelpTopic } from './helpTopics';

const codeSx = {
  display: 'inline-block',
  backgroundColor: '#e9ecef',
  borderRadius: '4px',
  px: 1,
  py: 0.25,
  fontFamily: 'monospace',
  fontSize: '0.875rem',
} as const;

const renderBlock = (block: HelpBlock, index: number, t: (key: string) => string) => {
  switch (block.type) {
    case 'heading':
      return (
        <Typography key={index} variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
          {t(block.key)}
        </Typography>
      );
    case 'paragraph':
      return (
        <Typography key={index} variant="body2" sx={{ mb: 1.5, lineHeight: 1.7 }}>
          {t(block.key)}
        </Typography>
      );
    case 'code':
      return (
        <Box key={index} sx={{ ...codeSx, display: 'block', mb: 1.5, p: 1 }}>
          {t(block.key)}
        </Box>
      );
    case 'example':
      return (
        <Box key={index} sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.75, ml: 1 }}>
          <Box sx={{ ...codeSx, flexShrink: 0 }}>
            {block.code ?? t(block.codeKey ?? '')}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t(block.descKey)}
          </Typography>
        </Box>
      );
    case 'note':
      return (
        <Alert key={index} severity="warning" sx={{ mt: 2 }}>
          {block.keys.map((key) => (
            <Typography key={key} variant="body2">
              • {t(key)}
            </Typography>
          ))}
        </Alert>
      );
  }
};

interface HelpTopicContentProps {
  topic: HelpTopic;
}

const HelpTopicContent: React.FC<HelpTopicContentProps> = memo(({ topic }) => {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
        {t(topic.titleKey)}
      </Typography>
      {topic.blocks.map((block, index) => renderBlock(block, index, t))}
    </Box>
  );
});

HelpTopicContent.displayName = 'HelpTopicContent';

export default HelpTopicContent;
