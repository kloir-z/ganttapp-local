// 注釈が undo/redo に乗っていることの確認。注釈は専用スライスではなく wbsData
// スライス(= undo スナップショットの持ち主)に置いてあるので、行・列の編集と
// 同じ 1 本の undo 履歴に並ぶ。
import {
  wbsDataSlice, undo, redo, addAnnotation, updateAnnotationText,
  moveAnnotation, deleteAnnotation, setEntireAnnotations, pushPastState, setColumns,
} from './store';
import { ChartAnnotation } from '../types/DataTypes';

const reducer = wbsDataSlice.reducer;
const anno = (overrides: Partial<ChartAnnotation> = {}): ChartAnnotation => ({
  id: 'a1', startRowId: 'r1', endRowId: 'r3', text: 'memo', offsetX: 0, offsetY: 0, ...overrides,
});

// 初期 state。undo は past を 1 件残す作りなので、初期スナップショット 1 件から始まる。
const initial = () => reducer(undefined, { type: '@@INIT' });

describe('注釈の undo/redo', () => {
  it('追加を undo すると消え、redo で戻る', () => {
    let state = initial();
    state = reducer(state, addAnnotation(anno()));
    expect(state.annotations).toHaveLength(1);

    state = reducer(state, undo());
    expect(state.annotations).toHaveLength(0);

    state = reducer(state, redo());
    expect(state.annotations).toHaveLength(1);
    expect(state.annotations[0].text).toBe('memo');
  });

  it('本文の編集を undo すると前の本文に戻る', () => {
    let state = initial();
    state = reducer(state, addAnnotation(anno({ text: '初版' })));
    state = reducer(state, updateAnnotationText({ id: 'a1', text: '改訂版' }));
    expect(state.annotations[0].text).toBe('改訂版');

    state = reducer(state, undo());
    expect(state.annotations[0].text).toBe('初版');
    state = reducer(state, redo());
    expect(state.annotations[0].text).toBe('改訂版');
  });

  it('カードの移動を undo すると元の位置に戻る', () => {
    let state = initial();
    state = reducer(state, addAnnotation(anno()));
    state = reducer(state, moveAnnotation({ id: 'a1', offsetX: 40, offsetY: -12 }));
    expect(state.annotations[0]).toMatchObject({ offsetX: 40, offsetY: -12 });

    state = reducer(state, undo());
    expect(state.annotations[0]).toMatchObject({ offsetX: 0, offsetY: 0 });
  });

  it('削除を undo すると復活する', () => {
    let state = initial();
    state = reducer(state, addAnnotation(anno()));
    state = reducer(state, deleteAnnotation('a1'));
    expect(state.annotations).toHaveLength(0);

    state = reducer(state, undo());
    expect(state.annotations).toHaveLength(1);
  });

  it('値が変わらない操作は undo ステップを積まない', () => {
    let state = initial();
    state = reducer(state, addAnnotation(anno({ offsetX: 5, offsetY: 5, text: 'x' })));
    const depth = state.past.length;
    state = reducer(state, moveAnnotation({ id: 'a1', offsetX: 5, offsetY: 5 }));
    state = reducer(state, updateAnnotationText({ id: 'a1', text: 'x' }));
    state = reducer(state, deleteAnnotation('存在しないID'));
    expect(state.past.length).toBe(depth);
  });

  it('行・列の編集と注釈が 1 本の undo 履歴に並ぶ', () => {
    // 注釈を足したあとに列を変更 → undo 1 回で列だけ戻り、注釈は残る。
    let state = initial();
    state = reducer(state, addAnnotation(anno()));
    const columnsBefore = state.columns;
    state = reducer(state, pushPastState());
    state = reducer(state, setColumns([...columnsBefore, { columnId: 'extra', columnName: 'Extra', width: 10, visible: true } as any]));
    expect(state.columns).toHaveLength(columnsBefore.length + 1);

    state = reducer(state, undo());
    expect(state.columns).toHaveLength(columnsBefore.length);
    expect(state.annotations).toHaveLength(1);

    // もう 1 回 undo すると注釈の追加まで戻る。
    state = reducer(state, undo());
    expect(state.annotations).toHaveLength(0);
  });

  it('ファイル読み込み(setEntireAnnotations)は undo 履歴を積まない', () => {
    let state = initial();
    const depth = state.past.length;
    state = reducer(state, setEntireAnnotations([anno(), anno({ id: 'a2' })]));
    expect(state.annotations).toHaveLength(2);
    expect(state.past.length).toBe(depth);
  });
});
