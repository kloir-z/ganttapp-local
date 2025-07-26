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
- **Main Store**: `src/reduxStoreAndSlices/store.ts` - Central Redux store configuration
- **WBS Data Slice**: Primary data slice managing project tasks, dependencies, holidays, and undo/redo functionality
- **Additional Slices**: `copiedRowsSlice`, `colorSlice`, `baseSettingsSlice`, `uiFlagSlice`, `subMenuSlice`, `notesSlice`, `rowDialogSlice`

### Data Types (`src/types/DataTypes.ts`)
- **WBSData**: Union type of `ChartRow | SeparatorRow | EventRow`
- **ChartRow**: Main task rows with start/end dates, dependencies, progress
- **SeparatorRow**: Section headers with collapse/expand and hierarchy levels (0-4)
- **EventRow**: Milestone rows with multiple event data points

### Key Components Structure
- **Gantt** (`src/components/Gantt/`): Main Gantt chart visualization
- **Table** (`src/components/Table/`): WBS table with custom cell types and dependency management
- **Topbar** (`src/components/Topbar/`): File operations, notes modal, settings
- **Setting** (`src/components/Setting/`): Configuration modals for dates, colors, columns, holidays

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

### Key Utilities
- **CommonUtils.ts**: Core business logic for date calculations, dependencies, holidays
- **WelcomeUtils.ts**: Sample project management
- **ExportImportHandler.ts**: File import/export operations

## Important Notes
- MAX_ROWS limit of 999 tasks per project
- Undo/redo system maintains 30 states maximum
- Holiday and weekend calculations affect dependency resolution
- All data stored locally - no cloud dependencies