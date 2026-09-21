// 行数上限(MAX_ROWS)の境界。ヘルプに「最大 999 行」と書いているので、
// ちょうど 999 行までは追加でき、それを超える追加だけが拒否されること。
import { wbsDataSlice, addRow, insertCopiedRow, setEntireData } from './store';
import { MAX_ROWS, WBSData } from '../types/DataTypes';

const reducer = wbsDataSlice.reducer;
const MESSAGE = 'max rows';

const stateWithRows = (count: number) => {
  let state = reducer(undefined, { type: '@@INIT' });
  const data: { [id: string]: WBSData } = {};
  for (let i = 0; i < count; i++) {
    const id = `r${i}`;
    data[id] = {
      no: i + 1, id, rowType: 'Chart', displayName: `Task ${i}`, color: '',
      plannedStartDate: '', plannedEndDate: '', plannedDays: null,
      actualStartDate: '', actualEndDate: '', dependentId: '', dependency: '',
      progress: '', textColumn1: '', textColumn2: '', textColumn3: '', isIncludeHolidays: false,
    } as WBSData;
  }
  state = reducer(state, setEntireData(data));
  return state;
};

describe('行数上限', () => {
  it('上限は 999 行', () => {
    expect(MAX_ROWS).toBe(999);
  });

  it('addRow: ちょうど上限までは追加でき、超える追加は拒否される', () => {
    let state = stateWithRows(MAX_ROWS - 2);
    state = reducer(state, addRow({ rowType: 'Chart', insertAtId: 'r0', numberOfRows: 2, maxRowsMessage: MESSAGE }));
    expect(Object.keys(state.data)).toHaveLength(MAX_ROWS);
    expect(state.messageInfo?.message).not.toBe(MESSAGE);

    state = reducer(state, addRow({ rowType: 'Chart', insertAtId: 'r0', numberOfRows: 1, maxRowsMessage: MESSAGE }));
    expect(Object.keys(state.data)).toHaveLength(MAX_ROWS);
    expect(state.messageInfo?.message).toBe(MESSAGE);
  });

  it('insertCopiedRow: ちょうど上限までは挿入でき、超える挿入は拒否される', () => {
    let state = stateWithRows(MAX_ROWS - 1);
    const copied = [state.data.r0];
    state = reducer(state, insertCopiedRow({ insertAtId: 'r0', copiedRows: copied, maxRowsMessage: MESSAGE }));
    expect(Object.keys(state.data)).toHaveLength(MAX_ROWS);

    state = reducer(state, insertCopiedRow({ insertAtId: 'r0', copiedRows: copied, maxRowsMessage: MESSAGE }));
    expect(Object.keys(state.data)).toHaveLength(MAX_ROWS);
    expect(state.messageInfo?.message).toBe(MESSAGE);
  });
});
