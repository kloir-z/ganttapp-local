// CellWidthSetting.tsx
import { memo, useCallback } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { setCellWidth } from "../../../reduxStoreAndSlices/baseSettingsSlice";
import { Slider } from '@mui/material';
import SettingChildDiv from "../SettingChildDiv";
import { RootState } from "../../../reduxStoreAndSlices/store";
import { useTranslation } from "react-i18next";

const CellWidthSetting: React.FC = memo(() => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const cellWidth = useSelector((state: RootState) => state.baseSettings.cellWidth);

  const handleSliderChange = useCallback((_: Event, value: number | number[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    dispatch(setCellWidth(newValue));
  }, [dispatch]);

  return (
    <SettingChildDiv text={t('Chart Cell Width')}>
      <Slider
        aria-labelledby="cell-width-slider"
        value={cellWidth}
        onChange={handleSliderChange}
        step={0.5}
        marks
        min={3}
        max={21}
        valueLabelDisplay="auto"
      />
    </SettingChildDiv>
  )
});

export default CellWidthSetting;