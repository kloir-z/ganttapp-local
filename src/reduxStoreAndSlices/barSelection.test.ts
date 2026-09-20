// チャートバーの複数選択(一括移動の対象)を持つ状態のテスト。
// 選択は行ではなくバー単位(`<行ID>|planned` / `<行ID>|actual`)で、
// 保存もundoもしない純粋なUI状態なので reducer 単体で検証する。
import reducer, {
  barKeyOf,
  setSelectedBars,
  toggleSelectedBar,
  clearSelectedBars,
  pruneSelectedBars,
  setBarSelectionMode,
} from './uiFlagSlice';

const initial = reducer(undefined, { type: '@@INIT' });
const planned = (rowId: string) => barKeyOf(rowId, 'planned');
const actual = (rowId: string) => barKeyOf(rowId, 'actual');

describe('バー選択の状態', () => {
  it('初期状態は未選択・モードOFF', () => {
    expect(initial.selectedBarKeys).toEqual([]);
    expect(initial.lastSelectedBarKey).toBeNull();
    expect(initial.isBarSelectionMode).toBe(false);
  });

  it('同じ行でも予定バーと実績バーは別々に選べる', () => {
    let state = reducer(initial, toggleSelectedBar(planned('row1')));
    state = reducer(state, toggleSelectedBar(actual('row1')));
    expect(state.selectedBarKeys).toEqual([planned('row1'), actual('row1')]);

    // 予定だけ外しても実績は残る
    state = reducer(state, toggleSelectedBar(planned('row1')));
    expect(state.selectedBarKeys).toEqual([actual('row1')]);
  });

  it('トグルで追加・解除できる', () => {
    let state = reducer(initial, toggleSelectedBar(planned('row1')));
    expect(state.selectedBarKeys).toEqual([planned('row1')]);
    expect(state.lastSelectedBarKey).toBe(planned('row1'));

    state = reducer(state, toggleSelectedBar(planned('row2')));
    expect(state.selectedBarKeys).toEqual([planned('row1'), planned('row2')]);

    state = reducer(state, toggleSelectedBar(planned('row1')));
    expect(state.selectedBarKeys).toEqual([planned('row2')]);
  });

  it('範囲選択の起点は、解除されたバーを指したままにしない', () => {
    let state = reducer(initial, toggleSelectedBar(planned('row1')));
    state = reducer(state, toggleSelectedBar(planned('row2')));
    // 起点になっている row2 を外したら、残っているバーへ起点を移す
    state = reducer(state, toggleSelectedBar(planned('row2')));
    expect(state.lastSelectedBarKey).toBe(planned('row1'));
  });

  it('範囲選択(setSelectedBars)は anchor 省略で起点を動かさない', () => {
    let state = reducer(initial, setSelectedBars({ barKeys: [planned('row1')], anchorBarKey: planned('row1') }));
    state = reducer(state, setSelectedBars({ barKeys: [planned('row1'), planned('row2'), planned('row3')] }));
    expect(state.selectedBarKeys).toHaveLength(3);
    // 起点が据え置かれるので、続けて別のバーを指せば範囲を伸縮できる
    expect(state.lastSelectedBarKey).toBe(planned('row1'));
  });

  it('消えた行のバーを選択から落とす', () => {
    let state = reducer(initial, setSelectedBars({
      barKeys: [planned('row1'), actual('row1'), planned('row3')], anchorBarKey: planned('row3'),
    }));
    state = reducer(state, pruneSelectedBars(['row1', 'row2']));
    expect(state.selectedBarKeys).toEqual([planned('row1'), actual('row1')]);
    // 起点の行も消えていれば起点を落とす
    expect(state.lastSelectedBarKey).toBeNull();
  });

  it('残っている行だけのお掃除では起点を保つ', () => {
    let state = reducer(initial, setSelectedBars({ barKeys: [planned('row1'), planned('row2')], anchorBarKey: planned('row1') }));
    state = reducer(state, pruneSelectedBars(['row1', 'row2', 'row3']));
    expect(state.selectedBarKeys).toEqual([planned('row1'), planned('row2')]);
    expect(state.lastSelectedBarKey).toBe(planned('row1'));
  });

  it('選択モードを抜けると選択も畳む', () => {
    let state = reducer(initial, setBarSelectionMode(true));
    state = reducer(state, setSelectedBars({ barKeys: [planned('row1'), planned('row2')], anchorBarKey: planned('row1') }));
    expect(state.selectedBarKeys).toHaveLength(2);

    state = reducer(state, setBarSelectionMode(false));
    expect(state.isBarSelectionMode).toBe(false);
    expect(state.selectedBarKeys).toEqual([]);
    expect(state.lastSelectedBarKey).toBeNull();
  });

  it('選択解除はモードを抜けない(囲み直せるようにする)', () => {
    let state = reducer(initial, setBarSelectionMode(true));
    state = reducer(state, setSelectedBars({ barKeys: [planned('row1')], anchorBarKey: planned('row1') }));
    state = reducer(state, clearSelectedBars());
    expect(state.selectedBarKeys).toEqual([]);
    expect(state.isBarSelectionMode).toBe(true);
  });
});
