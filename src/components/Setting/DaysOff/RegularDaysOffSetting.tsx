import React, { useState, useCallback, memo } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, updateRegularDaysOffColor, updateRegularDaysOffSetting } from "../../../reduxStoreAndSlices/store";
import { ChromePicker, ColorResult } from 'react-color';
import SettingChildDiv from "../SettingChildDiv";
import { useTranslation } from "react-i18next";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const RegularDaysOffSettings: React.FC = memo(() => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const regularDaysOffSetting = useSelector((state: RootState) => state.wbsData.regularDaysOffSetting);

  const handleDayChange = useCallback((id: number, changedDay: number) => {
    const setting = regularDaysOffSetting[id];
    if (!setting) return;
    const add = !setting.days.includes(changedDay);
    dispatch(updateRegularDaysOffSetting({ id, day: changedDay, add }));
  }, [dispatch, regularDaysOffSetting]);

  type DisplayColorPickerType = { [key: number]: boolean };
  const [displayColorPicker, setDisplayColorPicker] = useState<DisplayColorPickerType>({});

  const handleColorClick = (id: number) => {
    setDisplayColorPicker({ ...displayColorPicker, [id]: !displayColorPicker[id] });
  };

  const handleColorClose = (id: number) => {
    setDisplayColorPicker({ ...displayColorPicker, [id]: false });
  };

  const handleColorChange = useCallback((id: number, color: string) => {
    dispatch(updateRegularDaysOffColor({ id, color }));
  }, [dispatch]);

  return (
    <SettingChildDiv text={t('Regular Days Off')}>
      <table style={{ borderCollapse: 'collapse', width: '278px' }}>
        <thead>
          <tr>
            <th style={{ padding: '4px' }}></th>
            {daysOfWeek.map((day, index) => (
              <th key={index} style={{ padding: '4px' }}>{t(day)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(regularDaysOffSetting).map(([id, setting]) => (
            <tr key={id}>
              <td style={{ position: 'relative', width: '62px', height: '26px', display: 'flex', alignItems: 'flex-start', padding: '2px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '25px',
                    background: setting.color,
                    border: '1px solid #00000016',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    margin: 'auto'
                  }}
                  onClick={() => handleColorClick(parseInt(id))}
                ></div>
                {displayColorPicker[parseInt(id)] && (
                  <div style={{ position: 'absolute', zIndex: '9999', left: '70px', top: '0px' }}>
                    <div style={{ position: 'fixed', top: '0px', right: '0px', bottom: '0px', left: '0px' }} onClick={() => handleColorClose(parseInt(id))} />
                    <ChromePicker
                      color={setting.color}
                      onChange={(color: ColorResult) => {
                        const rgbaColor = `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${color.rgb.a})`;
                        handleColorChange(parseInt(id), rgbaColor);
                      }}
                    />
                  </div>
                )}
              </td>
              {daysOfWeek.map((_day, index) => (
                <td key={index} style={{ padding: '4px', textAlign: 'center' }} onClick={() => handleDayChange(parseInt(id), index)}>
                  <input
                    type="checkbox"
                    checked={setting.days.includes(index)}
                    readOnly
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </SettingChildDiv>
  );
});

export default RegularDaysOffSettings;