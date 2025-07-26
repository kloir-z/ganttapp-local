// SettingsModalBasic.tsx
import { memo, useCallback } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setDateFormat } from '../../../reduxStoreAndSlices/store';
import { DateFormatType } from "../../../types/DataTypes";
import SettingsModalDiv from "../SettingsModalDiv";
import SettingChildDiv from "../SettingChildDiv";
import DateRangeSetting from "./DateRangeSetting";
import { useTranslation } from "react-i18next";
import { useLanguageChange } from "../../../hooks/useLanguageChange";

const SettingsModalBasic: React.FC = memo(() => {
  const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentFormat = useSelector((state: RootState) => state.wbsData.dateFormat);
  const currentLanguage = useSelector((state: RootState) => state.baseSettings.language);
  const handleLanguageChange = useLanguageChange();

  const handleDayFormatChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setDateFormat(event.target.value as DateFormatType));
  }, [dispatch]);

  return (
    (activeModal === 'settingsbasic') &&
    <SettingsModalDiv>
      <SettingChildDiv text={t('Language & Date Format')}>
        <div>
          <select value={currentLanguage} onChange={(e) => handleLanguageChange(e.target.value)} >
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
          <span style={{ whiteSpace: 'pre' }}>   </span>
          <select value={currentFormat} onChange={handleDayFormatChange}>
            <option value="yyyy/M/d">yyyy/M/d</option>
            <option value="yyyy/MM/dd">yyyy/MM/dd</option>
            <option value="M/d/yyyy">M/d/yyyy</option>
            <option value="MM/dd/yyyy">MM/dd/yyyy</option>
            <option value="d/M/yyyy">d/M/yyyy</option>
            <option value="dd/MM/yyyy">dd/MM/yyyy</option>
          </select>
        </div>
      </SettingChildDiv>
      <DateRangeSetting />
    </SettingsModalDiv>
  )
});

export default SettingsModalBasic;