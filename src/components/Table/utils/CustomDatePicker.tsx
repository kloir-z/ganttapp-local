// CustomDatePicker.tsx
import { useState, useEffect, useRef, memo, useCallback, useMemo } from "react";
import { Compatible, Cell } from "@silevis/reactgrid";
import { isAlphaNumericKey, isNavigationKey } from "@silevis/reactgrid";
import { LocalizationProvider, DateCalendar } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { RootState } from "../../../reduxStoreAndSlices/store";
import { useSelector } from "react-redux";
import { parseFlexibleDate } from "./wbsHelpers";
import { DateFormatType } from "../../../types/DataTypes";

export interface CustomDateCell extends Cell {
  type: 'customDate';
  text: string;
  longDate: string;
  shortDate: string;
  value: number;
  seedText?: string;
}

interface CustomDatePickerProps {
  cell: Compatible<CustomDateCell>;
  onCellChanged: (cell: Compatible<CustomDateCell>, commit: boolean) => void;
  // タイプ入力で編集を開始したときの最初の文字(なければ既存日付を初期表示)
  initialText?: string;
}

// dateFormat(date-fns系トークン) → dayjs の format トークン
const DAYJS_FORMAT: Record<DateFormatType, string> = {
  'yyyy/MM/dd': 'YYYY/MM/DD',
  'yyyy/M/d': 'YYYY/M/D',
  'MM/dd/yyyy': 'MM/DD/YYYY',
  'M/d/yyyy': 'M/D/YYYY',
  'dd/MM/yyyy': 'DD/MM/YYYY',
  'd/M/yyyy': 'D/M/YYYY',
};

const CustomDatePicker = memo(({ cell, onCellChanged, initialText }: CustomDatePickerProps) => {
  const dateFormat = useSelector((state: RootState) => state.wbsData.dateFormat);
  const showYear = useSelector((state: RootState) => state.wbsData.showYear);
  const rowHeight = useSelector((state: RootState) => state.baseSettings.rowHeight);

  // 年が省略入力されたときの補完元(既存の日付の年、無ければ今年)
  const fallbackYear = useMemo(() => {
    const d = dayjs(cell.text);
    return d.isValid() ? d.year() : dayjs().year();
  }, [cell.text]);

  // 入力開始時の初期テキストとキャレット位置を、表示フォーマットに合わせて決める。
  // 例) 画面表示が mm/dd(showYear=false)で既存日付が "2026/08/04" のとき、タイプ開始で
  //     年(2026)は残したまま月日部分(08/04)に最初の文字を当てる → "2026/8" のように編集できる。
  const initial = useMemo(() => {
    const longDate = cell.longDate || cell.text || '';
    if (initialText === undefined) {
      // F2/クリックで編集開始: 既存日付を表示しキャレットは末尾
      return { value: longDate, caret: longDate.length };
    }
    if (!longDate) {
      return { value: initialText, caret: initialText.length };
    }
    const yearFirst = dateFormat.startsWith('yyyy');
    let secStart: number;
    let secEnd: number;
    if (showYear) {
      // 年も表示されている → 全体を打ち直し
      secStart = 0;
      secEnd = longDate.length;
    } else if (yearFirst) {
      // 年が先頭(yyyy/mm/dd)で年は非表示 → 先頭の年を残して以降を編集
      const i = longDate.indexOf('/');
      secStart = i >= 0 ? i + 1 : 0;
      secEnd = longDate.length;
    } else {
      // 年が末尾(mm/dd/yyyy 等)で年は非表示 → 末尾の年を残して手前を編集
      const i = longDate.lastIndexOf('/');
      secStart = 0;
      secEnd = i >= 0 ? i : longDate.length;
    }
    const value = longDate.slice(0, secStart) + initialText + longDate.slice(secEnd);
    return { value, caret: secStart + initialText.length };
  }, [cell.longDate, cell.text, initialText, dateFormat, showYear]);

  const [text, setText] = useState<string>(initial.value);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // ESC でキャンセルされたかどうか(確定させないためのフラグ)
  const wasEscPressed = useRef(false);
  // カレンダーを開いた時点の入力値(Cancel で元に戻すため)
  const textBeforeCalendar = useRef('');

  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.setSelectionRange(initial.caret, initial.caret);
    }
    // 編集中セルを初期表示値に同期(表示している内容とクリック移動時の自動確定値を一致させる)
    sync(initial.value);
    // マウント時のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 入力文字列を確定用のセルに変換する。空なら空、解釈不能なら元の値を保持(誤入力で壊さない)。
  const toCell = useCallback((value: string): Compatible<CustomDateCell> => {
    const trimmed = value.trim();
    if (trimmed === '') {
      return { ...cell, text: '' };
    }
    const canonical = parseFlexibleDate(trimmed, dateFormat, fallbackYear);
    return { ...cell, text: canonical ?? cell.text };
  }, [cell, dateFormat, fallbackYear]);

  // 編集中は毎回 onCellChanged(_, false) で ReactGrid の「編集中セル(currentlyEditedCell)」を
  // 最新値に同期しておく。こうすると、別セルへクリック移動した際に ReactGrid 自身が行う
  // 自動確定が常に正しい値になる(同期しないと編集前の値で確定され「元に戻る」)。
  const sync = useCallback((value: string) => {
    onCellChanged(toCell(value), false);
  }, [onCellChanged, toCell]);

  const calendarValue = useMemo(() => {
    const canonical = parseFlexibleDate(text.trim(), dateFormat, fallbackYear);
    if (canonical) return dayjs(canonical);
    const existing = dayjs(cell.text);
    return existing.isValid() ? existing : null;
  }, [text, dateFormat, fallbackYear, cell.text]);

  // カレンダーで日付を選んでも即確定はしない。入力欄のテキストを更新し、編集中セルを同期する
  // だけにして、確定は OK/Enter/Tab/別の箇所クリックに委ねる。
  const onCalendarChange = useCallback((newDate: Dayjs | null) => {
    if (!newDate) return;
    const formatted = newDate.format(DAYJS_FORMAT[dateFormat] || 'YYYY/MM/DD');
    setText(formatted);
    sync(formatted);
  }, [dateFormat, sync]);

  const toggleCalendar = useCallback(() => {
    setOpen(prev => {
      if (!prev) textBeforeCalendar.current = text;
      return !prev;
    });
  }, [text]);

  // OK: 現在の入力値を確定してセル編集を終了(Enter と同等)
  const onCalendarOk = useCallback(() => {
    setOpen(false);
    onCellChanged(toCell(inputRef.current?.value ?? text), true);
  }, [onCellChanged, toCell, text]);

  // Cancel: カレンダーを開く前の入力値に戻してカレンダーを閉じる(セル編集は継続)
  const onCalendarCancel = useCallback(() => {
    const reverted = textBeforeCalendar.current;
    setText(reverted);
    sync(reverted);
    setOpen(false);
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.setSelectionRange(reverted.length, reverted.length);
    }
  }, [sync]);

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      onKeyDown={e => {
        if (e.key === 'Escape') {
          if (open) {
            // カレンダーが開いているときはカレンダーだけ閉じる
            e.stopPropagation();
            setOpen(false);
          } else {
            // 編集をキャンセル。ReactGrid に伝播させると編集中セルを破棄して抜けてくれる。
            wasEscPressed.current = true;
          }
          return;
        }
        if (e.key === 'Enter') {
          // ReactGrid は Enter で編集を抜けるとき確定せず破棄する(G も Enter は自動確定対象外)。
          // そのため Enter は明示的に確定する。伝播は止めず、確定後に ReactGrid の下移動へ委ねる。
          onCellChanged(toCell(inputRef.current?.value ?? text), true);
          return;
        }
        // 文字・矢印キーは ReactGrid のセル移動/選択に奪われないよう伝播を止める。
        // Tab はあえて伝播させ、ReactGrid に「同期済み値の確定＋次セルへ移動」を任せる。
        if (isAlphaNumericKey(e.keyCode) || isNavigationKey(e.keyCode)) e.stopPropagation();
      }}
      onBlur={e => {
        const related = e.relatedTarget as Node | null;
        // フォーカスがエディタ内(入力欄/カレンダー/📅ボタン)に留まる間は何もしない
        if (e.currentTarget.contains(related)) return;
        if (wasEscPressed.current) {
          // ESC キャンセル: ReactGrid 側が編集を破棄するので確定しない
          wasEscPressed.current = false;
          return;
        }
        // 別セルへ移動した場合は ReactGrid が currentlyEditedCell(同期済み)を確定するため、
        // ここで確定すると二重確定(undo が2回必要)になる。グリッド外へ抜けたときだけ保険で確定。
        const gridContent = e.currentTarget.closest('.reactgrid-content');
        if (related && gridContent && gridContent.contains(related)) return;
        onCellChanged(toCell(inputRef.current?.value ?? text), true);
      }}
      className="customdatepicker"
      style={{ position: 'absolute', top: '-2px', left: '-2px', zIndex: 6 }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', background: 'aliceblue', border: '2px solid #3579F8', boxSizing: 'border-box' }}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => { setText(e.currentTarget.value); sync(e.currentTarget.value); }}
          onCopy={e => e.stopPropagation()}
          onCut={e => e.stopPropagation()}
          onPaste={e => e.stopPropagation()}
          style={{
            height: `${rowHeight - 3}px`,
            width: '77px',
            padding: '2px 4px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '0.73rem',
            fontFamily: 'Meiryo',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={toggleCalendar}
          onMouseDown={e => e.preventDefault()}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '0 2px',
            fontSize: '0.9rem',
            lineHeight: 1,
          }}
          aria-label="カレンダーを開く"
        >
          📅
        </button>
      </div>
      {open && (
        <div
          style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
          onMouseDown={e => e.preventDefault()}
        >
          <LocalizationProvider
            dateAdapter={AdapterDayjs}
            adapterLocale={(dateFormat === 'dd/MM/yyyy' || dateFormat === 'd/M/yyyy') ? "en-in" : (dateFormat === 'yyyy/MM/dd' || dateFormat === 'yyyy/M/d') ? "en-ca" : "en"}
          >
            <DateCalendar
              value={calendarValue}
              onChange={onCalendarChange}
              minDate={dayjs('1970/01/01')}
            />
          </LocalizationProvider>
          {/* カレンダー最終週の右端は埋まらない(土曜始まり31日でも届かない)ため、
              そこへ重ねて配置し縦スペースを節約する */}
          <div style={{ position: 'absolute', right: '8px', bottom: '8px', display: 'flex', gap: '6px', zIndex: 1 }}>
            <button
              type="button"
              tabIndex={-1}
              onClick={onCalendarCancel}
              onMouseDown={e => e.preventDefault()}
              style={{ padding: '2px 8px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={onCalendarOk}
              onMouseDown={e => e.preventDefault()}
              style={{ padding: '2px 10px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default CustomDatePicker;
