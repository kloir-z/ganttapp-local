import { RegularDaysOffSettingsType } from "../types/DataTypes";
import { adjustColorOpacity } from "../utils/CommonUtils";

export const initialRegularDaysOffSetting: RegularDaysOffSettingsType = {
  1: { color: '#d9e6ff', subColor: adjustColorOpacity('#d9e6ff'), days: [6] },
  2: { color: '#ffdcdc', subColor: adjustColorOpacity('#ffdcdc'), days: [0] },
  3: { color: '#EFEFEF', subColor: adjustColorOpacity('#EFEFEF'), days: [] },
};