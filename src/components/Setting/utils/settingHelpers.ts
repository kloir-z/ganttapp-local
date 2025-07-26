import { DateFormatType } from "../../../types/DataTypes";

export const parseHolidaysFromInput = (holidayInput: string, dateFormat: DateFormatType) => {
  const regexPatterns = {
    "yyyy/MM/dd": /^(\d{4})[/-]?(\d{1,2})[/-]?(\d{1,2})/,
    "MM/dd/yyyy": /^(\d{1,2})[/-]?(\d{1,2})[/-]?(\d{4})/,
    "dd/MM/yyyy": /^(\d{1,2})[/-]?(\d{1,2})[/-]?(\d{4})/,
    "yyyy/M/d": /^(\d{4})[/-]?(\d{1,2})[/-]?(\d{1,2})/,
    "M/d/yyyy": /^(\d{1,2})[/-]?(\d{1,2})[/-]?(\d{4})/,
    "d/M/yyyy": /^(\d{1,2})[/-]?(\d{1,2})[/-]?(\d{4})/
  };
  const newHolidays = holidayInput.split("\n").map(holiday => {
    const match = holiday.match(regexPatterns[dateFormat]);
    if (match) {
      const [year, month, day] = (dateFormat === "yyyy/MM/dd" || dateFormat === "yyyy/M/d") ? [match[1], match[2], match[3]] :
        (dateFormat === "MM/dd/yyyy" || dateFormat === "M/d/yyyy") ? [match[3], match[1], match[2]] :
          [match[3], match[2], match[1]]; // "dd/MM/yyyy"
      const formattedMonth = month.padStart(2, '0');
      const formattedDay = day.padStart(2, '0');
      return `${year}/${formattedMonth}/${formattedDay}`;
    }
    return null;
  }).filter((holiday): holiday is string => holiday !== null);
  return newHolidays;
};