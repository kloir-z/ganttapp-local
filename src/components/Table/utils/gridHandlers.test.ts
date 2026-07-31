// handleGridChanges の範囲ペースト挙動のテスト。
// 特に「同一行の予定開始日+終了日が同時に届いたとき、1つの更新にまとめて両方の
// 新しい値が反映されること」(範囲ペーストで終了日だけが貼り付き開始日が古い値に
// 戻るバグの回帰テスト)と、「複数行ぶんが1回の setPlannedDates にまとまること」
// (行ごとの dispatch だと依存計算が先の行を上書きしてしまう)を確認する。
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

  test('同一行に開始日と終了日が同時に来たら1回の setPlannedDates に両方反映される', () => {
    const dispatched: { type: string; payload?: unknown }[] = [];
    const dispatch = ((action: { type: string }) => { dispatched.push(action); }) as never;

    handleGridChanges(dispatch, buildData(), [
      dateChange('row0', 'plannedStartDate', '2026/02/01'),
      dateChange('row0', 'plannedEndDate', '2026/02/05'),
    ], columns, [], []);

    const plannedActions = dispatched.filter(a => a.type === 'wbsData/setPlannedDates');
    expect(plannedActions).toHaveLength(1);
    expect(plannedActions[0].payload).toEqual([{
      id: 'row0',
      startDate: '2026/02/01',
      endDate: '2026/02/05',
    }]);
  });

  test('複数行×開始/終了の2x2ペーストは1回の setPlannedDates にまとめて dispatch される', () => {
    const dispatched: { type: string; payload?: unknown }[] = [];
    const dispatch = ((action: { type: string }) => { dispatched.push(action); }) as never;

    handleGridChanges(dispatch, buildData(), [
      dateChange('row0', 'plannedStartDate', '2026/02/01'),
      dateChange('row0', 'plannedEndDate', '2026/02/05'),
      dateChange('row1', 'plannedStartDate', '2026/02/02'),
      dateChange('row1', 'plannedEndDate', '2026/02/06'),
    ], columns, [], []);

    // 行ごとに分けて dispatch すると、後の行の依存計算が先の行の日付を
    // 上書きしてしまうため、必ず1アクションにまとめる
    const plannedActions = dispatched.filter(a => a.type === 'wbsData/setPlannedDates');
    expect(plannedActions).toHaveLength(1);
    expect(plannedActions[0].payload).toEqual([
      { id: 'row0', startDate: '2026/02/01', endDate: '2026/02/05' },
      { id: 'row1', startDate: '2026/02/02', endDate: '2026/02/06' },
    ]);
  });

  test('貼り付け範囲のうち値が変わらなかった行も現在値のまま一括更新に含める', () => {
    const dispatched: { type: string; payload?: unknown }[] = [];
    const dispatch = ((action: { type: string }) => { dispatched.push(action); }) as never;

    // row1 は貼り付けた値が元と同じで ReactGrid から変更が届かないケース。
    // 含めないと row0 の依存計算に引きずられて動いてしまう。
    handleGridChanges(dispatch, buildData(), [
      dateChange('row0', 'plannedStartDate', '2026/02/01'),
      dateChange('row0', 'plannedEndDate', '2026/02/05'),
    ], columns, [], [], ['row0', 'row1']);

    const plannedActions = dispatched.filter(a => a.type === 'wbsData/setPlannedDates');
    expect(plannedActions).toHaveLength(1);
    expect(plannedActions[0].payload).toEqual([
      { id: 'row0', startDate: '2026/02/01', endDate: '2026/02/05' },
      { id: 'row1', startDate: '2026/01/06', endDate: '2026/01/11' },
    ]);
  });

  test('片方だけの変更ではもう片方は既存値を維持する', () => {
    const dispatched: { type: string; payload?: unknown }[] = [];
    const dispatch = ((action: { type: string }) => { dispatched.push(action); }) as never;

    handleGridChanges(dispatch, buildData(), [
      dateChange('row0', 'plannedEndDate', '2026/03/01'),
    ], columns, [], []);

    const plannedActions = dispatched.filter(a => a.type === 'wbsData/setPlannedDates');
    expect(plannedActions).toHaveLength(1);
    expect(plannedActions[0].payload).toEqual([{
      id: 'row0',
      startDate: '2026/01/05',
      endDate: '2026/03/01',
    }]);
  });

  test('予定日と他列が混在するペーストでは setEntireData の後に setPlannedDates が来る', () => {
    const dispatched: { type: string; payload?: unknown }[] = [];
    const dispatch = ((action: { type: string }) => { dispatched.push(action); }) as never;

    handleGridChanges(dispatch, buildData(), [
      dateChange('row0', 'plannedStartDate', '2026/02/01'),
      dateChange('row0', 'plannedEndDate', '2026/02/05'),
      textChange('row0', 'textColumn1', 'memo'),
    ], columns, [], []);

    const types = dispatched.map(a => a.type);
    const entireIdx = types.indexOf('wbsData/setEntireData');
    const plannedIdx = types.indexOf('wbsData/setPlannedDates');
    expect(entireIdx).toBeGreaterThanOrEqual(0);
    expect(plannedIdx).toBeGreaterThan(entireIdx);

    // setEntireData 側にもテキスト変更が反映されている
    const entireAction = dispatched[entireIdx] as { payload: { [id: string]: ChartRow } };
    expect(entireAction.payload.row0.textColumn1).toBe('memo');

    // undo スナップショットの二重積みを避けるため pushPastState は dispatch されない
    // (setEntireData が内部で積む)
    expect(types.filter(t => t === 'wbsData/pushPastState')).toHaveLength(0);
  });

  test('数値textのセル(日数列のコピー等)をテキスト列に貼っても Too long エラーにならない', () => {
    const dispatched: { type: string; payload?: unknown }[] = [];
    const dispatch = ((action: { type: string }) => { dispatched.push(action); }) as never;

    // 日数列のセルは text に数値が乗ったままコピーされることがある(旧データ形式)。
    // それをテキスト列へペーストしたときの CellChange を再現する。
    const numericTextChange = {
      rowId: 'row0',
      columnId: 'textColumn1',
      type: 'customText',
      previousCell: { type: 'customText', text: '', value: NaN },
      newCell: { type: 'customText', text: 5 as unknown as string, value: NaN },
    } as CellChange<CustomTextCell>;

    handleGridChanges(dispatch, buildData(), [numericTextChange], columns, [], []);

    const errorActions = dispatched.filter(a => a.type === 'wbsData/setMessageInfo');
    expect(errorActions).toHaveLength(0);
    const entire = dispatched.find(a => a.type === 'wbsData/setEntireData') as { payload: { [id: string]: ChartRow } };
    expect(entire.payload.row0.textColumn1).toBe('5');
  });

  test('年を省略した日付を貼り付けると周辺行の年を補って反映される', () => {
    const dispatched: { type: string; payload?: unknown }[] = [];
    const dispatch = ((action: { type: string }) => { dispatched.push(action); }) as never;

    // row0 は 2026年、row1 に年なしの "2/1" - "2/5" を貼り付ける
    handleGridChanges(dispatch, buildData(), [
      dateChange('row1', 'plannedStartDate', '2/1'),
      dateChange('row1', 'plannedEndDate', '2/5'),
    ], columns, [], [], undefined, 'yyyy/MM/dd');

    const plannedActions = dispatched.filter(a => a.type === 'wbsData/setPlannedDates');
    expect(plannedActions[0].payload).toEqual([{
      id: 'row1',
      startDate: '2026/02/01',
      endDate: '2026/02/05',
    }]);
  });

  test('年を省略した実績日も補完して保存される', () => {
    const dispatched: { type: string; payload?: unknown }[] = [];
    const dispatch = ((action: { type: string }) => { dispatched.push(action); }) as never;

    handleGridChanges(dispatch, buildData(), [
      dateChange('row0', 'actualStartDate', '1/6'),
    ], columns, [], [], undefined, 'yyyy/MM/dd');

    const entire = dispatched.find(a => a.type === 'wbsData/setEntireData') as { payload: { [id: string]: ChartRow } };
    expect(entire.payload.row0.actualStartDate).toBe('2026/01/06');
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
