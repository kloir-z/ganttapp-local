// SettingsModalChart.tsx
import { memo } from "react";
import ColorSetting from "./ColorSetting";
import CellWidthSetting from "./CellWidthSetting";
import SettingsModalDiv from "../SettingsModalDiv";
import { useSelector } from "react-redux";
import { RootState } from "../../../reduxStoreAndSlices/store";

const SettingsModalChart: React.FC = memo(() => {
  const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);
  return (
    (activeModal === 'settingschart') &&
    <SettingsModalDiv>
      <ColorSetting />
      <CellWidthSetting />
    </SettingsModalDiv>
  )
});

export default SettingsModalChart;