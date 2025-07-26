// HolidaySetting.tsx
import React, { memo, useCallback, useState } from "react";
import { parseHolidaysFromInput } from "../utils/settingHelpers";
import { setHolidayInput } from "../../../reduxStoreAndSlices/baseSettingsSlice";
import { useSelector, useDispatch } from 'react-redux';
import { clearMessageInfo, RootState, setMessageInfo, updateHolidayColor, setHolidays } from "../../../reduxStoreAndSlices/store";
import SettingChildDiv from "../SettingChildDiv";
import { ChromePicker, ColorResult } from "react-color";
import { useTranslation } from "react-i18next";

const HolidaySetting: React.FC = memo(() => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const rowHeight = useSelector((state: RootState) => state.baseSettings.rowHeight);
  const holidayInput = useSelector((state: RootState) => state.baseSettings.holidayInput);
  const holidayColor = useSelector((state: RootState) => state.wbsData.holidayColor);
  const dateFormat = useSelector((state: RootState) => state.wbsData.dateFormat);
  const maxLength = 5000;

  const validateTextLength = useCallback((text: string, maxLength: number) => {
    const length = text.length;
    return length <= maxLength;
  }, []);

  const handleBlur = useCallback(() => {
    if (validateTextLength(holidayInput, maxLength)) {
      dispatch(setHolidays(parseHolidaysFromInput(holidayInput, dateFormat)))
    } else {
      dispatch(clearMessageInfo());
      const errorMessage = t('Too long text.', { maxLength, inputLength: holidayInput.length });
      dispatch(setMessageInfo({ message: errorMessage, severity: 'error' }));
    }
  }, [dateFormat, dispatch, holidayInput, t, validateTextLength]);

  const [displayColorPicker, setDisplayColorPicker] = useState<boolean>(false);

  const handleColorClick = useCallback(() => {
    setDisplayColorPicker(!displayColorPicker);
  }, [displayColorPicker]);

  const handleColorClose = useCallback(() => {
    setDisplayColorPicker(false);
  }, []);

  const handleColorChange = useCallback((color: string) => {
    dispatch(updateHolidayColor(color));
  }, [dispatch]);

  return (
    <SettingChildDiv text={t('Public Holidays / Irregular Days Off')}>
      <div
        style={{
          width: '60px',
          height: '25px',
          background: holidayColor.color,
          border: '1px solid #00000016',
          borderRadius: '2px',
          cursor: 'pointer',
        }}
        onClick={() => handleColorClick()}
      ></div>
      {displayColorPicker && (
        <div style={{ position: 'absolute', zIndex: '9999', left: '90px', top: `${rowHeight}px` }}>
          <div style={{ position: 'fixed', top: '0px', right: '0px', bottom: '0px', left: '0px' }} onClick={() => handleColorClose()} />
          <ChromePicker
            color={holidayColor.color}
            onChange={(color: ColorResult) => {
              const rgbaColor = `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${color.rgb.a})`;
              handleColorChange(rgbaColor);
            }}
          />
        </div>
      )}
      <textarea
        value={holidayInput}
        onChange={(e) => dispatch(setHolidayInput(e.target.value))}
        onBlur={handleBlur}
        style={{ position: 'absolute', padding: '10px', top: '55px', minWidth: '280px', minHeight: '300px', overflow: 'auto', whiteSpace: 'nowrap', backgroundColor: '#FFF', zIndex: '15', fontSize: '0.73rem' }}
      />
      <div style={{ height: '340px' }}></div>

    </SettingChildDiv>
  );
});

export default HolidaySetting;