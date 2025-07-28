// ColorInfoItem.tsx
import { useCallback, memo, useState, useRef, useEffect } from 'react';
import { ChromePicker, ColorResult } from 'react-color';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { updateAlias, updateColor } from '../../../reduxStoreAndSlices/colorSlice';
import { clearMessageInfo, setMessageInfo } from '../../../reduxStoreAndSlices/store';

type ColorInfoItemProps = {
  id: number;
  alias: string;
  color: string;
  handleColorClick: (id: number) => void;
  handleColorClose: (id: number) => void;
  displayColorPicker: boolean;
};

const ColorInfoItem: React.FC<ColorInfoItemProps> = memo(({
  id,
  alias,
  color,
  handleColorClick,
  handleColorClose,
  displayColorPicker
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [localAlias, setLocalAlias] = useState(alias);
  const aliasTimeoutRef = useRef<number | null>(null);
  const maxLength = 150;

  const validateTextLength = useCallback((text: string, maxLength: number) => {
    const length = text.length;
    return length <= maxLength;
  }, []);

  const resetAliasTimeout = useCallback(() => {
    if (aliasTimeoutRef.current) {
      clearTimeout(aliasTimeoutRef.current);
    }
    aliasTimeoutRef.current = window.setTimeout(() => {
      if (validateTextLength(localAlias, maxLength)) {
        dispatch(updateAlias({ id, alias: localAlias }));
      } else {
        dispatch(clearMessageInfo());
        const errorMessage = t('Too long text.', { maxLength, inputLength: localAlias.length });
        dispatch(setMessageInfo({ message: errorMessage, severity: 'error' }));
      }
    }, 100);
  }, [dispatch, id, localAlias, t, validateTextLength]);

  useEffect(() => {
    resetAliasTimeout();
  }, [localAlias, resetAliasTimeout]);

  useEffect(() => {
    setLocalAlias(alias);
  }, [alias]);

  const handleColorChange = useCallback((id: number) => (color: ColorResult) => {
    const rgbaColor = `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${color.rgb.a})`;
    dispatch(updateColor({ id, color: rgbaColor }));
  }, [dispatch]);

  return (
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
            background: color,
            border: '1px solid #00000016',
            borderRadius: '2px',
            cursor: 'pointer',
            position: 'absolute',
            top: 0,
            left: 0
          }}
          onClick={() => handleColorClick(id)}
        />
        {displayColorPicker && (
          <div style={{ position: 'absolute', top: '24px', left: '33px', zIndex: '9999' }}>
            <div style={{ position: 'fixed', top: '0px', right: '0px', bottom: '0px', left: '0px' }} onClick={() => handleColorClose(id)} />
            <div onClick={(e) => e.stopPropagation()}>
              <ChromePicker
                color={color}
                onChange={handleColorChange(id)}
              />
            </div>
          </div>
        )}
      </div>
      {id === 999 ? (
        <span style={{ margin: 'auto 0', marginLeft: '10px' }}>{t('Actual Chart Color')}</span>
      ) : (
        <input
          type="text"
          value={localAlias}
          onChange={(e) => setLocalAlias(e.target.value)}
          placeholder={t('Enter color alias...')}
          style={{
            height: '28px',
            margin: '2px',
            padding: '6px 12px',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            background: '#ffffff',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            outline: 'none',
            minWidth: '200px',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#1976d2';
            e.target.style.boxShadow = '0 0 0 2px rgba(25, 118, 210, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e0e0e0';
            e.target.style.boxShadow = 'none';
          }}
        />
      )}
    </div>
  );
});

export default ColorInfoItem;