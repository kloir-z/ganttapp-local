// 閲覧モード/編集モードの決め方と、タブごとの記憶。
//
// 書き出した HTML(埋め込みデータあり)を開いたときだけ閲覧モードで始めることがある。
// - 同じタブで再読み込みしたときは、前のモードを引き継ぐ(sessionStorage)。
// - そうでなければ、このブラウザでそのプロジェクトを保存したことがある(保存先を覚えている)か、
//   未保存の下書きが残っていれば編集モード。どちらもなければ(人からもらったファイルなど)閲覧モード。
// アプリ本体の HTML(埋め込みデータなし)は、いつも編集モードで始める。

const SESSION_KEY = 'gantty_view_mode';

export interface InitialViewModeInput {
  hasEmbeddedData: boolean;
  rememberedViewMode: boolean | null;
  hasSavedFileHandle: boolean;
  hasDirtyDraft: boolean;
}

export const decideInitialViewMode = (input: InitialViewModeInput): boolean => {
  if (!input.hasEmbeddedData) return false;
  if (input.rememberedViewMode !== null) return input.rememberedViewMode;
  return !(input.hasSavedFileHandle || input.hasDirtyDraft);
};

export const readRememberedViewMode = (): boolean | null => {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    if (value === 'view') return true;
    if (value === 'edit') return false;
    return null;
  } catch {
    return null;
  }
};

export const rememberViewMode = (isViewMode: boolean): void => {
  try {
    sessionStorage.setItem(SESSION_KEY, isViewMode ? 'view' : 'edit');
  } catch {
    // 使えなければ覚えない(再読み込みのたびに決め直す)
  }
};
