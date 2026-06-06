// CustomDateCellTemplate.tsx
import CustomDatePicker from "./CustomDatePicker";
import { CellTemplate, Compatible, Uncertain, UncertainCompatible, keyCodes, Cell } from "@silevis/reactgrid";
import { standardizeLongDateFormat, standardizeLongDateFormatText, standardizeShortDateFormat } from "./wbsHelpers";
import { DateFormatType } from "../../../types/DataTypes";
import 'dayjs/locale/en-ca';
import 'dayjs/locale/en-in';
import 'dayjs/locale/en';

export interface CustomDateCell extends Cell {
  type: 'customDate';
  text: string;
  longDate: string;
  shortDate: string;
  value: number;
  // タイプ入力で編集開始したときの最初の文字。getCompatibleCell の正規化で消える text とは
  // 別フィールドで持つことで、ReactGrid の編集中セル状態に乗せて render まで確実に届ける。
  seedText?: string;
}

export class CustomDateCellTemplate implements CellTemplate<CustomDateCell> {
  showYear: boolean;
  dateFormat: DateFormatType;
  constructor(showYear: boolean, dateFormat: DateFormatType) {
    this.showYear = showYear;
    this.dateFormat = dateFormat;
  }
  getCompatibleCell(uncertainCell: Uncertain<CustomDateCell>): Compatible<CustomDateCell> {
    let text = uncertainCell.text || '';
    let longDate = ''
    let shortDate = ''
    text = standardizeLongDateFormatText(text, this.dateFormat) || '';
    longDate = standardizeLongDateFormat(text, this.dateFormat) || '';
    shortDate = standardizeShortDateFormat(text, this.dateFormat) || '';
    const value = NaN;
    return { ...uncertainCell, text, longDate, shortDate, value };
  }

  handleKeyDown(
    cell: Compatible<CustomDateCell>,
    keyCode: number,
    ctrl: boolean,
    _shift: boolean,
    alt: boolean,
    key?: string
  ): { cell: Compatible<CustomDateCell>; enableEditMode: boolean } {
    if (keyCode === keyCodes.F2 || keyCode === keyCodes.POINTER) {
      return { cell: { ...cell, seedText: undefined }, enableEditMode: true };
    }
    // 数字・区切り(/ - .)を打ち始めたら、その文字をシードにテキスト入力で編集開始。
    // cell.text は変更せず(正規化で消えるため) seedText に載せて render へ渡す。
    if (key && /^[0-9/\-.]$/.test(key) && !ctrl && !alt && keyCode !== 229) {
      return { cell: { ...cell, seedText: key }, enableEditMode: true };
    }
    return { cell, enableEditMode: false };
  }

  update(cell: Compatible<CustomDateCell>, cellToMerge: UncertainCompatible<CustomDateCell>): Compatible<CustomDateCell> {
    return this.getCompatibleCell({ ...cell, text: cellToMerge.text });
  }

  render(
    cell: Compatible<CustomDateCell>,
    isInEditMode: boolean,
    onCellChanged: (cell: Compatible<CustomDateCell>, commit: boolean) => void
  ): React.ReactNode {
    if (isInEditMode) {
      return (
        <CustomDatePicker
          cell={cell}
          initialText={cell.seedText}
          onCellChanged={(updatedCell, commit) => {
            onCellChanged(updatedCell, commit);
          }}
        />
      );
    }
    return <span>{this.showYear ? cell.longDate : cell.shortDate}</span>;
  }
}