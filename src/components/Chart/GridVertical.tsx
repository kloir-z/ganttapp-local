// GridVertial.tsx
import React, { memo } from 'react';
import { isHoliday } from '../../utils/CommonUtils';
import { GanttRow, CalendarCell } from '../../styles/GanttStyles';
import { useSelector } from 'react-redux';
import { RootState } from '../../reduxStoreAndSlices/store';
import { cdate } from 'cdate';

interface CalendarProps {
  dateArray: ReturnType<typeof cdate>[];
  gridHeight: number;
}

const GridVertical: React.FC<CalendarProps> = memo(({ dateArray, gridHeight }) => {
  const currentHolidays = useSelector((state: RootState) => state.wbsData.holidays);
  const holidayColor = useSelector((state: RootState) => state.wbsData.holidayColor);
  const currentRegularDaysOffSetting = useSelector((state: RootState) => state.wbsData.regularDaysOffSetting);
  const isViewingPast = useSelector((state: RootState) => state.history?.isViewingPast || false);
  const previewData = useSelector((state: RootState) => state.history?.previewData);
  const holidays = isViewingPast && previewData?.holidays ? previewData.holidays : currentHolidays;
  const regularDaysOffSetting = isViewingPast && previewData?.regularDaysOffSetting ? previewData.regularDaysOffSetting : currentRegularDaysOffSetting;
  const cellWidth = useSelector((state: RootState) => state.baseSettings.cellWidth);

  return (
    <GanttRow style={{ height: '0px', borderBottom: 'none' }}>
      {dateArray.map((dateString, index) => {
        const date = dateString;
        const dayOfWeek = date.get('day');
        const isMonthStart = date.get('date') === 1;
        const isFirstDate = index === 0;
        const setting = Object.values(regularDaysOffSetting).find(s => s.days.includes(dayOfWeek));
        const selectedSetting = setting || (isHoliday(date, holidays) ? holidayColor : null);
        const bgColor = selectedSetting ? (cellWidth <= 8 ? selectedSetting.subColor : selectedSetting.color) : '';
        const left = cellWidth * index;
        const today = cdate();
        const isToday = date.format("YYYY/MM/DD") === today.format("YYYY/MM/DD");
        const keyDate = date.format("YYYYMMDD")
        let borderLeft;
        if (cellWidth > 5.5 && cellWidth <= 8) {
          borderLeft = '#00000008';
        } else if (cellWidth > 8 || dayOfWeek === 0) {
          borderLeft = '#00000010';
        } else {
          borderLeft = 'none';
        }

        return (
          <React.Fragment key={keyDate}>
            <CalendarCell
              key={index}
              data-index={index}
              $isMonthStart={isMonthStart}
              $isFirstDate={isFirstDate}
              $bgColor={bgColor}
              $borderLeft={borderLeft}
              style={{
                left: `${left}px`,
                height: `${gridHeight}px`,
                width: `${cellWidth + 0.1}px`,
              }}
            />
            {isToday && (
              <CalendarCell
                key={`${index}-overlay`}
                style={{
                  position: 'absolute',
                  left: `${left}px`,
                  height: `${gridHeight}px`,
                  width: `${cellWidth + 0.1}px`,
                  backgroundColor: 'rgba(255, 255, 0, 0.15)',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </GanttRow>
  );
});

export default GridVertical;