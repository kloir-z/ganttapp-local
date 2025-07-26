// ColorSetting.tsx
import { useState, useCallback, memo } from "react";
import { useSelector } from 'react-redux';
import SettingChildDiv from "../SettingChildDiv";
import ColorInfoItem from "./ColorInfoItem";
import { useTranslation } from "react-i18next";
import { RootState } from "../../../reduxStoreAndSlices/store";

const ColorSetting: React.FC = memo(() => {
  const { t } = useTranslation();
  const colors = useSelector((state: RootState) => state.color.colors);

  type DisplayColorPickerType = { [key: number]: boolean };
  const [displayColorPicker, setDisplayColorPicker] = useState<DisplayColorPickerType>({});

  const handleColorClick = useCallback((id: number) => {
    setDisplayColorPicker(prevState => ({ ...prevState, [id]: !prevState[id] }));
  }, []);

  const handleColorClose = useCallback((id: number) => {
    setDisplayColorPicker(prevState => ({ ...prevState, [id]: false }));
  }, []);

  return (
    <SettingChildDiv text={t('Chart Color (Alias)')}>
      {Object.entries(colors).map(([id, { alias, color }]) => (
        <ColorInfoItem
          key={id}
          id={parseInt(id)}
          color={color}
          alias={alias}
          handleColorClick={handleColorClick}
          handleColorClose={handleColorClose}
          displayColorPicker={displayColorPicker[parseInt(id)]}
        />
      ))}
    </SettingChildDiv>
  );
});

export default ColorSetting;