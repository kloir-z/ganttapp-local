// handleGridChanges の範囲ペースト挙動のテスト。
// 特に「同一行の予定開始日+終了日が同時に届いたとき、1回の setPlannedDate に
// まとめて両方の新しい値が反映されること」(範囲ペーストで終了日だけが貼り付き
// 開始日が古い値に戻るバグの回帰テスト)を確認する。
import { CellChange } from '@silevis/reactgrid';
import { handleGridChanges } from './gridHandlers';
import { CustomDateCell } from './CustomDateCell';
import { CustomTextCell } from './CustomTextCell';
import { ChartRow, WBSData } from '../../../types/DataTypes';
import { ExtendedColumn } from '../../../reduxStoreAndSlices/store';

const makeChartRow = (id: string, no: number, start: string, end: string): ChartRow => ({
  no,
  id,
  rowType: 'Chart',
  displayName: `Task ${no}`,
  color: '',
  plannedStartDate: start,
  plannedEndDate: end,
  plannedDays: null,
  actualStartDate: '',
  actualEndDate: '',
  dependentId: '',
  dependency: '',
  progress: '',
  textColumn1: '',
  textColumn2: '',
  textColumn3: '',
  isIncludeHolidays: false,
});

const columns: ExtendedColumn[] = [
  { columnId: 'no', columnName: 'No', visible: true },
  { columnId: 'displayName', columnName: 'DisplayName', visible: true },
  { columnId: 'plannedStartDate', columnName: 'Start', visible: true },
  { columnId: 'plannedEndDate', columnName: 'End', visible: true },
  { columnId: 'textColumn1', columnName: 'Text1', visible: true },
] as ExtendedColumn[];

const dateCell = (text: string): CustomDateCell => ({
  type: 'customDate',
  text,
  longDate: text,
  shortDate: text,
  value: NaN,
});

const dateChange = (rowId: string, columnId: string, text: string): CellChange<CustomDateCell> => ({
  rowId,
  columnId,
  type: 'customDate',
  previousCell: dateCell(''),
  newCell: dateCell(text),
});

const textChange = (rowId: string, columnId: string, text: string): CellChange<CustomTextCell> => ({
  rowId,
  columnId,
  type: 'customText',
  previousCell: { type: 'customText', text: '', value: NaN },
  newCell: { type: 'customText', text, value: NaN },
});

describe('handleGridChanges (range paste)', () => {
  const buildData = () => ({
    row0: makeChartRow('row0', 1, '2026/01/05', '2026/01/10'),
    row1: makeChartRow('row1', 2, '2026/01/06', '2026/01/11'),
  } as { [id: string]: WBSData });

  test('同一行に開始日と終了日が同時に来たら1回の setPlannedDate に両方反映される', () => {
    const dispatched: { type: string; payload?: unknown }[] = [];
    const dispatch = ((action: { type: string }) => { dispatched.push(action); }) as never;

    handleGridChanges(dispatch, buildData(), [
      dateChange('row0', 'plannedStartDate', '2026/02/01'),
      dateChange('row0', 'plannedEndDate', '2026/02/05'),
    ], columns, [], []);

    const plannedActions = dispatched.filter(a => a.type === 'wbsData/setPlannedDate');
    expect(plannedActions).toHaveLength(1);
    expect(plannedActions[0].payload).toEqual({
      id: 'row0',
      startDate: '2026/02/01',
      endDate: '2026/02/05',
    });
  });

  test('複数行×開始/終了の2x2ペーストは行ごとに1回ずつ dispatch される', () => {
    const dispatched: { type: string; payload?: unknown }[] = [];
    const dispatch = ((action: { type: string }) => { dispatched.push(action); }) as never;

    handleGridChanges(dispatch, buildData(), [
      dateChange('row0', 'plannedStartDate', '2026/02/01'),
      dateChange('row0', 'plannedEndDate', '2026/02/05'),
      dateChange('row1', 'plannedStartDate', '2026/02/02'),
      dateChange('row1', 'plannedEndDate', '2026/02/06'),
    ], columns, [], []);

    const plannedActions = dispatched.filter(a => a.type === 'wbsData/setPlannedDate');
    expect(plannedActions).toHaveLength(2);
    expect(plannedActions[0].payload).toEqual({ id: 'row0', startDate: '2026/02/01', endDate: '2026/02/05' });
    expect(plannedActions[1].payload).toEqual({ id: 'row1', startDate: '2026/02/02', endDate: '2026/02/06' });
  });

  test('片方だけの変更ではもう片方は既存値を維持する', () => {
    const dispatched: { type: string; payload?: unknown }[] = [];
    const dispatch = ((action: { type: string }) => { dispatched.push(action); }) as never;

    handleGridChanges(dispatch, buildData(), [
      dateChange('row0', 'plannedEndDate', '2026/03/01'),
    ], columns, [], []);

    const plannedActions = dispatched.filter(a => a.type === 'wbsData/setPlannedDate');
    expect(plannedActions).toHaveLength(1);
    expect(plannedActions[0].payload).toEqual({
      id: 'row0',
      startDate: '2026/01/05',
      endDate: '2026/03/01',
    });
  });

  test('予定日と他列が混在するペーストでは setEntireData の後に setPlannedDate が来る', () => {
    const dispatched: { type: string; payload?: unknown }[] = [];
    const dispatch = ((action: { type: string }) => { dispatched.push(action); }) as never;

    handleGridChanges(dispatch, buildData(), [
      dateChange('row0', 'plannedStartDate', '2026/02/01'),
      dateChange('row0', 'plannedEndDate', '2026/02/05'),
      textChange('row0', 'textColumn1', 'memo'),
    ], columns, [], []);

    const types = dispatched.map(a => a.type);
    const entireIdx = types.indexOf('wbsData/setEntireData');
    const plannedIdx = types.indexOf('wbsData/setPlannedDate');
    expect(entireIdx).toBeGreaterThanOrEqual(0);
    expect(plannedIdx).toBeGreaterThan(entireIdx);

    // setEntireData 側にもテキスト変更が反映されている
    const entireAction = dispatched[entireIdx] as { payload: { [id: string]: ChartRow } };
    expect(entireAction.payload.row0.textColumn1).toBe('memo');

    // undo スナップショットの二重積みを避けるため pushPastState は dispatch されない
    // (setEntireData が内部で積む)
    expect(types.filter(t => t === 'wbsData/pushPastState')).toHaveLength(0);
  });

  test('予定日のみの変更では pushPastState が1回だけ dispatch される', () => {
    const dispatched: { type: string; payload?: unknown }[] = [];
    const dispatch = ((action: { type: string }) => { dispatched.push(action); }) as never;

    handleGridChanges(dispatch, buildData(), [
      dateChange('row0', 'plannedStartDate', '2026/02/01'),
    ], columns, [], []);

    const types = dispatched.map(a => a.type);
    expect(types.filter(t => t === 'wbsData/pushPastState')).toHaveLength(1);
  });
});
