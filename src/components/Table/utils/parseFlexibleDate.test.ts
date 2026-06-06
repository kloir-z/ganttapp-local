import { parseFlexibleDate } from './wbsHelpers';

describe('parseFlexibleDate', () => {
  const YEAR = 2026;

  describe('year-first format (yyyy/MM/dd)', () => {
    const fmt = 'yyyy/MM/dd' as const;
    test('m/d は年を補完する', () => {
      expect(parseFlexibleDate('8/4', fmt, YEAR)).toBe('2026/08/04');
    });
    test('yyyy/m/d はそのまま', () => {
      expect(parseFlexibleDate('2026/8/4', fmt, YEAR)).toBe('2026/08/04');
    });
    test('yyyy/mm は日を1に補完する', () => {
      expect(parseFlexibleDate('2026/8', fmt, YEAR)).toBe('2026/08/01');
    });
    test('ゼロ埋め入力も解釈する', () => {
      expect(parseFlexibleDate('2026/08/04', fmt, YEAR)).toBe('2026/08/04');
    });
    test('区切りは - . 空白も許容', () => {
      expect(parseFlexibleDate('2026-8-4', fmt, YEAR)).toBe('2026/08/04');
      expect(parseFlexibleDate('2026.8.4', fmt, YEAR)).toBe('2026/08/04');
    });
    test('8桁連結 yyyymmdd を分解する', () => {
      expect(parseFlexibleDate('20260804', fmt, YEAR)).toBe('2026/08/04');
    });
  });

  describe('day-first format (dd/MM/yyyy)', () => {
    const fmt = 'dd/MM/yyyy' as const;
    test('d/m は年を補完する', () => {
      expect(parseFlexibleDate('4/8', fmt, YEAR)).toBe('2026/08/04');
    });
    test('d/m/yyyy はその並びで解釈', () => {
      expect(parseFlexibleDate('4/8/2026', fmt, YEAR)).toBe('2026/08/04');
    });
  });

  describe('month-first format (MM/dd/yyyy)', () => {
    const fmt = 'MM/dd/yyyy' as const;
    test('m/d は年を補完する', () => {
      expect(parseFlexibleDate('8/4', fmt, YEAR)).toBe('2026/08/04');
    });
    test('m/d/yyyy はその並びで解釈', () => {
      expect(parseFlexibleDate('8/4/2026', fmt, YEAR)).toBe('2026/08/04');
    });
  });

  describe('4桁年トークンは並びに関わらず年として扱う', () => {
    test('day-first 設定でも yyyy が含まれれば年と判定', () => {
      expect(parseFlexibleDate('2026/8/4', 'dd/MM/yyyy', YEAR)).toBe('2026/08/04');
    });
  });

  describe('不正値', () => {
    const fmt = 'yyyy/MM/dd' as const;
    test('存在しない日付は null', () => {
      expect(parseFlexibleDate('2026/2/30', fmt, YEAR)).toBeNull();
      expect(parseFlexibleDate('2026/13/1', fmt, YEAR)).toBeNull();
    });
    test('空文字・数字以外は null', () => {
      expect(parseFlexibleDate('', fmt, YEAR)).toBeNull();
      expect(parseFlexibleDate('abc', fmt, YEAR)).toBeNull();
    });
    test('単一要素は曖昧なので null', () => {
      expect(parseFlexibleDate('8', fmt, YEAR)).toBeNull();
    });
  });
});
