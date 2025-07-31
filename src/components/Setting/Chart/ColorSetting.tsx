// ColorSetting.tsx
import { useState, useCallback, memo } from "react";
import { ChromePicker, ColorResult } from 'react-color';
import { useSelector, useDispatch } from 'react-redux';
import Tippy from '@tippyjs/react';
import SettingChildDiv from "../SettingChildDiv";
import ColorInfoItem from "./ColorInfoItem";
import { useTranslation } from "react-i18next";
import { RootState } from "../../../reduxStoreAndSlices/store";
import { resetToDefaultColors, updateFallbackColor } from "../../../reduxStoreAndSlices/colorSlice";

const ColorSetting: React.FC = memo(() => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentColors = useSelector((state: RootState) => state.color.colors);
  const currentFallbackColor = useSelector((state: RootState) => state.color.fallbackColor);
  const isViewingPast = useSelector((state: RootState) => state.history?.isViewingPast || false);
  const previewData = useSelector((state: RootState) => state.history?.previewData);
  
  const colors = isViewingPast && previewData?.colors ? previewData.colors : currentColors;
  const fallbackColor = isViewingPast && previewData?.fallbackColor ? previewData.fallbackColor : currentFallbackColor;



  type DisplayColorPickerType = { [key: number]: boolean };
  const [displayColorPicker, setDisplayColorPicker] = useState<DisplayColorPickerType>({});
  const [displayFallbackColorPicker, setDisplayFallbackColorPicker] = useState(false);

  const handleColorClick = useCallback((id: number) => {
    setDisplayColorPicker(prevState => ({ ...prevState, [id]: !prevState[id] }));
  }, []);

  const handleColorClose = useCallback((id: number) => {
    setDisplayColorPicker(prevState => ({ ...prevState, [id]: false }));
  }, []);

  const handleFallbackColorClick = useCallback(() => {
    setDisplayFallbackColorPicker(!displayFallbackColorPicker);
  }, [displayFallbackColorPicker]);

  const handleFallbackColorClose = useCallback(() => {
    setDisplayFallbackColorPicker(false);
  }, []);

  const handleResetToDefaults = useCallback(() => {
    dispatch(resetToDefaultColors());
  }, [dispatch]);

  const handleFallbackColorChange = useCallback((color: ColorResult) => {
    const rgbaColor = `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${color.rgb.a})`;
    dispatch(updateFallbackColor(rgbaColor));
  }, [dispatch]);

  return (
    <SettingChildDiv text={
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{t('Chart Color (Alias)')}</span>
        <Tippy content={t('Color label tooltip')} placement="right">
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'help',
            userSelect: 'none'
          }}>
            ?
          </span>
        </Tippy>
      </div>
    }>

      {Object.entries(colors).filter(([id]) => parseInt(id) !== 999).map(([id, { alias, color }]) => (
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
      
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '3px' }}>
        <div
          style={{
            width: '55px',
            height: '20px',
            padding: '3px',
            margin: '2px',
            background: 'white',
            borderRadius: '5px',
            position: 'relative'
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: fallbackColor,
              border: '1px solid #00000016',
              borderRadius: '2px',
              cursor: 'pointer',
              position: 'absolute',
              top: 0,
              left: 0
            }}
            onClick={handleFallbackColorClick}
          />
          {displayFallbackColorPicker && (
            <div style={{ position: 'absolute', top: '24px', left: '33px', zIndex: '9999' }}>
              <div style={{ position: 'fixed', top: '0px', right: '0px', bottom: '0px', left: '0px' }} onClick={handleFallbackColorClose} />
              <div onClick={(e) => e.stopPropagation()}>
                <ChromePicker
                  color={fallbackColor}
                  onChange={handleFallbackColorChange}
                />
              </div>
            </div>
          )}
        </div>
        <span style={{ margin: 'auto 0', marginLeft: '10px' }}>{t('Default Color')}</span>
      </div>
      
      {Object.entries(colors).filter(([id]) => parseInt(id) === 999).map(([id, { alias, color }]) => (
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
      
      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
        <button
          onClick={handleResetToDefaults}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            background: '#f8f8f8',
            color: '#666',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f0f0f0';
            e.currentTarget.style.color = '#555';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f8f8f8';
            e.currentTarget.style.color = '#666';
          }}
        >
          {t('Reset to Default Colors')}
        </button>
      </div>
    </SettingChildDiv>
  );
});

export default ColorSetting;