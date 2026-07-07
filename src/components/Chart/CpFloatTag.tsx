// CpFloatTag.tsx
// クリティカルパス表示 ON のとき、タスクのトータルフロート(稼働日)を
// バーのラベル列(タスク名・進捗の右)に小さなチップで常時表示する。
// CPネットワークに参加していないタスクには何も表示しない。
import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../reduxStoreAndSlices/store';
import { selectCriticalPath } from '../../reduxStoreAndSlices/criticalPathSelectors';

interface CpFloatTagProps {
  entryId: string;
}

const CpFloatTag: React.FC<CpFloatTagProps> = memo(({ entryId }) => {
  // プリミティブ(number | undefined)を返すので、値が変わった行だけ再レンダーされる。
  const totalFloat = useSelector((state: RootState) => {
    if (state.history?.isViewingPast || !state.uiFlags.showCriticalPath) return undefined;
    return selectCriticalPath(state).floatByTaskId[entryId];
  });

  if (totalFloat === undefined) return null;

  const isCritical = totalFloat <= 0;
  const color = isCritical ? 'rgba(229, 57, 53, 0.95)' : '#5f6b7a';
  return (
    <div
      style={{
        marginLeft: '4px',
        padding: '0 3px',
        fontSize: '9px',
        lineHeight: '13px',
        whiteSpace: 'nowrap',
        color,
        border: `1px solid ${color}`,
        borderRadius: '3px',
        backgroundColor: '#ffffffcc',
      }}
      title={`Total float: ${totalFloat}`}
    >
      {totalFloat > 0 ? `+${totalFloat}` : `${totalFloat}`}
    </div>
  );
});

CpFloatTag.displayName = 'CpFloatTag';

export default CpFloatTag;
