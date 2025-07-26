// SettingsModalDaysOff.tsx
import { memo } from "react";
import HolidaySetting from "./HolidaySetting";
import RegularDaysOffSettings from "./RegularDaysOffSetting";
import SettingsModalDiv from "../SettingsModalDiv";
import { useSelector } from "react-redux";
import { RootState } from "../../../reduxStoreAndSlices/store";

const SettingsModalDaysOff: React.FC = memo(() => {
  const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);
  return (
    (activeModal === 'settingsdaysoff') &&
    <SettingsModalDiv>
      <RegularDaysOffSettings />
      <HolidaySetting />
    </SettingsModalDiv>
  )
});

export default SettingsModalDaysOff;