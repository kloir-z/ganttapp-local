// ActualBarSetting.tsx
// 実績終了日が未入力の行の実績バーを、当日まで伸ばして描くかどうかの全体設定。
import { memo, useCallback } from "react";
import { useDispatch, useSelector } from 'react-redux';
import Switch from '@mui/material/Switch';
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
    <SettingChildDiv text={t('Actual Bar')}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Switch
          checked={extendActualBarToToday}
          onChange={handleChange}
          name="extendActualBarToTodaySwitch"
        />
        <label>{t('Extend to today when actual end is empty')}</label>
      </div>
      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
        {t('Extend to today description')}
      </div>
    </SettingChildDiv>
  )
});

export default ActualBarSetting;
