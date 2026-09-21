// ChartAnnotationLayer.tsx
//
// 複数行をまとめて指し示す「注釈」をチャート上に描くオーバーレイ。
//
// CpArrowsOverlay と同じ方針で、行コンポーネントの外側に 1 枚重ねる。行は仮想化
// されていて画面外の行は DOM に存在しないが、位置は行インデックスと日付インデックス
// の算術だけで決まる(ChartAnnotationGeometry)ので、スクロール位置に関係なく
// 正しく描ける。
//
// 線類(対象バーの強調枠・ブラケット・引き出し線)は 1 枚の SVG に、本文カードは
// テキスト折り返しと編集のため通常の div として描く。
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { cdate } from 'cdate';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../reduxStoreAndSlices/store';
import { WBSData, ChartAnnotation } from '../../types/DataTypes';
import {
  deleteAnnotation,
  moveAnnotation,
  updateAnnotationText,
} from '../../reduxStoreAndSlices/store';
import { setSelectedAnnotationId } from '../../reduxStoreAndSlices/uiFlagSlice';
import {
  BRACKET_WIDTH,
  CARD_WIDTH,
  computeAnnotationGeometry,
  AnnotationGeometry,
} from '../../utils/ChartAnnotationGeometry';

// 注釈のアクセント色。対象バーの枠・ブラケット・引き出し線・カード枠を同色にして
// 「このバー ↔ このカード」の対応を色で追えるようにする。
const ACCENT = '#5f6b7a';
const ACCENT_SELECTED = '#2f3b4a';
const CARD_BG = '#fffdf0';

interface ChartAnnotationLayerProps {
  filteredData: [string, WBSData][];
  dateArray: ReturnType<typeof cdate>[];
  setCanGridRefDrag: (value: boolean) => void;
}

const ChartAnnotationLayer: React.FC<ChartAnnotationLayerProps> = memo(({ filteredData, dateArray, setCanGridRefDrag }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const annotations = useSelector((state: RootState) => state.wbsData.annotations);
  const selectedId = useSelector((state: RootState) => state.uiFlags.selectedAnnotationId);
  const showAnnotations = useSelector((state: RootState) => state.uiFlags.showAnnotations);
  const isViewingPast = useSelector((state: RootState) => state.history?.isViewingPast || false);
  const isExporting = useSelector((state: RootState) => state.uiFlags.isExporting);
  const cellWidth = useSelector((state: RootState) => state.baseSettings.cellWidth);
  const rowHeight = useSelector((state: RootState) => state.baseSettings.rowHeight);

  // 編集中の注釈とその下書き。確定するまで Redux には書かない。
  const [editingId, setEditingId] = useState<string>('');
  const [draft, setDraft] = useState('');
  // ドラッグ中の一時オフセット(commit は mouseup 時の 1 回だけ)。draggingId は
  // window リスナーの張り替えを 1 ドラッグにつき 1 回に抑えるためのゲート。
  const [draggingId, setDraggingId] = useState('');
  const [dragOffset, setDragOffset] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const dragStateRef = useRef<{ id: string; startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  // 履歴プレビュー中は描かない。注釈はまだ履歴スナップショットに含めていないので、
  // 過去データの上に現在の注釈を重ねると対応がずれて見える(CP 表示と同じ判断)。
  const isActive = showAnnotations && !isViewingPast;

  const geometries = useMemo(() => {
    if (!isActive || annotations.length === 0) return [];
    const dateIndex: { [key: string]: number } = {};
    const dateKeys: string[] = [];
    dateArray.forEach((date, index) => {
      const key = date.format('YYYY-MM-DD');
      dateIndex[key] = index;
      dateKeys.push(key);
    });
    const toKey = (dateStr: string) => {
      if (!dateStr) return '';
      const parsed = cdate(dateStr);
      return isNaN(+parsed.toDate()) ? '' : parsed.format('YYYY-MM-DD');
    };
    return annotations
      .map((annotation) => {
        const applied: ChartAnnotation = dragOffset && dragOffset.id === annotation.id
          ? { ...annotation, offsetX: dragOffset.dx, offsetY: dragOffset.dy }
          : annotation;
        const geometry = computeAnnotationGeometry({
          annotation: applied, filteredData, dateIndex, dateKeys, toKey, cellWidth, rowHeight,
        });
        return geometry ? { annotation, geometry } : null;
      })
      .filter((entry): entry is { annotation: ChartAnnotation; geometry: AnnotationGeometry } => entry !== null);
  }, [isActive, annotations, dateArray, filteredData, cellWidth, rowHeight, dragOffset]);

  // カードのドラッグ移動。window で受けるのは、カード外へポインタが出ても
  // 追従させるため。
  useEffect(() => {
    if (!draggingId) return undefined;
    const onMove = (event: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      setDragOffset({
        id: drag.id,
        dx: drag.baseX + (event.clientX - drag.startX),
        dy: drag.baseY + (event.clientY - drag.startY),
      });
    };
    const onUp = () => {
      const drag = dragStateRef.current;
      dragStateRef.current = null;
      setDraggingId('');
      setCanGridRefDrag(true);
      setDragOffset((current) => {
        if (drag && current && current.id === drag.id) {
          dispatch(moveAnnotation({ id: drag.id, offsetX: current.dx, offsetY: current.dy }));
        }
        return null;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dispatch, setCanGridRefDrag, draggingId]);

  const startDrag = useCallback((event: React.MouseEvent, annotation: ChartAnnotation) => {
    // グリッドのドラッグスクロールを止める(バーのドラッグと同じ作法)。編集中も
    // テキスト選択がスクロールに化けないよう止めておく。
    event.stopPropagation();
    setCanGridRefDrag(false);
    if (editingId === annotation.id) return;
    dragStateRef.current = {
      id: annotation.id,
      startX: event.clientX,
      startY: event.clientY,
      baseX: annotation.offsetX,
      baseY: annotation.offsetY,
    };
    setDragOffset({ id: annotation.id, dx: annotation.offsetX, dy: annotation.offsetY });
    setDraggingId(annotation.id);
    dispatch(setSelectedAnnotationId(annotation.id));
  }, [dispatch, editingId, setCanGridRefDrag]);

  const commitDraft = useCallback(() => {
    if (!editingId) return;
    dispatch(updateAnnotationText({ id: editingId, text: draft }));
    setEditingId('');
  }, [dispatch, draft, editingId]);

  if (!isActive || geometries.length === 0) return null;

  return (
    <>
      {/* 線類。pointerEvents: none にしてチャート操作を邪魔しない。 */}
      <svg
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          overflow: 'visible', pointerEvents: 'none', zIndex: 8,
        }}
      >
        {geometries.map(({ annotation, geometry }) => {
          const isSelected = annotation.id === selectedId && !isExporting;
          const color = isSelected ? ACCENT_SELECTED : ACCENT;
          const cardAnchorX = geometry.cardX;
          return (
            <g key={annotation.id}>
              {/* 指し示す対象のバーを枠線で強調する。塗りは載せないので
                  バー本来の色はそのまま見える。 */}
              {geometry.bars.map((bar, index) => (
                <rect
                  key={index}
                  x={bar.x + 0.5}
                  y={bar.y + 0.5}
                  width={Math.max(1, bar.width - 1)}
                  height={Math.max(1, bar.height - 1)}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSelected ? 1.6 : 1}
                />
              ))}
              {/* 対象行を括る右向きブラケット */}
              <path
                d={`M ${geometry.bracketX} ${geometry.bracketY}
                    H ${geometry.bracketX + BRACKET_WIDTH}
                    V ${geometry.bracketY + geometry.bracketHeight}
                    H ${geometry.bracketX}`}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? 1.6 : 1}
              />
              {/* ブラケットからカードへの引き出し線(カードを動かすと斜めになる) */}
              <line
                x1={geometry.leaderX}
                y1={geometry.leaderY}
                x2={cardAnchorX}
                y2={geometry.cardCenterY}
                stroke={color}
                strokeWidth={isSelected ? 1.6 : 1}
              />
            </g>
          );
        })}
      </svg>

      {/* 本文カード */}
      {geometries.map(({ annotation, geometry }) => {
        const isSelected = annotation.id === selectedId && !isExporting;
        const isEditing = annotation.id === editingId;
        return (
          <div
            key={annotation.id}
            data-annotation-id={annotation.id}
            data-chart-overlay="true"
            style={{
              position: 'absolute',
              left: `${geometry.cardX}px`,
              top: `${geometry.cardCenterY}px`,
              transform: 'translateY(-50%)',
              width: `${CARD_WIDTH}px`,
              boxSizing: 'border-box',
              padding: '4px 6px',
              backgroundColor: CARD_BG,
              border: `1px solid ${isSelected ? ACCENT_SELECTED : ACCENT}`,
              borderRadius: '3px',
              boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.18)' : '0 1px 2px rgba(0,0,0,0.10)',
              fontSize: '12px',
              lineHeight: '1.45',
              color: '#333333',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              cursor: isEditing ? 'text' : 'move',
              zIndex: 9,
            }}
            onMouseDown={(event) => startDrag(event, annotation)}
            onClick={(event) => { event.stopPropagation(); dispatch(setSelectedAnnotationId(annotation.id)); }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              setDraft(annotation.text);
              setEditingId(annotation.id);
            }}
          >
            {isEditing ? (
              <textarea
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitDraft}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  // Esc は編集を確定して閉じる(Ctrl+Enter でも同じ)。改行は普通に入る。
                  if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
                    event.preventDefault();
                    commitDraft();
                  }
                }}
                style={{
                  width: '100%', minHeight: '48px', boxSizing: 'border-box', resize: 'vertical',
                  border: 'none', outline: 'none', background: 'transparent',
                  font: 'inherit', color: 'inherit', padding: 0,
                }}
              />
            ) : (
              annotation.text || <span style={{ color: '#9a9a9a' }}>{t('Double-click to edit')}</span>
            )}
            {isSelected && !isEditing && (
              <button
                type="button"
                title={t('Delete') ?? 'Delete'}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => { event.stopPropagation(); dispatch(deleteAnnotation(annotation.id)); }}
                style={{
                  position: 'absolute', top: '-9px', right: '-9px',
                  width: '18px', height: '18px', lineHeight: '16px', padding: 0,
                  borderRadius: '50%', border: `1px solid ${ACCENT_SELECTED}`,
                  background: '#ffffff', color: ACCENT_SELECTED,
                  fontSize: '12px', cursor: 'pointer',
                }}
              >×</button>
            )}
          </div>
        );
      })}
    </>
  );
});

export default ChartAnnotationLayer;
