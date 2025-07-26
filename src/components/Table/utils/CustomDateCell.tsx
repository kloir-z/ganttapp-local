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
    keyCode: number
  ): { cell: Compatible<CustomDateCell>; enableEditMode: boolean } {
    if (keyCode === keyCodes.F2 || keyCode === keyCodes.POINTER) {
      return { cell, enableEditMode: true };
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
          onCellChanged={(updatedCell, commit) => {
            onCellChanged(updatedCell, commit);
          }}
        />
      );
    }
    return <span>{this.showYear ? cell.longDate : cell.shortDate}</span>;
  }
}