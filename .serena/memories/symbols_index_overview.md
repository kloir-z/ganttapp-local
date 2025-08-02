# Symbols Index Overview

## Symbol Statistics
- **Total Components**: 56 files
- **Custom Hooks**: 9 files  
- **Redux Files**: 12 files
- **Utility Functions**: 8 files

## Component Architecture Patterns

### Chart Components (9 files)
- `Calendar` - Date header display
- `ChartBar` - Core task bar with progress visualization
- `AutoWidthInputBox` - Inline editing input
- `GridVertical` - Vertical grid lines
- `ChartRowComponent` - Individual task bar rendering
- `EventRowComponent` - Milestone/event markers
- `SeparatorRowComponent` - Section headers
- `ProgressTag` - Progress percentage display

### Table Components (10 files)
- `WBSInfo` - Main WBS grid using ReactGrid
- `CustomDateCell`, `CustomTextCell`, `CustomNumberCell` - Custom cell types
- `gridHandlers` - ReactGrid change handlers
- `wbsHelpers` - WBS data manipulation utilities
- `wbsRowCreators` - Row creation functions
- `SeparatorRowLabel` - Section header labels

### Settings System (13 files)
Modular settings architecture:
- **Basic**: `SettingsModalBasics`, `DateRangeSetting`
- **Chart**: `SettingsModalChart`, `ColorSetting`, `CellWidthSetting`
- **DaysOff**: `SettingsModalDaysOff`, `HolidaySetting`, `RegularDaysOffSetting`
- **Table**: `SettingsModalTable`, `ColumnSetting`, `ColumnRow`

### Notes System (17 files)
Comprehensive rich text editor:
- `NotesModal` - Main container (90 lines, refactored)
- `QuillEditor` - Quill.js integration with custom keyboard bindings
- `NotesTree` - Tree view with CRUD operations
- `TreePaneResizer` - Resizable tree pane
- Custom hooks: `useNotesTree`, `useNotesModalPosition`
- Utilities: `notesValidation`, `notesDataMigration`

## Redux State Management

### Core Slices (12 files)
- `baseSettingsSlice` - UI settings, language, date ranges
- `colorSlice` - Task color management and schemes
- `notesSlice` - Rich text notes with tree structure
- `historySlice` - Undo/redo functionality
- `uiFlagSlice` - Modal and loading states
- `copiedRowsSlice` - Copy/paste operations
- `rowDialogSlice` - Row editing dialogs
- `subMenuSlice` - Context menu state

### Advanced Features
- **Undo/Redo System**: `historyThunks` with snapshot management
- **Type Safety**: Comprehensive TypeScript interfaces
- **State Persistence**: Local storage integration

## Custom Hooks System (9 files)

### Row Operations
- `useAddRow` - Add new rows to WBS
- `useInsertCopiedRow` - Copy/paste functionality
- `useContextMenuOptions` - Context menu generation

### UI Management
- `useKeyboardShortcuts` - Keyboard navigation
- `useWarnIfUnsavedChanges` - Unsaved changes warning
- `useResetReduxStates` - State reset and initialization

### Utilities
- `useLanguageChange` - i18n language switching
- `useJsonExport` - JSON export functionality

## Utility Layer (8 files)

### Core Business Logic
- `CommonUtils` - Date calculations, dependency resolution, holiday handling
- `ExportImportHandler` - ZIP/JSON import/export operations
- `CompressionUtils` - Data compression for efficiency
- `HistoryUtils` - Snapshot creation and restoration

### Helper Systems
- `WelcomeUtils` - Sample project management
- `StateBackupUtils` - State backup/restore operations

## TypeScript Integration

### Data Types (`DataTypes.ts`)
- `WBSData` - Union type: `ChartRow | SeparatorRow | EventRow`
- `ChartRow` - Task rows with dates, dependencies, progress
- `SeparatorRow` - Section headers with hierarchy levels
- `EventRow` - Milestone rows with event data

### Type Guards
- `isChartRow`, `isEventRow`, `isSeparatorRow` - Runtime type checking
- Custom cell interfaces for ReactGrid integration
- Comprehensive Redux state typing

This indexed overview provides a complete map of the codebase's symbolic structure for efficient navigation and development.