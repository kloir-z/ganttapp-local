// ActualBarSetting.tsx
// 実績終了日が未入力の行の実績バーを、当日まで伸ばして描くかどうかの全体設定。
import { memo, useCallback } from "react";
import { useDispatch, useSelector } from 'react-redux';
import Switch from '@mui/material/Switch';
import Tippy from '@tippyjs/react';
import SettingChildDiv from "../SettingChildDiv";
import { RootState } from "../../../reduxStoreAndSlices/store";
import { setExtendActualBarToToday } from "../../../reduxStoreAndSlices/baseSettingsSlice";
import { useTranslation } from "react-i18next";

const ActualBarSetting: React.FC = memo(() => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const extendActualBarToToday = useSelector((state: RootState) => state.baseSettings.extendActualBarToToday);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setExtendActualBarToToday(event.target.checked));
  }, [dispatch]);

  return (
    <SettingChildDiv text={
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{t('Actual Bar')}</span>
        <Tippy content={t('Extend to today tooltip')} placement="right">
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
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Switch
          checked={extendActualBarToToday}
          onChange={handleChange}
          name="extendActualBarToTodaySwitch"
          size="small"
        />
        <label style={{ marginLeft: '6px' }}>{t('Extend to today')}</label>
      </div>
    </SettingChildDiv>
  )
});

export default ActualBarSetting;
