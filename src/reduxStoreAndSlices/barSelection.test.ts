// チャートバーの複数選択(一括移動の対象行)を持つ状態のテスト。
// 選択は保存もundoもしない純粋なUI状態なので、reducer 単体で検証する。
import reducer, {
  setSelectedBarRows,
  toggleSelectedBarRow,
  clearSelectedBarRows,
  pruneSelectedBarRows,
  setBarSelectionMode,
} from './uiFlagSlice';

const initial = reducer(undefined, { type: '@@INIT' });

describe('バー選択の状態', () => {
  it('初期状態は未選択・モードOFF', () => {
    expect(initial.selectedBarRowIds).toEqual([]);
    expect(initial.lastSelectedBarRowId).toBeNull();
    expect(initial.isBarSelectionMode).toBe(false);
  });

  it('トグルで追加・解除できる', () => {
    let state = reducer(initial, toggleSelectedBarRow('row1'));
    expect(state.selectedBarRowIds).toEqual(['row1']);
    expect(state.lastSelectedBarRowId).toBe('row1');

    state = reducer(state, toggleSelectedBarRow('row2'));
    expect(state.selectedBarRowIds).toEqual(['row1', 'row2']);

    state = reducer(state, toggleSelectedBarRow('row1'));
    expect(state.selectedBarRowIds).toEqual(['row2']);
  });

  it('範囲選択の起点は、解除された行を指したままにしない', () => {
    let state = reducer(initial, toggleSelectedBarRow('row1'));
    state = reducer(state, toggleSelectedBarRow('row2'));
    // 起点になっている row2 を外したら、残っている行へ起点を移す
    state = reducer(state, toggleSelectedBarRow('row2'));
    expect(state.lastSelectedBarRowId).toBe('row1');
  });

  it('範囲選択(setSelectedBarRows)は anchor 省略で起点を動かさない', () => {
    let state = reducer(initial, setSelectedBarRows({ rowIds: ['row1'], anchorRowId: 'row1' }));
    state = reducer(state, setSelectedBarRows({ rowIds: ['row1', 'row2', 'row3'] }));
    expect(state.selectedBarRowIds).toEqual(['row1', 'row2', 'row3']);
    // 起点が据え置かれるので、続けて別の行を指せば範囲を伸縮できる
    expect(state.lastSelectedBarRowId).toBe('row1');
  });

  it('消えた行を選択から落とす', () => {
    let state = reducer(initial, setSelectedBarRows({ rowIds: ['row1', 'row2', 'row3'], anchorRowId: 'row3' }));
    state = reducer(state, pruneSelectedBarRows(['row1', 'row2']));
    expect(state.selectedBarRowIds).toEqual(['row1', 'row2']);
    // 起点の行も消えていれば起点を落とす
    expect(state.lastSelectedBarRowId).toBeNull();
  });

  it('残っている行だけのお掃除では起点を保つ', () => {
    let state = reducer(initial, setSelectedBarRows({ rowIds: ['row1', 'row2'], anchorRowId: 'row1' }));
    state = reducer(state, pruneSelectedBarRows(['row1', 'row2', 'row3']));
    expect(state.selectedBarRowIds).toEqual(['row1', 'row2']);
    expect(state.lastSelectedBarRowId).toBe('row1');
  });

  it('選択モードを抜けると選択も畳む', () => {
    let state = reducer(initial, setBarSelectionMode(true));
    state = reducer(state, setSelectedBarRows({ rowIds: ['row1', 'row2'], anchorRowId: 'row1' }));
    expect(state.selectedBarRowIds).toHaveLength(2);

    state = reducer(state, setBarSelectionMode(false));
    expect(state.isBarSelectionMode).toBe(false);
    expect(state.selectedBarRowIds).toEqual([]);
    expect(state.lastSelectedBarRowId).toBeNull();
  });

  it('選択解除はモードを抜けない(囲み直せるようにする)', () => {
    let state = reducer(initial, setBarSelectionMode(true));
    state = reducer(state, setSelectedBarRows({ rowIds: ['row1'], anchorRowId: 'row1' }));
    state = reducer(state, clearSelectedBarRows());
    expect(state.selectedBarRowIds).toEqual([]);
    expect(state.isBarSelectionMode).toBe(true);
  });
});
