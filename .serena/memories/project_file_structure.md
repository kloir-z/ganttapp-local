# Project File Structure Overview

## Total Files: 117+ TypeScript files

### Key Directories
- **src/components/** (56 files) - React components organized by feature
- **src/reduxStoreAndSlices/** (12 files) - Redux Toolkit state management
- **src/hooks/** (9 files) - Custom React hooks
- **src/utils/** (8 files) - Business logic utilities
- **public/samples/** - Sample Gantt projects in English & Japanese
- **public/i18n/holidays/** - Holiday calendars (CA, CN, DE, FR, JP, KR, US)

### Notable Component Categories
- **Chart components** (9 files): Calendar, ChartBar, AutoWidthInputBox, GridVertical, etc.
- **Table components** (10 files): WBSInfo, CustomDateCell, gridHandlers, wbsHelpers, etc.
- **Settings system** (13 files): Modular settings for Basic, Chart, DaysOff, Table
- **Notes system** (17 files): Comprehensive rich text editor with Quill.js, tree structure, drag/drop
- **Topbar & Navigation** (7 files): TopBarLocal, TopMenu, JsonDataModal, TitleSetting

### State Management
- 12 Redux slices covering: baseSettings, colors, notes, history, UI flags, copied rows
- Comprehensive undo/redo system with historySlice and historyThunks
- Initial data configurations for columns, holidays, and sample data

### Utility Systems
- Export/Import handler for ZIP and JSON formats
- Compression utilities for project data
- Common utilities for date calculations, dependency resolution, holiday handling
- Welcome system with sample project management

### Testing & Configuration
- Jest + React Testing Library setup
- Comprehensive TypeScript configuration
- Vite bundler with optimized build process
- i18next for English/Japanese internationalization

The codebase demonstrates excellent organization with clear separation of concerns and modern React/TypeScript patterns.