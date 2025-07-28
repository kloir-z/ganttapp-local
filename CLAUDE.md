# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (Vite, runs on http://localhost:5173)
- `npm run build` - Build for production (TypeScript compile + Vite build)
- `npm run lint` - Run ESLint with TypeScript rules
- `npm run test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run preview` - Preview production build locally

## Architecture Overview

This is an offline-first Gantt chart application built with React 18, TypeScript, and Redux Toolkit. The application manages project timelines with tasks, dependencies, and rich note-taking capabilities.

### Core State Management (Redux)
- **Main Store**: `src/reduxStoreAndSlices/store.ts` - Central Redux store configuration with undo/redo functionality
- **State Slices** (`src/reduxStoreAndSlices/`):
  - **baseSettingsSlice.ts**: UI settings (widths, heights, language, date ranges)
  - **colorSlice.ts**: Task color management and color schemes
  - **copiedRowsSlice.ts**: Copy/paste functionality for rows
  - **notesSlice.ts**: Rich text notes storage and management
  - **rowDialogSlice.ts**: Row editing dialog state
  - **subMenuSlice.ts**: Context submenu state management
  - **uiFlagSlice.ts**: UI flags (modals, loading states, menus)
- **Initial Data**: 
  - **initialColumns.ts**: Default WBS table column definitions
  - **initialData.ts**: Sample project data structure
  - **initialHolidays.ts**: Default holiday configurations

### Data Types (`src/types/DataTypes.ts`)
- **WBSData**: Union type of `ChartRow | SeparatorRow | EventRow`
- **ChartRow**: Main task rows with start/end dates, dependencies, progress
- **SeparatorRow**: Section headers with collapse/expand and hierarchy levels (0-4)
- **EventRow**: Milestone rows with multiple event data points

### Component Architecture

#### Main Application Components
- **LocalApp** (`src/components/LocalApp/LocalApp.tsx`): Root application component handling initialization, language setup, and loading states
- **LocalComponents** (`src/components/Authenticated/LocalComponents.tsx`): Main authenticated wrapper component

#### Core UI Components
- **Gantt** (`src/components/Gantt/Gantt.tsx`): Main Gantt chart container with scroll handling, drag operations, and chart orchestration
- **WBSInfo** (`src/components/Table/WBSInfo.tsx`): Work Breakdown Structure table using ReactGrid for task management
- **TopBarLocal** (`src/components/Topbar/TopBarLocal.tsx`): Main navigation bar with file operations and settings access

#### Chart Visualization Components (`src/components/Chart/`)
- **Calendar.tsx**: Date header display for the Gantt chart
- **ChartRowComponent.tsx**: Individual task bar rendering with dependencies
- **EventRowComponent.tsx**: Milestone/event marker rendering
- **SeparatorRowComponent.tsx**: Section header bars in the chart
- **ChartBar.tsx**: Core task bar component with progress visualization
- **GridVertical.tsx**: Vertical grid lines for date alignment
- **ProgressTag.tsx**: Progress percentage display
- **AutoWidthInputBox.tsx**: Inline editing input for chart elements

#### Table Components (`src/components/Table/`)
- **WBSInfo.tsx**: Main WBS grid component using ReactGrid
- **SeparatorRowLabel.tsx**: Section header labels with collapse/expand
- **DependencyHelp.tsx**: Help modal for dependency syntax
- **Custom Cell Types** (`src/components/Table/utils/`):
  - **CustomDateCell.tsx**: Date picker cells
  - **CustomTextCell.tsx**: Text input cells
  - **CustomNumberCell.tsx**: Number input cells
  - **SeparatorCell.tsx**: Section header cells
  - **CustomDatePicker.tsx**: Date selection component
- **Grid Utilities** (`src/components/Table/utils/`):
  - **gridHandlers.ts**: ReactGrid change handlers
  - **wbsHelpers.ts**: WBS data manipulation utilities
  - **wbsRowCreators.ts**: Row creation functions

#### Settings System (`src/components/Setting/`)
- **SettingsModalDiv.tsx**: Main settings modal container
- **SettingChildDiv.tsx**: Individual setting section wrapper
- **Basic Settings** (`src/components/Setting/Basic/`):
  - **SettingsModalBasics.tsx**: Basic project settings modal
  - **DateRangeSetting.tsx**: Project date range configuration
- **Chart Settings** (`src/components/Setting/Chart/`):
  - **SettingsModalChart.tsx**: Chart appearance settings modal
  - **ColorSetting.tsx**: Task color scheme configuration
  - **ColorInfoItem.tsx**: Individual color setting item
  - **CellWidthSetting.tsx**: Chart cell width adjustment
- **Table Settings** (`src/components/Setting/Table/`):
  - **SettingsModalTable.tsx**: Table column settings modal
  - **ColumnSetting.tsx**: Column visibility and configuration
  - **ColumnRow.tsx**: Individual column setting row
- **Days Off Settings** (`src/components/Setting/DaysOff/`):
  - **SettingsModalDaysOff.tsx**: Holiday and weekend settings modal
  - **HolidaySetting.tsx**: Holiday configuration
  - **RegularDaysOffSetting.tsx**: Weekend/regular days off settings
- **Setting Utilities** (`src/components/Setting/utils/`):
  - **settingHelpers.ts**: Common setting operations

#### Top Bar Components (`src/components/Topbar/`)
- **TopBarLocal.tsx**: Main navigation bar
- **TopMenu.tsx**: Dropdown menu system
- **TitleSetting.tsx**: Project title editing
- **JsonDataModal.tsx**: Raw JSON data view/edit modal
- **Notes System** (`src/components/Topbar/Notes/`):
  - **NotesModal.tsx**: Rich text notes modal
  - **QuillEditor.tsx**: Rich text editor component
  - **NoteResizer.tsx**: Note pane resizing
  - **ModalResizer.tsx**: Modal resizing functionality
  - **TreePaneResizer.tsx**: Tree pane resize handler
  - **NotesStyles.ts**: Notes styling definitions
  - **NoteUtils.ts**: Notes utility functions

#### Context Menu System (`src/components/ContextMenu/`)
- **ContextMenu.tsx**: Right-click context menu
- **CustomRowCountDialogContainer.tsx**: Row insertion dialog

#### Welcome & Onboarding (`src/components/Welcome/`)
- **WelcomeModal.tsx**: First-time user welcome modal with samples
- **WelcomeModalStyles.tsx**: Welcome modal styling

#### Utility Components
- **WbsWidthResizer.tsx**: WBS table width adjustment handle
- **MessageInfo.tsx**: Error/info message display
- **MenuItem.tsx**: Menu item component
- **Tour/**: User onboarding tour components (directory exists)

### Dependency System
- Dependencies are managed through string format: `"after,distance,offsetDays"` or `"sameas,distance,offsetDays"`
- Distance represents row separation in chart rows
- Dependency resolution happens in `CommonUtils.ts` with holiday/weekend awareness

### File Operations
- Projects saved as ZIP files containing `project.json` and `notes.json`
- Import/export handled in `src/utils/ExportImportHandler.ts`
- Supports both ZIP and JSON formats

### Testing
- Jest + React Testing Library setup
- TDD methodology with comprehensive test coverage
- Test files use `.test.ts` suffix
- Setup in `setupTests.ts` and `jest.config.js`

### Internationalization
- i18next configuration in `src/i18n/config.ts`
- Supports English and Japanese
- Holiday data in `public/i18n/holidays/` directory

### Utility Systems

#### Core Utilities (`src/utils/`)
- **CommonUtils.ts**: Core business logic for date calculations, dependency resolution, holiday handling, and row operations
- **ExportImportHandler.ts**: File import/export operations for ZIP and JSON formats
- **WelcomeUtils.ts**: Sample project management and first-time user experience

#### Custom Hooks (`src/hooks/`)
- **useAddRow.ts**: Hook for adding new rows to the WBS
- **useContextMenuOptions.ts**: Context menu option generation and handling
- **useInsertCopiedRow.ts**: Copy/paste row insertion logic
- **useLanguageChange.ts**: Language switching functionality
- **useResetIsSavedChangesFlags.ts**: Unsaved changes flag management
- **useResetReduxStates.ts**: Redux state reset and initialization
- **useWarnIfUnsavedChanges.ts**: Unsaved changes warning system

#### Styling (`src/styles/`)
- **GanttStyles.ts**: Styled-components definitions for Gantt chart elements

#### Internationalization (`src/i18n/`)
- **config.ts**: i18next configuration for English/Japanese support
- **public/i18n/holidays/**: Holiday data files by region

## Important Notes
- MAX_ROWS limit of 999 tasks per project
- Undo/redo system maintains 30 states maximum
- Holiday and weekend calculations affect dependency resolution
- All data stored locally - no cloud dependencies