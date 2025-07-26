/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { handleExport, handleImport } from './ExportImportHandler';
import { configureStore } from '@reduxjs/toolkit';
import { ColorInfo } from '../reduxStoreAndSlices/colorSlice';
import { WBSData } from '../types/DataTypes';
import { ExtendedColumn } from '../reduxStoreAndSlices/store';
import { NotesModalState } from '../reduxStoreAndSlices/notesSlice';

// Mock i18n
jest.mock('i18next', () => ({
  changeLanguage: jest.fn()
}));

// Mock JSZip - simplified for testing
jest.mock('jszip', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      file: jest.fn(),
      generateAsync: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'application/zip' })),
      loadAsync: jest.fn().mockResolvedValue({
        files: {
          'test.json': {
            async: jest.fn().mockResolvedValue('{"title": "test"}')
          }
        }
      })
    })),
    loadAsync: jest.fn()
  };
});

// Mock store and reducers
const mockDispatch = jest.fn();
const mockStore = configureStore({
  reducer: {
    test: (state = {}) => state
  }
});

describe('ExportImportHandler', () => {
  const testFileId = 'test-project';
  const testColors: { [id: number]: ColorInfo } = {
    1: { alias: 'Red', color: '#ff0000' }
  };
  const testDateRange = { startDate: '2024-01-01', endDate: '2024-01-31' };
  const testColumns: ExtendedColumn[] = [
    { 
      columnId: 'no', 
      columnName: 'No', 
      width: 50, 
      resizable: true,
      visible: true,
      reorderable: false
    }
  ];
  const testData: { [id: string]: WBSData } = {
    '1': {
      id: '1',
      no: 1,
      rowType: 'Chart',
      displayName: 'Test Task',
      textColumn1: '',
      textColumn2: '',
      textColumn3: '',
      color: '#ff0000',
      plannedStartDate: '2024/01/01',
      plannedEndDate: '2024/01/05',
      plannedDays: 5,
      actualStartDate: '',
      actualEndDate: '',
      progress: '0',
      dependentId: '',
      dependency: '',
      isIncludeHolidays: false
    }
  };

  beforeEach(() => {
    mockDispatch.mockClear();
    jest.clearAllMocks();
  });

  describe('handleExport', () => {
    it('should create a ZIP file with project data', async () => {
      const result = await handleExport(
        testFileId,
        testColors,
        testDateRange,
        testColumns,
        testData,
        '2024/01/01 New Year',
        { color: '#ff0000', subColor: '#ff000080' },
        { 0: { color: '#ff0000', subColor: '#ff000080', days: [0, 6] } },
        690,
        1000,
        21,
        'Test Project',
        true,
        'yyyy/M/d',
        [],
        {},
        'ja'
      );

      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle export with optional parameters', async () => {
      const notesModalState: NotesModalState = {
        treeWidth: 200,
        noteWidth: 400,
        noteHeight: 300,
        position: { x: 100, y: 100 }
      };

      const result = await handleExport(
        testFileId,
        testColors,
        testDateRange,
        testColumns,
        testData,
        '2024/01/01 New Year',
        { color: '#ff0000', subColor: '#ff000080' },
        { 0: { color: '#ff0000', subColor: '#ff000080', days: [0, 6] } },
        690,
        1000,
        21,
        'Test Project',
        true,
        'yyyy/M/d',
        [],
        {},
        'ja',
        notesModalState
      );

      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('handleImport', () => {
    let mockDispatchFn: jest.Mock;

    beforeEach(() => {
      mockDispatchFn = jest.fn();
    });

    it('should handle JSON file import', async () => {
      const testDataForJson = {
        colors: testColors,
        dateRange: testDateRange,
        title: 'Test Title',
        language: 'ja'
      };

      const jsonFile = {
        type: 'application/json',
        text: jest.fn().mockResolvedValue(JSON.stringify(testDataForJson))
      } as unknown as File;

      const thunkAction = handleImport(jsonFile);
      await thunkAction(mockDispatchFn, () => ({} as any), {});

      expect(mockDispatchFn).toHaveBeenCalled();
    });

    it('should handle ZIP file import', async () => {
      const zipFile = {
        type: 'application/zip',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
      } as unknown as File;

      const thunkAction = handleImport(zipFile);
      await thunkAction(mockDispatchFn, () => ({} as any), {});

      expect(mockDispatchFn).toHaveBeenCalled();
    });

    it('should handle error when file is not provided', async () => {
      const thunkAction = handleImport(null as any);
      const result = await thunkAction(mockDispatchFn, () => ({} as any), {});
      
      // createAsyncThunk wraps errors, so check the result structure
      expect(result.type).toBe('project/import/rejected');
      expect((result as any).error.message).toBe('File is not provided');
    });

    it('should handle malformed JSON gracefully', async () => {
      // Create a mock file object that behaves like a real File
      const malformedJsonFile = {
        type: 'application/json',
        text: jest.fn().mockResolvedValue('invalid json content')
      } as unknown as File;

      const thunkAction = handleImport(malformedJsonFile);
      const result = await thunkAction(mockDispatchFn, () => ({} as any), {});
      
      // Should handle JSON parse error gracefully
      expect(result.type).toBe('project/import/rejected');
    });

    it('should handle partial data import', async () => {
      const partialData = {
        title: 'Partial Project',
        colors: testColors
      };

      const jsonFile = {
        type: 'application/json',
        text: jest.fn().mockResolvedValue(JSON.stringify(partialData))
      } as unknown as File;

      const thunkAction = handleImport(jsonFile);
      await thunkAction(mockDispatchFn, () => ({} as any), {});

      expect(mockDispatchFn).toHaveBeenCalled();
    });
  });

  describe('business logic validation', () => {
    let mockDispatchFn: jest.Mock;

    beforeEach(() => {
      mockDispatchFn = jest.fn();
    });

    it('should handle export with all required fields', async () => {
      const result = await handleExport(
        'business-test',
        { 1: { alias: 'Blue', color: '#blue' } },
        { startDate: '2024-01-01', endDate: '2024-12-31' },
        [{ columnId: 'test', columnName: 'Test', width: 100, resizable: false, visible: true, reorderable: false }],
        {
          'task1': {
            id: 'task1',
            no: 1,
            rowType: 'Chart',
            displayName: 'Business Task',
            textColumn1: 'Text1',
            textColumn2: 'Text2',
            textColumn3: 'Text3',
            color: '#blue',
            plannedStartDate: '2024/01/01',
            plannedEndDate: '2024/01/10',
            plannedDays: 10,
            actualStartDate: '2024/01/01',
            actualEndDate: '2024/01/08',
            progress: '80',
            dependentId: '',
            dependency: '',
            isIncludeHolidays: true
          }
        },
        '2024/01/01 New Year\n2024/12/25 Christmas',
        { color: '#holiday', subColor: '#holiday80' },
        { 0: { color: '#ff0000', subColor: '#ff000080', days: [0, 6] } },
        800,
        2000,
        25,
        'Business Project 2024',
        true,
        'M/d/yyyy',
        [],
        { note1: 'Important note' },
        'en'
      );

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/zip');
    });

    it('should import data and dispatch all necessary actions', async () => {
      const completeData = {
        colors: { 1: { alias: 'Green', color: '#green' } },
        dateRange: { startDate: '2024-02-01', endDate: '2024-02-29' },
        columns: [{ columnId: 'name', columnName: 'Name', width: 200, resizable: true, visible: true, reorderable: false }],
        data: {
          'task2': {
            id: 'task2',
            no: 2,
            rowType: 'Event',
            displayName: 'Event Task',
            textColumn1: '',
            textColumn2: '',
            textColumn3: '',
            plannedStartDate: '2024/02/01',
            plannedEndDate: '2024/02/01',
            plannedDays: 1,
            actualStartDate: '',
            actualEndDate: '',
            progress: '',
            color: '#green',
            eventData: []
          }
        },
        holidayInput: '2024/02/14 Valentine',
        holidayColor: { color: '#pink', subColor: '#pink80' },
        regularDaysOffSetting: { 0: { color: '#weekend', subColor: '#weekend80', days: [0, 6] } },
        wbsWidth: 750,
        calendarWidth: 1500,
        cellWidth: 30,
        title: 'February Project',
        showYear: false,
        dateFormat: 'd/M/yyyy',
        treeData: [],
        noteData: {},
        language: 'fr'
      };

      const jsonFile = {
        type: 'application/json',
        text: jest.fn().mockResolvedValue(JSON.stringify(completeData))
      } as unknown as File;

      const thunkAction = handleImport(jsonFile);
      await thunkAction(mockDispatchFn, () => ({} as any), {});

      // Verify that multiple dispatch calls were made
      expect(mockDispatchFn).toHaveBeenCalled();
      expect(mockDispatchFn.mock.calls.length).toBeGreaterThan(5);
    });
  });

  describe('error scenarios', () => {
    let mockDispatchFn: jest.Mock;

    beforeEach(() => {
      mockDispatchFn = jest.fn();
    });

    it('should handle undefined optional parameters gracefully', async () => {
      // Test with minimal required parameters
      const result = await handleExport(
        'minimal-test',
        {},
        { startDate: '2024-01-01', endDate: '2024-01-01' },
        [],
        {},
        '',
        { color: '#ffffff', subColor: '#ffffff80' },
        {},
        0,
        0,
        0,
        '',
        false,
        'yyyy/M/d',
        [],
        {},
        'ja'
      );

      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle import with missing required fields', async () => {
      const minimalData = {
        title: 'Minimal'
      };

      const jsonFile = {
        type: 'application/json',
        text: jest.fn().mockResolvedValue(JSON.stringify(minimalData))
      } as unknown as File;

      const thunkAction = handleImport(jsonFile);
      
      // Should not throw error even with minimal data
      await expect(
        thunkAction(mockDispatchFn, () => mockStore.getState(), {})
      ).resolves.not.toThrow();
    });
  });
});