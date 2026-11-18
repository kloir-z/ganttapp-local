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
  deleteAnnotations,
  moveAnnotation,
  updateAnnotationText,
} from '../../reduxStoreAndSlices/store';
import {
  clearSelectedAnnotations,
  setSelectedAnnotationIds,
  toggleSelectedAnnotation,
} from '../../reduxStoreAndSlices/uiFlagSlice';
import ContextMenu from '../ContextMenu/ContextMenu';
import { MenuItemProps } from '../MenuItem';
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
// 選択中の注釈が指す対象バーの目印。バー自身の濃い枠と見分けがつくよう、薄い赤系にする。
const TARGET_MARK = 'rgba(229, 72, 77, 0.6)';

interface ChartAnnotationLayerProps {
  filteredData: [string, WBSData][];
  // 折りたたみ前の全行ID(表示順)。隠れた端点をセパレータへ付け替えるため。
  allRowIds: string[];
  dateArray: ReturnType<typeof cdate>[];
  setCanGridRefDrag: (value: boolean) => void;
}

const ChartAnnotationLayer: React.FC<ChartAnnotationLayerProps> = memo(({ filteredData, allRowIds, dateArray, setCanGridRefDrag }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const annotations = useSelector((state: RootState) => state.wbsData.annotations);
  const selectedIds = useSelector((state: RootState) => state.uiFlags.selectedAnnotationIds);
  const showAnnotations = useSelector((state: RootState) => state.uiFlags.showAnnotations);
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

  // カードと右クリックメニューをまとめる入れ物。右クリックの受け口であり、
  // 「注釈の外を押したら選択を外す」判定の境界でもある。
  const containerRef = useRef<HTMLDivElement>(null);

  // 日付キーの索引は dateArray が変わったときだけ作る。geometries はカードのドラッグ中に
  // マウス移動ごと再計算されるので、そのたびに全日付を format し直さないようにする。
  const dateLookup = useMemo(() => {
    const dateIndex: { [key: string]: number } = {};
    const dateKeys: string[] = [];
    dateArray.forEach((date, index) => {
      const key = date.format('YYYY-MM-DD');
      dateIndex[key] = index;
      dateKeys.push(key);
    });
    return { dateIndex, dateKeys };
  }, [dateArray]);

  // バーのラベル幅の計測。ブラケットをラベルの先に置くために使う。フォントは
  // チャートが継承している body のもの。同じ文字列は何度も測らない。
  const measureText = useMemo(() => {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return undefined;
    const style = getComputedStyle(document.body);
    context.font = `${style.fontSize} ${style.fontFamily}`;
    const cache = new Map<string, number>();
    return (text: string) => {
      const cached = cache.get(text);
      if (cached !== undefined) return cached;
      const width = context.measureText(text).width;
      cache.set(text, width);
      return width;
    };
  }, []);

  const geometries = useMemo(() => {
    if (!showAnnotations || annotations.length === 0) return [];
    const { dateIndex, dateKeys } = dateLookup;
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
          annotation: applied, filteredData, allRowIds, dateIndex, dateKeys, toKey, cellWidth, rowHeight, measureText,
        });
        return geometry ? { annotation, geometry } : null;
      })
      .filter((entry): entry is { annotation: ChartAnnotation; geometry: AnnotationGeometry } => entry !== null);
  }, [showAnnotations, annotations, dateLookup, filteredData, allRowIds, cellWidth, rowHeight, dragOffset, measureText]);

  // undo などで消えた注釈は選択として数えない。
  const effectiveSelectedIds = useMemo(
    () => selectedIds.filter(id => annotations.some(a => a.id === id)),
    [annotations, selectedIds],
  );
  const selectedIdSet = useMemo(() => new Set(effectiveSelectedIds), [effectiveSelectedIds]);

  const removeSelected = useCallback(() => {
    if (effectiveSelectedIds.length === 0) return;
    dispatch(deleteAnnotations(effectiveSelectedIds));
    dispatch(clearSelectedAnnotations());
  }, [dispatch, effectiveSelectedIds]);

  // 注釈の外(チャートの空白・表・メニューバーなど)を押したら注釈の選択を外す。
  // 選択が残っていると、あとで表のセルで押した Delete が注釈まで消してしまう。
  useEffect(() => {
    if (selectedIds.length === 0) return undefined;
    const handleMouseDown = (event: MouseEvent) => {
      const container = containerRef.current;
      if (container && container.contains(event.target as Node)) return;
      dispatch(clearSelectedAnnotations());
    };
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, [dispatch, selectedIds.length]);

  // Delete / Backspace で選択中の注釈を消し、Esc で選択を外す。capture で受けて
  // 伝播を止めるのは、フォーカスが表(ReactGrid)に残っていても、セルの内容まで
  // 一緒に消させないため。入力欄での Backspace は普通の文字削除なので触らない。
  useEffect(() => {
    if (effectiveSelectedIds.length === 0 || editingId) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTextInput = !!target && !target.classList?.contains('rg-hidden-element')
        && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTextInput) return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        event.stopPropagation();
        removeSelected();
      } else if (event.key === 'Escape') {
        dispatch(clearSelectedAnnotations());
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [dispatch, editingId, effectiveSelectedIds.length, removeSelected]);

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
    if (event.button !== 0) return;
    setCanGridRefDrag(false);
    if (editingId === annotation.id) return;
    // Ctrl(⌘)/Shift+クリックは選択の出し入れだけ。ドラッグは始めない。
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      dispatch(toggleSelectedAnnotation(annotation.id));
      return;
    }
    // 選択済みのカードを掴んだときは選択を保つ(複数選択を崩さない)。
    if (!selectedIdSet.has(annotation.id)) {
      dispatch(setSelectedAnnotationIds([annotation.id]));
    }
    dragStateRef.current = {
      id: annotation.id,
      startX: event.clientX,
      startY: event.clientY,
      baseX: annotation.offsetX,
      baseY: annotation.offsetY,
    };
    setDragOffset({ id: annotation.id, dx: annotation.offsetX, dy: annotation.offsetY });
    setDraggingId(annotation.id);
  }, [dispatch, editingId, selectedIdSet, setCanGridRefDrag]);

  const startEdit = useCallback((annotation: ChartAnnotation) => {
    setDraft(annotation.text);
    setEditingId(annotation.id);
  }, []);

  // 右クリックメニュー。対象は右クリック時点の選択(未選択のカードを右クリックすると
  // そのカードだけが選ばれる)。編集は 1 件のときだけ出す。
  const menuItems: MenuItemProps[] = useMemo(() => {
    const count = effectiveSelectedIds.length;
    const single = count === 1 ? annotations.find(a => a.id === effectiveSelectedIds[0]) : undefined;
    const items: MenuItemProps[] = [];
    if (single) {
      items.push({ children: t('Edit Annotation'), onClick: () => startEdit(single) });
    }
    items.push({
      children: count > 1 ? t('Delete Selected Annotations', { count }) : t('Delete Annotation'),
      onClick: removeSelected,
      disabled: count === 0,
    });
    return items;
  }, [annotations, effectiveSelectedIds, removeSelected, startEdit, t]);

  const commitDraft = useCallback(() => {
    if (!editingId) return;
    dispatch(updateAnnotationText({ id: editingId, text: draft }));
    setEditingId('');
  }, [dispatch, draft, editingId]);

  if (!showAnnotations || geometries.length === 0) return null;

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
          const isSelected = selectedIdSet.has(annotation.id) && !isExporting;
          const color = isSelected ? ACCENT_SELECTED : ACCENT;
          const cardAnchorX = geometry.cardX;
          return (
            <g key={annotation.id}>
              {/* 選択中の注釈だけ、指し示す対象のバーを薄い赤の細線で示す。常時出すと
                  バー自身の枠と重なって太い二重線に見えるので、範囲はふだん
                  ブラケットだけで表す。 */}
              {isSelected && geometry.bars.map((bar, index) => (
                <rect
                  key={index}
                  x={bar.x + 1.5}
                  y={bar.y + 1.5}
                  width={Math.max(1, bar.width - 3)}
                  height={Math.max(1, bar.height - 3)}
                  fill="none"
                  stroke={TARGET_MARK}
                  strokeWidth={1}
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

      {/* 本文カードと右クリックメニュー。入れ物は大きさを持たない原点の div で、
          カードの座標は今までどおりグリッド内容の左上基準。z-index を付けないのは、
          スタッキングコンテキストを作ってメニュー(fixed)を閉じ込めないため。 */}
      <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
      {geometries.map(({ annotation, geometry }) => {
        const isSelected = selectedIdSet.has(annotation.id) && !isExporting;
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
            onClick={(event) => event.stopPropagation()}
            onContextMenu={() => {
              if (!selectedIdSet.has(annotation.id)) dispatch(setSelectedAnnotationIds([annotation.id]));
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              startEdit(annotation);
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
            {isSelected && !isEditing && effectiveSelectedIds.length === 1 && (
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
      {!editingId && <ContextMenu items={menuItems} targetRef={containerRef} />}
      </div>
    </>
  );
});

export default ChartAnnotationLayer;
