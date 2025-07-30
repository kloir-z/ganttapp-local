import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../reduxStoreAndSlices/store';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useHistoryModal } from './hooks/useHistoryModal';
import HistoryListItem from './components/HistoryListItem';
import SettingsModalDiv from '../Setting/SettingsModalDiv';

const ControlsSection = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
  min-width: 200px;
`;

const Button = styled.button`
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: #0056b3;
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const HistoryList = styled.div`
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
  margin: 0 20px 20px 20px;
`;

const EmptyState = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #666;
  font-style: italic;
`;

const HistoryModal: React.FC = memo(() => {
  const { t } = useTranslation();
  const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);
  
  const {
    snapshots,
    commitMessage,
    setCommitMessage,
    isCreatingSnapshot,
    isViewingPast,
    handleCreateSnapshot,
    handleViewPast,
    handleDeleteSnapshot,
    handleReturnToPresent
  } = useHistoryModal();

  return (
    (activeModal === 'history') &&
    <SettingsModalDiv>
      <ControlsSection>
        <Input
          type="text"
          placeholder={t('Enter comment...')}
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCreateSnapshot()}
        />
        <Button 
          onClick={handleCreateSnapshot}
          disabled={isCreatingSnapshot || !commitMessage.trim() || isViewingPast}
        >
          {isCreatingSnapshot ? t('Creating...') : t('Create History Data')}
        </Button>
      </ControlsSection>

      <HistoryList>
        {snapshots.length === 0 ? (
          <EmptyState>{t('No history available')}</EmptyState>
        ) : (
          snapshots.map(snapshot => (
            <HistoryListItem
              key={snapshot.id}
              snapshot={snapshot}
              sizeInfo={snapshot.sizeInfo}
              onViewPast={handleViewPast}
              onDelete={handleDeleteSnapshot}
              onReturnToPresent={handleReturnToPresent}
            />
          ))
        )}
      </HistoryList>
    </SettingsModalDiv>
  );
});

export default HistoryModal;