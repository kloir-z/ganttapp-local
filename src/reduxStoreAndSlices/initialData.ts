import { assignIds } from "../components/Table/utils/wbsHelpers";
import { WBSData, ChartRow, SeparatorRow, EventRow } from "../types/DataTypes";

const createEmptySeparatorRow = (): SeparatorRow => ({
  rowType: "Separator",
  no: 0,
  id: "",
  displayName: "",
  isCollapsed: false,
  level: 0
});

const createEmptyEventRow = (): EventRow => ({
  rowType: "Event",
  no: 0,
  id: "",
  displayName: "",
  textColumn1: "",
  textColumn2: "",
  textColumn3: "",
  color: "",
  plannedStartDate: "",
  plannedEndDate: "",
  plannedDays: null,
  actualStartDate: "",
  actualEndDate: "",
  progress: "",
  eventData: []
});

const createEmptyChartRow = (): ChartRow => ({
  rowType: "Chart",
  no: 0,
  id: "",
  displayName: "",
  textColumn1: "",
  textColumn2: "",
  textColumn3: "",
  color: "",
  plannedStartDate: "",
  plannedEndDate: "",
  plannedDays: null,
  actualStartDate: "",
  actualEndDate: "",
  progress: "",
  dependentId: "",
  dependency: "",
  isIncludeHolidays: false
});

const createStructuredEmptyDataArray = (): WBSData[] => {
  const data: WBSData[] = [];
  data.push(createEmptySeparatorRow());
  data.push(createEmptyEventRow());
  for (let i = 0; i < 50; i++) {
    data.push(createEmptyChartRow());
  }
  return data;
};

const structuredEmptyData: WBSData[] = createStructuredEmptyDataArray();

export const initializedEmptyData: { [id: string]: WBSData } = assignIds(structuredEmptyData);