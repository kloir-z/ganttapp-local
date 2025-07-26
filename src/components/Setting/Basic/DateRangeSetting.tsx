// DateRangeSetting.tsx
import React, { useEffect, memo, useCallback } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from "../../../reduxStoreAndSlices/store";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { setDateRange } from "../../../reduxStoreAndSlices/baseSettingsSlice";
import SettingChildDiv from "../SettingChildDiv";
import { useTranslation } from "react-i18next";

const DateRangeSetting: React.FC = memo(() => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const dateRange = useSelector((state: RootState) => state.baseSettings.dateRange);
  const { startDate, endDate } = useSelector((state: RootState) => state.baseSettings.dateRange);
  const dateFormat = useSelector((state: RootState) => state.wbsData.dateFormat);

  const isValidDateRange = useCallback((date: Dayjs) => {
    const earliestDate = dayjs('1900-01-01');
    const latestDate = dayjs('2099-12-31');
    return date.isAfter(earliestDate) && date.isBefore(latestDate);
  }, []);

  const handleStartDateChange = useCallback((date: Dayjs | null) => {
    if (!date || !isValidDateRange(date)) {
      return;
    }
    const formattedDate = date.format('YYYY-MM-DD');
    let newEndDate = endDate;
    if (!newEndDate || dayjs(date).isAfter(dayjs(endDate))) {
      newEndDate = date.add(7, 'day').format('YYYY-MM-DD');
    }
    dispatch(setDateRange({ startDate: formattedDate, endDate: newEndDate }));
  }, [dispatch, endDate, isValidDateRange]);

  const handleEndDateChange = useCallback((date: Dayjs | null) => {
    if (!date || !isValidDateRange(date) || dayjs(startDate).isAfter(date)) {
      return;
    }
    dispatch(setDateRange({ startDate, endDate: date.format('YYYY-MM-DD') }));
  }, [dispatch, isValidDateRange, startDate]);

  useEffect(() => {
    const startDay = dayjs(startDate);
    const endDay = dayjs(endDate);
    if (startDay.isValid() && endDay.isValid()) {
      if (!isValidDateRange(startDay)) {
        dispatch(setDateRange({ startDate: dayjs().format('YYYY-MM-DD'), endDate }));
        return;
      }
      const maxEndDate = startDay.add(3, 'year');
      if (endDay.isAfter(maxEndDate)) {
        dispatch(setDateRange({ startDate, endDate: maxEndDate.format('YYYY-MM-DD') }));
      } else {
        dispatch(setDateRange({ startDate, endDate }));
      }
    }
  }, [startDate, endDate, dispatch, isValidDateRange]);

  return (
    <SettingChildDiv text={t('Calendar Date Range')}>
      <div>
        <LocalizationProvider
          dateFormats={(dateFormat === 'yyyy/MM/dd' || dateFormat === 'yyyy/M/d') ? { monthAndYear: 'YYYY / MM' } : undefined}
          dateAdapter={AdapterDayjs}
          adapterLocale={(dateFormat === 'dd/MM/yyyy' || dateFormat === 'd/M/yyyy') ? "en-in" : (dateFormat === 'yyyy/MM/dd' || dateFormat === 'yyyy/M/d') ? "en-ca" : "en"}
        >
          <DatePicker
            label="Start"
            value={dayjs(dateRange.startDate)}
            onChange={handleStartDateChange}
            sx={{
              '& .MuiInputBase-root': {
                borderRadius: '4px',
                padding: '3px',
                marginRight: '20px'
              },
              '& .MuiInputBase-input': {
                padding: '5px',
                width: '70px',
                fontSize: '0.73rem',
                fontFamily: 'Meiryo'
              },
              '& .MuiButtonBase-root': {
                padding: '3px',
                margin: '0px'
              },
            }}
          />
          <DatePicker
            label="End"
            value={dayjs(dateRange.endDate)}
            onChange={handleEndDateChange}
            sx={{
              '& .MuiInputBase-root': {
                borderRadius: '4px',
                padding: '3px'
              },
              '& .MuiInputBase-input': {
                padding: '5px',
                width: '70px',
                fontSize: '0.73rem',
                fontFamily: 'Meiryo'
              },
              '& .MuiButtonBase-root': {
                padding: '3px',
                margin: '0px'
              },
            }}
          />
        </LocalizationProvider>
      </div>
    </SettingChildDiv>
  );
});

export default DateRangeSetting;