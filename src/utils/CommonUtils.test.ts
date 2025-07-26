import { 
  generateDates,
  isRegularDaysOff,
  isHoliday,
  calculatePlannedDays,
  addPlannedDays,
  adjustColorOpacity,
  validateDateString,
  determineDateFormat
} from './CommonUtils';
import { cdate } from 'cdate';

describe('CommonUtils', () => {
  describe('generateDates', () => {
    it('should generate dates between start and end date', () => {
      const result = generateDates('2024/01/01', '2024/01/03');
      expect(result).toHaveLength(3);
      expect(result[0].format('YYYY/MM/DD')).toBe('2024/01/01');
      expect(result[2].format('YYYY/MM/DD')).toBe('2024/01/03');
    });

    it('should return empty array when start date is after end date', () => {
      const result = generateDates('2024/01/03', '2024/01/01');
      expect(result).toHaveLength(0);
    });

    it('should return single date when start equals end', () => {
      const result = generateDates('2024/01/01', '2024/01/01');
      expect(result).toHaveLength(1);
      expect(result[0].format('YYYY/MM/DD')).toBe('2024/01/01');
    });
  });

  describe('isRegularDaysOff', () => {
    it('should return true when day is in regular days off', () => {
      const result = isRegularDaysOff(0, [0, 6]); // Sunday
      expect(result).toBe(true);
    });

    it('should return false when day is not in regular days off', () => {
      const result = isRegularDaysOff(1, [0, 6]); // Monday
      expect(result).toBe(false);
    });

    it('should handle empty regular days off array', () => {
      const result = isRegularDaysOff(0, []);
      expect(result).toBe(false);
    });
  });

  describe('isHoliday', () => {
    it('should return true when date is in holidays list', () => {
      const date = cdate('2024/01/01');
      const holidays = ['2024/01/01', '2024/12/25'];
      const result = isHoliday(date, holidays);
      expect(result).toBe(true);
    });

    it('should return false when date is not in holidays list', () => {
      const date = cdate('2024/01/02');
      const holidays = ['2024/01/01', '2024/12/25'];
      const result = isHoliday(date, holidays);
      expect(result).toBe(false);
    });

    it('should handle empty holidays array', () => {
      const date = cdate('2024/01/01');
      const result = isHoliday(date, []);
      expect(result).toBe(false);
    });
  });

  describe('calculatePlannedDays', () => {
    it('should calculate days excluding weekends', () => {
      // Mon to Fri (5 working days)
      const result = calculatePlannedDays('2024/01/01', '2024/01/05', [], false, [0, 6]);
      expect(result).toBe(5);
    });

    it('should return 0 when start date is after end date', () => {
      const result = calculatePlannedDays('2024/01/05', '2024/01/01', [], false, [0, 6]);
      expect(result).toBe(0);
    });

    it('should include holidays when isIncludeHolidays is true', () => {
      const holidays = ['2024/01/01'];
      const result = calculatePlannedDays('2024/01/01', '2024/01/01', holidays, true, []);
      expect(result).toBe(1);
    });

    it('should exclude holidays when isIncludeHolidays is false', () => {
      const holidays = ['2024/01/01'];
      const result = calculatePlannedDays('2024/01/01', '2024/01/01', holidays, false, []);
      expect(result).toBe(0);
    });
  });

  describe('addPlannedDays', () => {
    it('should add working days correctly', () => {
      // Start Monday, add 5 days = Friday
      const result = addPlannedDays('2024/01/01', 5, [], false, true, [0, 6]);
      expect(result).toBe('2024/01/05');
    });

    it('should return empty string for null days', () => {
      const result = addPlannedDays('2024/01/01', null, [], false, true, []);
      expect(result).toBe('');
    });

    it('should return empty string for negative days', () => {
      const result = addPlannedDays('2024/01/01', -1, [], false, true, []);
      expect(result).toBe('');
    });

    it('should return empty string for empty start date', () => {
      const result = addPlannedDays('', 5, [], false, true, []);
      expect(result).toBe('');
    });
  });

  describe('adjustColorOpacity', () => {
    it('should adjust opacity for hex color with alpha', () => {
      const result = adjustColorOpacity('#ff0000ff');
      expect(result).toMatch(/^#ff0000[0-9a-f]{2}$/);
    });

    it('should add alpha to hex color without alpha', () => {
      const result = adjustColorOpacity('#ff0000');
      expect(result).toMatch(/^#ff0000[0-9a-f]{2}$/);
    });

    it('should adjust opacity for rgba color', () => {
      const result = adjustColorOpacity('rgba(255,0,0,1.0)');
      expect(result).toMatch(/^rgba\(255,0,0,0\.\d+\)$/);
    });

    it('should return original color for unsupported format', () => {
      const result = adjustColorOpacity('red');
      expect(result).toBe('red');
    });
  });

  describe('validateDateString', () => {
    it('should return valid date string unchanged', () => {
      const result = validateDateString('2024/01/01');
      expect(result).toBe('2024/01/01');
    });

    it('should return empty string for invalid date', () => {
      const result = validateDateString('invalid-date');
      expect(result).toBe('');
    });

    it('should return empty string for undefined input', () => {
      const result = validateDateString(undefined);
      expect(result).toBe('');
    });

    it('should return empty string for short date string', () => {
      const result = validateDateString('2024/1');
      expect(result).toBe('');
    });

    it('should return empty string for date outside valid range', () => {
      const result = validateDateString('1900/01/01');
      expect(result).toBe('');
    });
  });

  describe('determineDateFormat', () => {
    const originalLanguage = Object.getOwnPropertyDescriptor(navigator, 'language');

    afterEach(() => {
      if (originalLanguage) {
        Object.defineProperty(navigator, 'language', originalLanguage);
      }
    });

    it('should return yyyy/M/d for Japanese locale', () => {
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: 'ja-JP'
      });
      const result = determineDateFormat();
      expect(result).toBe('yyyy/M/d');
    });

    it('should return M/d/yyyy for English locale', () => {
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: 'en-US'
      });
      const result = determineDateFormat();
      expect(result).toBe('M/d/yyyy');
    });

    it('should return d/M/yyyy for French locale', () => {
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: 'fr-FR'
      });
      const result = determineDateFormat();
      expect(result).toBe('d/M/yyyy');
    });
  });
});