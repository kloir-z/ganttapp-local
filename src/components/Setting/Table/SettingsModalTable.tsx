// SettingsModalTable.tsx
import { memo } from "react";
import ColumnSetting from "./ColumnSetting";
import SettingsModalDiv from "../SettingsModalDiv";
import { useSelector } from "react-redux";
import { RootState } from "../../../reduxStoreAndSlices/store";

const SettingsModalTable: React.FC = memo(() => {
  const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);
  return (
    (activeModal === 'settingstable') &&
    <SettingsModalDiv>
      <ColumnSetting />
    </SettingsModalDiv>
  )
});

export default SettingsModalTable;