import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../../reduxStoreAndSlices/store';

const HistoryItem = styled.div`
  padding: 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  background: white;
  
  &:hover {
    background: #f5f5f5;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const HistoryDate = styled.div`
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 4px;
`;

const HistoryMessage = styled.div`
  font-weight: bold;
  margin-bottom: 4px;
`;

const HistoryMetadata = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
`;

const HistoryId = styled.div`
  font-size: 0.7rem;
  color: #999;
`;

const SizeInfo = styled.div`
  font-size: 0.7rem;
  color: #666;
  display: flex;
  gap: 8px;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const RestoreButton = styled.button<{ $isViewing?: boolean }>`
  padding: 4px 8px;
  background: ${props => props.$isViewing ? '#ff9800' : '#17a2b8'};
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 0.7rem;
  cursor: pointer;
  position: relative;
  font-weight: ${props => props.$isViewing ? 'bold' : 'normal'};
  
  &:hover {
    background: ${props => props.$isViewing ? '#f57c00' : '#138496'};
  }
`;

const DeleteButton = styled.button`
  padding: 4px 8px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 0.7rem;
  cursor: pointer;
  position: relative;
  
  &:hover {
    background: #c82333;
  }
`;

interface HistoryListItemProps {
  snapshot: any;
  sizeInfo: { size: string };
  onViewPast: (snapshot: any) => void;
  onDelete: (snapshotId: string) => void;
  onReturnToPresent: () => void;
}

const HistoryListItem: React.FC<HistoryListItemProps> = memo(({ 
  snapshot, 
  sizeInfo, 
  onViewPast,
  onDelete,
  onReturnToPresent
}) => {
  const { t } = useTranslation();
  const viewingSnapshotId = useSelector((state: RootState) => state.history.viewingSnapshotId);
  const isCurrentlyViewing = viewingSnapshotId === snapshot.id;
  // Memoize date formatting to prevent re-calculation on every render
  const formattedDate = useMemo(() => {
    return new Date(snapshot.timestamp).toLocaleString('ja-JP');
  }, [snapshot.timestamp]);

  return (
    <HistoryItem>
      <HistoryDate>
        {formattedDate}
      </HistoryDate>
      <HistoryMessage>{snapshot.commitMessage}</HistoryMessage>
      <HistoryMetadata>
        <HistoryId>ID: {snapshot.id}</HistoryId>
        <SizeInfo>
          <span>{sizeInfo.size}</span>
        </SizeInfo>
      </HistoryMetadata>
      <ButtonContainer>
        <RestoreButton
          $isViewing={isCurrentlyViewing}
          title={isCurrentlyViewing ? t('Return to Latest') : t('View this historical state (current work is preserved)')}
          onClick={(e) => {
            e.stopPropagation();
            if (isCurrentlyViewing) {
              onReturnToPresent();
            } else {
              onViewPast(snapshot);
            }
          }}
        >
          {isCurrentlyViewing ? t('Return to Latest') : t('View This State')}
        </RestoreButton>
        <DeleteButton
          title={t('Delete this history entry permanently')}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(snapshot.id);
          }}
        >
          {t('Delete')}
        </DeleteButton>
      </ButtonContainer>
    </HistoryItem>
  );
});

export default HistoryListItem;