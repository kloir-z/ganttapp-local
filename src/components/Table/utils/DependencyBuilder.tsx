// DependencyBuilder.tsx
//
// 依存関係セルの入力支援ポップオーバー。関係(終了後/同じ日)・対象行(絶対指定=行を選ぶ /
// 相対指定=上下)・ずらし日数をUIで指定すると依存文字列を生成する。設定変更はチャートへ
// リアルタイム反映し、依存元・依存先の行をチャート上で強調する。
//
// 確定は「適用」ボタンと Enter のみ。別セルへの移動・ESC・「キャンセル」は元の値に戻す。
// 書式テキストは表のセル自体に表示されるため、ここには直接編集欄を置かない。
import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import { Compatible } from "@silevis/reactgrid";
import { isAlphaNumericKey, isNavigationKey } from "@silevis/reactgrid";
import { useSelector, useDispatch } from "react-redux";
import { RootState, setEntireData } from "../../../reduxStoreAndSlices/store";
import { setIsDependencyEditing, setDependencyTargetRowId, setDependencySourceRowId, setDependencyChainRowIds } from "../../../reduxStoreAndSlices/uiFlagSlice";
import { WBSData, ChartRow, isChartRow } from "../../../types/DataTypes";
import { collectDependencyChainIds } from "../../../utils/CommonUtils";
import { CustomDependencyCell } from "./CustomDependencyCell";
import DependencyConnector from "./DependencyConnector";

interface DependencyBuilderProps {
  cell: Compatible<CustomDependencyCell>;
  onCellChanged: (cell: Compatible<CustomDependencyCell>, commit: boolean) => void;
  // When true, the builder renders as a free-floating popover (opened from the
  // chart's right-click menu) rather than anchored under a table cell.
  standalone?: boolean;
}

type DepType = 'after' | 'sameas';
type TargetMode = 'no' | 'relative';

interface ParsedDependency {
  type: DepType;
  targetMode: TargetMode;
  targetNo: number | '';
  relativeOffset: number; // 負=上, 正=下
  offsetDays: number;
}

const parseDependency = (text: string): ParsedDependency => {
  const parts = text.split(',').map(p => p.trim());
  const type: DepType = parts[0]?.toLowerCase() === 'sameas' ? 'sameas' : 'after';
  const target = parts[1] ?? '';
  let targetMode: TargetMode = 'no';
  let targetNo: number | '' = '';
  let relativeOffset = -1;
  if (target.startsWith('+') || target.startsWith('-')) {
    targetMode = 'relative';
    const n = parseInt(target, 10);
    relativeOffset = isNaN(n) || n === 0 ? -1 : n;
  } else {
    const n = parseInt(target, 10);
    if (!isNaN(n)) targetNo = n;
  }
  const off = parseInt(parts[2], 10);
  const offsetDays = isNaN(off) ? 1 : off;
  return { type, targetMode, targetNo, relativeOffset, offsetDays };
};

const buildDependency = (p: ParsedDependency): string => {
  const target = p.targetMode === 'relative'
    ? (p.relativeOffset >= 0 ? `+${p.relativeOffset}` : `${p.relativeOffset}`)
    : (p.targetNo === '' ? '' : `${p.targetNo}`);
  if (target === '') return '';
  if (p.type === 'sameas') return `sameas, ${target}`;
  return `after, ${target}, ${p.offsetDays}`;
};

const resolveRelative = (data: { [id: string]: WBSData }, currentRowId: string, offset: number): ChartRow | null => {
  const keys = Object.keys(data);
  let currentIndex = keys.indexOf(currentRowId);
  if (currentIndex < 0 || offset === 0) return null;
  let steps = Math.abs(offset);
  const dir = offset / Math.abs(offset);
  while (steps > 0) {
    currentIndex += dir;
    if (currentIndex < 0 || currentIndex >= keys.length) return null;
    if (isChartRow(data[keys[currentIndex]])) steps--;
  }
  const row = data[keys[currentIndex]];
  return isChartRow(row) ? row : null;
};

// 対象行に依存すると循環参照になるか判定する。対象の依存チェーン(dependentId を辿る)が
// 編集行(source)に戻ってくるなら循環。依存解決はこの場合 visited で途中停止する。
const wouldCreateCycle = (data: { [id: string]: WBSData }, sourceId: string, targetId: string): boolean => {
  let cur: string = targetId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    if (cur === sourceId) return true;
    seen.add(cur);
    const row = data[cur];
    cur = isChartRow(row) ? (row.dependentId || '') : '';
  }
  return false;
};

// 現在行から対象行までの相対オフセット(負=上, 正=下)を、チャート行のみ数えて求める。
// resolveRelative の逆変換。対象が同一/見つからない場合は null。
const computeRelativeOffset = (data: { [id: string]: WBSData }, currentRowId: string, targetRowId: string): number | null => {
  const keys = Object.keys(data);
  const ci = keys.indexOf(currentRowId);
  const ti = keys.indexOf(targetRowId);
  if (ci < 0 || ti < 0 || ci === ti) return null;
  const dir = ti > ci ? 1 : -1;
  let count = 0;
  for (let i = ci + dir; dir > 0 ? i <= ti : i >= ti; i += dir) {
    if (isChartRow(data[keys[i]])) count++;
    if (i === ti) break;
  }
  return count === 0 ? null : dir * count;
};

// ---- 共通スタイル ----
const COLORS = { border: '#c4c8cd', label: '#5f6368', text: '#202124', accent: '#3579F8' };
const fieldBox: React.CSSProperties = {
  border: `1px solid ${COLORS.border}`, borderRadius: '5px', background: '#fff',
  padding: '4px 8px', fontSize: '13px', color: COLORS.text, boxSizing: 'border-box', cursor: 'pointer',
};
const sectionLabel: React.CSSProperties = { fontSize: '11px', color: COLORS.label, width: '64px', flexShrink: 0 };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' };
const wordStyle: React.CSSProperties = { fontSize: '13px', color: COLORS.text };

// 数値ステッパー(▲▼)。+/- 記号が文章に紛れて読みづらい問題を避けるため明確な上下矢印にする。
const NumberStepper = ({ value, onChange, min, width }: { value: number; onChange: (v: number) => void; min?: number; width?: number }) => {
  const arrowBtn: React.CSSProperties = {
    border: 'none', background: '#eef0f2', cursor: 'pointer', fontSize: '8px', lineHeight: '1',
    padding: '0 6px', color: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1,
  };
  const clamp = (v: number) => (min !== undefined ? Math.max(min, v) : v);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'stretch', height: '26px', border: `1px solid ${COLORS.border}`, borderRadius: '5px', overflow: 'hidden', background: '#fff' }}>
      <input
        type="text"
        inputMode="numeric"
        value={String(value)}
        onChange={e => { const n = parseInt(e.currentTarget.value, 10); onChange(isNaN(n) ? (min ?? 0) : clamp(n)); }}
        onCopy={e => e.stopPropagation()} onCut={e => e.stopPropagation()} onPaste={e => e.stopPropagation()}
        style={{ width: `${width ?? 38}px`, border: 'none', outline: 'none', textAlign: 'center', fontSize: '13px', padding: '0 2px', background: 'transparent', color: COLORS.text }}
      />
      <span style={{ display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${COLORS.border}` }}>
        <button type="button" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => onChange(clamp(value + 1))} style={{ ...arrowBtn, borderBottom: `1px solid ${COLORS.border}` }}>▲</button>
        <button type="button" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => onChange(clamp(value - 1))} style={arrowBtn}>▼</button>
      </span>
    </span>
  );
};

const DependencyBuilder = memo(({ cell, onCellChanged, standalone = false }: DependencyBuilderProps) => {
  const { t } = useTranslation();
  const data = useSelector((state: RootState) => state.wbsData.data);
  const dispatch = useDispatch();

  // 常に最新の data / 原状を参照するための ref
  const dataRef = useRef(data);
  dataRef.current = data;
  const originalRow = useRef({
    dependency: (isChartRow(data[cell.rowId]) ? (data[cell.rowId] as ChartRow).dependency : '') || '',
    dependentId: (isChartRow(data[cell.rowId]) ? (data[cell.rowId] as ChartRow).dependentId : '') || '',
  });
  const committedRef = useRef(false);

  const chartRows = useMemo(
    () => Object.values(data).filter((r): r is ChartRow => isChartRow(r) && r.id !== cell.rowId),
    [data, cell.rowId]
  );

  // ずらしの数え方は現在行(依存する側)の含休日設定で変わる。
  const dayUnit = useMemo(() => {
    const cur = data[cell.rowId];
    return isChartRow(cur) && cur.isIncludeHolidays ? t('days_unit') : t('business_days_unit');
  }, [data, cell.rowId, t]);

  const [parsed, setParsed] = useState<ParsedDependency>(() => parseDependency(cell.text));
  const [rawText, setRawText] = useState<string>(cell.text);
  const inputRef = useRef<HTMLInputElement>(null);

  // ポップオーバーのドラッグ移動
  const popRef = useRef<HTMLDivElement>(null);
  const [autoNudge, setAutoNudge] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: dragOffset.x, baseY: dragOffset.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setDragOffset({ x: dragRef.current.baseX + (ev.clientX - dragRef.current.startX), y: dragRef.current.baseY + (ev.clientY - dragRef.current.startY) });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [dragOffset.x, dragOffset.y]);

  const toCell = useCallback((str: string): Compatible<CustomDependencyCell> => ({ ...cell, text: str }), [cell]);

  // チャートへリアルタイム反映(履歴は積まない。依存編集は元々 setEntireData のみで履歴を作らない)
  const liveApply = useCallback((str: string) => {
    const row = dataRef.current[cell.rowId];
    if (!isChartRow(row)) return;
    let t = str.trim();
    if (t && !t.includes('^^user^^')) t += '^^user^^';
    const newRow: ChartRow = t === ''
      ? { ...row, dependency: '', dependentId: '' }
      : { ...row, dependency: t };
    dispatch(setEntireData({ ...dataRef.current, [cell.rowId]: newRow }));
  }, [cell.rowId, dispatch]);

  // 元の依存に戻す
  const revertLive = useCallback(() => {
    const row = dataRef.current[cell.rowId];
    if (!isChartRow(row)) return;
    dispatch(setEntireData({
      ...dataRef.current,
      [cell.rowId]: { ...row, dependency: originalRow.current.dependency, dependentId: originalRow.current.dependentId },
    }));
  }, [cell.rowId, dispatch]);

  // 確定して閉じる。
  // ReactGrid は「値が変わらないセル変更」を間引いて onCellsChanged を呼ばないため、
  // 変更なしのコミット(空のまま確定/キャンセルで元の値に戻す等)では onCellChanged の
  // currentlyEditedCell=undefined が反映される再レンダーが起きず、エディタが画面に残る。
  // そこで先に liveApply で必ず新しい参照を dispatch して再レンダーを保証し、その後に
  // onCellChanged で確定する。これでどの経路でも確実に閉じる。
  const closeWith = useCallback((str: string) => {
    if (committedRef.current) return;
    committedRef.current = true;
    liveApply(str);
    onCellChanged(toCell(str), true);
  }, [liveApply, onCellChanged, toCell]);

  // コントロール変更 -> parsed・セル入力欄を更新 + チャートへ即反映
  const applyParsed = useCallback((next: ParsedDependency) => {
    setParsed(next);
    setRawText(buildDependency(next));
    liveApply(buildDependency(next));
  }, [liveApply]);

  // セル内の入力欄での直接編集 -> パースしてコントロールへ反映 + 即反映
  const onRawChange = useCallback((value: string) => {
    setRawText(value);
    setParsed(parseDependency(value));
    liveApply(value);
  }, [liveApply]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 現在の指定が解決する対象行(チャート上のハイライト対象)
  const resolvedTarget = useMemo<ChartRow | null>(() => {
    if (!buildDependency(parsed)) return null;
    if (parsed.targetMode === 'relative') return resolveRelative(data, cell.rowId, parsed.relativeOffset);
    if (parsed.targetNo !== '') return chartRows.find(r => r.no === parsed.targetNo) ?? null;
    return null;
  }, [parsed, data, chartRows, cell.rowId]);

  // 警告(循環参照 / 対象未解決)。問題がある時のみ表示する。
  const warning = useMemo(() => {
    if (!buildDependency(parsed)) return null;
    if (!resolvedTarget) return 'Target row not found';
    if (wouldCreateCycle(data, cell.rowId, resolvedTarget.id)) return 'Circular reference warning';
    return null;
  }, [parsed, resolvedTarget, data, cell.rowId]);

  // 編集中フラグ + 依存元(編集行)ハイライト。閉じる際、未確定なら元に戻す。
  useEffect(() => {
    dispatch(setIsDependencyEditing(true));
    dispatch(setDependencySourceRowId(cell.rowId));
    return () => {
      dispatch(setIsDependencyEditing(false));
      dispatch(setDependencyTargetRowId(null));
      dispatch(setDependencySourceRowId(null));
      dispatch(setDependencyChainRowIds([]));
      if (!committedRef.current) revertLive();
    };
  }, [dispatch, cell.rowId, revertLive]);

  // 解決先が変わるたびにチャートの依存先ハイライトを更新
  useEffect(() => {
    dispatch(setDependencyTargetRowId(resolvedTarget ? resolvedTarget.id : null));
  }, [resolvedTarget, dispatch]);

  // 編集行と連動して動く行(上流・下流の連結すべて)を軽い枠で示す。直接の依存先(赤)と
  // 編集行(青)は別ハイライトなので除く。data 変更時(=編集操作時)のみ再計算。
  const chainIds = useMemo(() => collectDependencyChainIds(data, cell.rowId), [data, cell.rowId]);
  useEffect(() => {
    const targetId = resolvedTarget?.id;
    dispatch(setDependencyChainRowIds(chainIds.filter(id => id !== targetId)));
  }, [chainIds, resolvedTarget, dispatch]);

  // 指定方法の切替時、現在の対象を機械的に等価変換して引き継ぐ。
  const switchMode = (mode: TargetMode) => {
    if (mode === parsed.targetMode) return;
    if (mode === 'no') {
      const t = resolveRelative(data, cell.rowId, parsed.relativeOffset);
      applyParsed({ ...parsed, targetMode: 'no', targetNo: t ? t.no : parsed.targetNo });
    } else {
      let off = parsed.relativeOffset;
      if (parsed.targetNo !== '') {
        const targetRow = chartRows.find(r => r.no === parsed.targetNo);
        if (targetRow) {
          const computed = computeRelativeOffset(data, cell.rowId, targetRow.id);
          if (computed !== null) off = computed;
        }
      }
      applyParsed({ ...parsed, targetMode: 'relative', relativeOffset: off });
    }
  };

  // 相対指定の UI 値(大きさと方向に分解)
  const relMagnitude = Math.max(1, Math.abs(parsed.relativeOffset));
  const relDirection: 'up' | 'down' = parsed.relativeOffset < 0 ? 'up' : 'down';
  const setRelative = (mag: number, dir: 'up' | 'down') => applyParsed({ ...parsed, relativeOffset: (dir === 'up' ? -1 : 1) * Math.max(1, mag) });

  // 開いた直後、ビューポートからはみ出していたら画面内へ寄せる(動的配置)。ドラッグ前の
  // 一度だけ。warning の有無で高さが変わるので、その変化時にも測り直す。
  useLayoutEffect(() => {
    const el = popRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    let nx = 0;
    let ny = 0;
    if (r.right > window.innerWidth - margin) nx = (window.innerWidth - margin) - r.right;
    if (r.bottom > window.innerHeight - margin) ny = (window.innerHeight - margin) - r.bottom;
    if (r.left + nx < margin) nx = margin - r.left;
    if (r.top + ny < margin) ny = margin - r.top;
    if (nx !== 0 || ny !== 0) setAutoNudge(n => ({ x: n.x + nx, y: n.y + ny }));
     
  }, [warning]);

  const dummyMinWidth = cell.columnWidth ? cell.columnWidth - 11 : 80;

  // セル下に開く場合は absolute(セルの右隣)、チャートから開く場合は呼び出し側が
  // fixed 配置するので relative。
  const popoverAnchorStyle: React.CSSProperties = standalone
    ? { position: 'relative' }
    // セルの右隣かつ1行ぶん下に開く。真横だと表とチャートが近いとき編集行のバーを
    // 隠してしまうため、少し下げてバーが見えるようにする。
    : { position: 'absolute', top: 'calc(100% + 2px)', left: 'calc(100% + 4px)', zIndex: 1000 };

  return (
    <div
      className={standalone ? undefined : "input-text__item"}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      onMouseDown={e => {
        // 入力欄/セレクト以外(ボタン・余白・ラベル)のクリックでフォーカスが外れるのを防ぐ
        // (クリックしてもフォーカスを保持する)。
        e.stopPropagation();
        const el = e.target as HTMLElement;
        if (!el.closest('input, select, textarea')) e.preventDefault();
      }}
      onKeyDown={e => {
        // Escape は ReactGrid に委ねて編集モードを抜ける(アンマウント時に元の値へ戻る)。
        // standalone では ReactGrid がないので呼び出し側(ChartDependencyBuilder)が閉じる。
        if (e.key === 'Escape') return;
        if (e.key === 'Enter') { closeWith(buildDependency(parsed)); return; }
        if (isAlphaNumericKey(e.keyCode) || isNavigationKey(e.keyCode)) e.stopPropagation();
      }}
    >
      {/* セル内の入力欄: 表示名セルと同じ自動幅。現在値をリアルタイム表示し直接編集も可能。
          チャートから開く standalone ではセルが無いので出さない。 */}
      {!standalone && (
        <>
          <div className="input-text__dummy js-dummy-input-text" style={{ minWidth: `${dummyMinWidth}px` }} data-placeholder=" ">{rawText}</div>
          <input
            ref={inputRef}
            type="text"
            className="input-text js-input-text"
            value={rawText}
            onChange={e => onRawChange(e.currentTarget.value)}
            onCopy={e => e.stopPropagation()} onCut={e => e.stopPropagation()} onPaste={e => e.stopPropagation()}
          />
        </>
      )}

      {/* ビルダー本体 */}
      <DependencyConnector popoverRef={popRef} />
      <div
        ref={popRef}
        className="dependency-builder"
        style={{
          ...popoverAnchorStyle,
          width: '320px', background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '8px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.18)', padding: '12px 14px', boxSizing: 'border-box', cursor: 'default',
          transform: `translate(${dragOffset.x + autoNudge.x}px, ${dragOffset.y + autoNudge.y}px)`,
        }}
      >
        {/* ヘッダーバー: 左にドラッグ用グリップ、右に×(キャンセル)。バー全体を掴んで移動できる。 */}
        <div
          onMouseDown={onDragStart}
          style={{
            cursor: 'move', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            margin: '-12px -14px 10px', padding: '3px 4px 3px 10px', background: '#f1f3f4',
            borderTopLeftRadius: '7px', borderTopRightRadius: '7px', borderBottom: '1px solid #e3e5e8',
            fontSize: '13px', color: COLORS.label,
          }}
        >
          <span style={{ letterSpacing: '2px' }}>⠿</span>
          <span
            onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
            onClick={() => closeWith(originalRow.current.dependency)}
            title={t('Cancel')}
            style={{ cursor: 'pointer', padding: '0 6px', color: '#777', fontSize: '17px', lineHeight: 1 }}
          >
            ×
          </span>
        </div>

        {/* 対象の指定方法 */}
        <div style={{ ...rowStyle, flexWrap: 'nowrap' }}>
          <span style={sectionLabel}>{t('Specify target by')}</span>
          <label style={{ ...wordStyle, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <input type="radio" checked={parsed.targetMode === 'no'} onChange={() => switchMode('no')} /> {t('Absolute (row No)')}
          </label>
          <label style={{ ...wordStyle, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <input type="radio" checked={parsed.targetMode === 'relative'} onChange={() => switchMode('relative')} /> {t('Relative (offset)')}
          </label>
        </div>

        {/* 対象行 */}
        {parsed.targetMode === 'no' ? (
          <div style={rowStyle}>
            <span style={sectionLabel}>{t('Target Row')}</span>
            <select
              value={parsed.targetNo === '' ? '' : String(parsed.targetNo)}
              onChange={e => applyParsed({ ...parsed, targetNo: e.currentTarget.value === '' ? '' : parseInt(e.currentTarget.value, 10) })}
              style={{ ...fieldBox, flex: 1, maxWidth: '215px' }}
            >
              <option value="">{t('(Select target row)')}</option>
              {chartRows.map(r => (
                <option key={r.id} value={r.no}>No.{r.no} {r.displayName || t('(Untitled row)')}</option>
              ))}
            </select>
          </div>
        ) : (
          <div style={rowStyle}>
            <span style={sectionLabel}>{t('Target Row')}</span>
            {t('rel_prefix') && <span style={wordStyle}>{t('rel_prefix')}</span>}
            <NumberStepper value={relMagnitude} min={1} width={32} onChange={v => setRelative(v, relDirection)} />
            <select
              value={relDirection}
              onChange={e => setRelative(relMagnitude, e.currentTarget.value as 'up' | 'down')}
              style={fieldBox}
            >
              <option value="up">{t('rows above')}</option>
              <option value="down">{t('rows below')}</option>
            </select>
          </div>
        )}

        {/* 関係 */}
        <div style={rowStyle}>
          <span style={sectionLabel}>{t('Relationship')}</span>
          <select
            value={parsed.type}
            onChange={e => applyParsed({ ...parsed, type: e.currentTarget.value as DepType })}
            style={{ ...fieldBox, flex: 1, maxWidth: '215px' }}
          >
            <option value="after">{t('Start after end (successor)')}</option>
            <option value="sameas">{t('Start same day (parallel)')}</option>
          </select>
        </div>

        {/* オフセット(after のみ) */}
        {parsed.type === 'after' && (
          <div style={rowStyle}>
            <span style={sectionLabel}>{t('Offset')}</span>
            <NumberStepper value={parsed.offsetDays} width={38} onChange={v => applyParsed({ ...parsed, offsetDays: v })} />
            <span style={wordStyle}>{dayUnit} {t('later_start')}</span>
          </div>
        )}

        {warning && (
          <div style={{ fontSize: '12px', color: '#c5221f', background: '#fce8e6', borderRadius: '5px', padding: '6px 8px', margin: '0 0 10px' }}>
            ⚠ {t(warning)}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          <button type="button" tabIndex={-1} onMouseDown={e => e.preventDefault()}
            onClick={() => closeWith('')} style={{ ...fieldBox, background: '#f1f3f4' }}>{t('Clear')}</button>
          <span style={{ flex: 1 }} />
          <button type="button" tabIndex={-1} onMouseDown={e => e.preventDefault()}
            onClick={() => closeWith(originalRow.current.dependency)} style={{ ...fieldBox, background: '#f1f3f4' }}>{t('Cancel')}</button>
          <button type="button" tabIndex={-1} onMouseDown={e => e.preventDefault()}
            onClick={() => closeWith(buildDependency(parsed))} style={{ ...fieldBox, background: COLORS.accent, color: '#fff', borderColor: COLORS.accent, fontWeight: 'bold' }}>{t('Apply')}</button>
        </div>
      </div>
    </div>
  );
});

export default DependencyBuilder;
