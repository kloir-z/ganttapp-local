/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { handleExport, handleImport, buildProjectData, EXPORT_SCHEMA_VERSION } from './ExportImportHandler';
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
    // esModuleInterop is enabled for ts-jest, so the default import is unwrapped
    // via __importDefault; mark this mock as an ES module so `default` is used.
    __esModule: true,
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
      const result = await handleExport({
        fileId: testFileId,
        colors: testColors,
        dateRange: testDateRange,
        columns: testColumns,
        data: testData,
        holidayInput: '2024/01/01 New Year',
        holidayColor: { color: '#ff0000', subColor: '#ff000080' },
        regularDaysOffSetting: { 0: { color: '#ff0000', subColor: '#ff000080', days: [0, 6] } },
        wbsWidth: 690,
        calendarWidth: 1000,
        cellWidth: 21,
        title: 'Test Project',
        showYear: true,
        dateFormat: 'yyyy/M/d',
        treeData: [],
        noteData: {},
        language: 'ja',
        scrollPosition: { scrollLeft: 0, scrollTop: 0 },
      });

      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle export with optional parameters', async () => {
      const notesModalState: NotesModalState = {
        treeWidth: 200,
        noteWidth: 400,
        noteHeight: 300,
        position: { x: 100, y: 100 }
      };

      const result = await handleExport({
        fileId: testFileId,
        colors: testColors,
        dateRange: testDateRange,
        columns: testColumns,
        data: testData,
        holidayInput: '2024/01/01 New Year',
        holidayColor: { color: '#ff0000', subColor: '#ff000080' },
        regularDaysOffSetting: { 0: { color: '#ff0000', subColor: '#ff000080', days: [0, 6] } },
        wbsWidth: 690,
        calendarWidth: 1000,
        cellWidth: 21,
        title: 'Test Project',
        showYear: true,
        dateFormat: 'yyyy/M/d',
        treeData: [],
        noteData: {},
        language: 'ja',
        scrollPosition: { scrollLeft: 0, scrollTop: 0 },
        notesModalState,
      });

      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('buildProjectData', () => {
    it('should stamp the current schema version', () => {
      const projectData = buildProjectData({
        fileId: testFileId,
        colors: testColors,
        dateRange: testDateRange,
        columns: testColumns,
        data: testData,
        holidayInput: '',
        holidayColor: { color: '#ff0000', subColor: '#ff000080' },
        regularDaysOffSetting: {},
        wbsWidth: 690,
        calendarWidth: 1000,
        cellWidth: 21,
        title: 'Test Project',
        showYear: true,
        dateFormat: 'yyyy/M/d',
        treeData: [],
        noteData: {},
        language: 'ja',
        scrollPosition: { scrollLeft: 0, scrollTop: 0 },
      });

      expect(projectData.version).toBe(EXPORT_SCHEMA_VERSION);
    });

    it('should pass through core fields and omit absent optional fields', () => {
      const projectData = buildProjectData({
        fileId: testFileId,
        colors: testColors,
        dateRange: testDateRange,
        columns: testColumns,
        data: testData,
        holidayInput: '',
        holidayColor: { color: '#ff0000', subColor: '#ff000080' },
        regularDaysOffSetting: {},
        wbsWidth: 690,
        calendarWidth: 1000,
        cellWidth: 21,
        title: 'Test Project',
        showYear: true,
        dateFormat: 'yyyy/M/d',
        treeData: [],
        noteData: {},
        language: 'ja',
        scrollPosition: { scrollLeft: 0, scrollTop: 0 },
      });

      expect(projectData.title).toBe('Test Project');
      expect(projectData.colors).toEqual(testColors);
      expect('notesModalState' in projectData).toBe(false);
      expect('historySnapshots' in projectData).toBe(false);
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

      const thunkAction = handleImport({ file: jsonFile });
      await thunkAction(mockDispatchFn, () => ({} as any), {});

      expect(mockDispatchFn).toHaveBeenCalled();
    });

    it('should handle ZIP file import', async () => {
      const zipFile = {
        type: 'application/zip',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
      } as unknown as File;

      const thunkAction = handleImport({ file: zipFile });
      await thunkAction(mockDispatchFn, () => ({} as any), {});

      expect(mockDispatchFn).toHaveBeenCalled();
    });

    it('should handle error when file is not provided', async () => {
      const thunkAction = handleImport({ file: null as any });
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

      const thunkAction = handleImport({ file: malformedJsonFile });
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

      const thunkAction = handleImport({ file: jsonFile });
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
      const result = await handleExport({
        fileId: 'business-test',
        colors: { 1: { alias: 'Blue', color: '#blue' } },
        dateRange: { startDate: '2024-01-01', endDate: '2024-12-31' },
        columns: [{ columnId: 'test', columnName: 'Test', width: 100, resizable: false, visible: true, reorderable: false }],
        data: {
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
        holidayInput: '2024/01/01 New Year\n2024/12/25 Christmas',
        holidayColor: { color: '#holiday', subColor: '#holiday80' },
        regularDaysOffSetting: { 0: { color: '#ff0000', subColor: '#ff000080', days: [0, 6] } },
        wbsWidth: 800,
        calendarWidth: 2000,
        cellWidth: 25,
        title: 'Business Project 2024',
        showYear: true,
        dateFormat: 'M/d/yyyy',
        treeData: [],
        noteData: { note1: 'Important note' },
        language: 'en',
        scrollPosition: { scrollLeft: 0, scrollTop: 0 },
      });

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

      const thunkAction = handleImport({ file: jsonFile });
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
      const result = await handleExport({
        fileId: 'minimal-test',
        colors: {},
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-01' },
        columns: [],
        data: {},
        holidayInput: '',
        holidayColor: { color: '#ffffff', subColor: '#ffffff80' },
        regularDaysOffSetting: {},
        wbsWidth: 0,
        calendarWidth: 0,
        cellWidth: 0,
        title: '',
        showYear: false,
        dateFormat: 'yyyy/M/d',
        treeData: [],
        noteData: {},
        language: 'ja',
        scrollPosition: { scrollLeft: 0, scrollTop: 0 },
      });

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

      const thunkAction = handleImport({ file: jsonFile });
      
      // Should not throw error even with minimal data
      await expect(
        thunkAction(mockDispatchFn, () => mockStore.getState(), {})
      ).resolves.not.toThrow();
    });
  });
});