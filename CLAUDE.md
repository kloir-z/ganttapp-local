# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (Vite, runs on http://localhost:5173)
- `npm run build` - Build for production (TypeScript compile + Vite build)
- `npm run build:singlefile` - Build a self-contained single HTML file to `dist-single/index.html` (all JS/CSS/holiday data inlined; opens via `file://`. Uses HashRouter and `base: './'`. Samples are unavailable under `file://`.)
- `npm run lint` - Run ESLint with TypeScript rules
- `npm run test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run preview` - Preview production build locally

## Development Environment Notes
- **Windows Compatibility**: Commands may show bash path errors but function correctly
- **Port Monitoring**: Use `netstat -an | findstr :5173` to verify dev server status
- **Git Operations**: Standard git workflow supported with proper commit message formatting

## Architecture Overview

This is an offline-first Gantt chart application built with React 18, TypeScript, and Redux Toolkit. The application manages project timelines with tasks, dependencies, and rich note-taking capabilities.

### Core State Management (Redux)
- **Main Store**: `src/reduxStoreAndSlices/store.ts` - Central Redux store configuration with undo/redo functionality
- **State Slices** (`src/reduxStoreAndSlices/`):
  - **baseSettingsSlice.ts**: UI settings (widths, heights, language, date ranges)
  - **colorSlice.ts**: Task color management and color schemes. The coloring **basis column** (`basisColumnId`: `color` or `textColumn1`〜`textColumn7`) decides which column's value is matched against the palette aliases; each basis column keeps its own palette in `schemes` (the active palette is mirrored into `schemes[basisColumnId]` on every mutation, so the legacy `colors`/`fallbackColor` fields stay valid for all existing consumers). Switching basis (`switchColorBasis`) auto-assigns colors to the column's unique values (golden-angle rgba via `generateAutoColor`; empty alias slots are reused first, capped at 30 auto entries); the actual-bar color (id 999) is shared across all schemes. Palette entries are dynamic (`addColorInfo`/`removeColorInfo`). Pure helpers `getColorSourceValue`/`resolveColorFromPalette`/`collectBasisValues` are shared by the chart components and the Excel export. The basis is switchable from three places (all via the `useColorBasis` hook): the top-bar "Coloring" menu, right-click > "Color Basis", and the selector in Chart Setting
  - **copiedRowsSlice.ts**: Copy/paste functionality for rows
  - **notesSlice.ts**: Rich text notes storage and management
  - **rowDialogSlice.ts**: Row editing dialog state
  - **subMenuSlice.ts**: Context submenu state management
  - **uiFlagSlice.ts**: UI flags (modals, loading states, menus)
- **Initial Data**: 
  - **initialColumns.ts**: Default WBS table column definitions. Free-text columns are `textColumn1`〜`textColumn7` (`TEXT_COLUMN_IDS`); Text4〜7 are hidden by default and injected into older projects on import by `ensureExtendedTextColumns` (same pattern as `ensureWbsNumberColumn`/`ensureCpPredecessorsColumn`)
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
- **CpHelp.tsx**: Inline "?" help panel shown while a CP column cell is selected
- **Custom Cell Types** (`src/components/Table/utils/`):
  - **CustomDateCell.tsx**: Date picker cells
  - **CustomTextCell.tsx**: Text input cells
  - **CustomNumberCell.tsx**: Number input cells
  - **SeparatorCell.tsx**: Section header cells
  - **CustomDatePicker.tsx**: Date selection component
- **Grid Utilities** (`src/components/Table/utils/`):
  - **gridHandlers.ts**: ReactGrid change handlers. Planned start/end changes arriving together (Excel-like range paste) are merged into one `setPlannedDate` per row — dispatching them separately would revert the first date with stale data — and are applied *after* `setEntireData` so a mixed paste (dates + other columns) doesn't clobber them; `pushPastState` is skipped when `setEntireData` already pushed the undo snapshot (unit-tested in `gridHandlers.test.ts`)
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
  - **NotesModal.tsx**: Main notes modal container (90 lines, refactored)
  - **QuillEditor.tsx**: Rich text editor with Quill.js integration
  - **TreePaneResizer.tsx**: Tree pane width adjustment
  - **ModalResizer.tsx**: Modal boundary resize handling
  - **NotesStyles.ts**: Styled-components for notes UI
  - **NoteUtils.ts**: Date formatting and tree traversal utilities
  - **quill.css**: Custom Quill editor styling
  - **Components** (`src/components/Topbar/Notes/components/`):
    - **NotesModalWrapper.tsx**: Modal wrapper with drag functionality
    - **NotesTree.tsx**: Tree view with CRUD operations
    - **NotesEditor.tsx**: Editor container with toolbar management
    - **NotesTitle.tsx**: Note title input with auto-save
    - **DeleteConfirmDialog.tsx**: Confirmation dialog for deletion
  - **Custom Hooks** (`src/components/Topbar/Notes/hooks/`):
    - **useNotesTree.ts**: Tree operations and state management
    - **useNotesModalPosition.ts**: Modal dragging and positioning
  - **Utilities** (`src/components/Topbar/Notes/utils/`):
    - **notesValidation.ts**: Modal state validation and sanitization
    - **notesDataMigration.ts**: Legacy data migration for existing projects

#### Context Menu System (`src/components/ContextMenu/`)
- **ContextMenu.tsx**: Right-click context menu
- **CustomRowCountDialogContainer.tsx**: Row insertion dialog

#### Welcome & Onboarding (`src/components/Welcome/`)
- **WelcomeModal.tsx**: First-time user welcome modal with samples; its "How to use" button opens the Help modal
- **sampleDefinitions.ts**: Language-specific sample list (filenames under `public/samples/`); the tutorial samples are generated by `npm run generate-tutorial-sample` (`scripts/gen-tutorial-sample.mjs`, deterministic output — both languages built from one bilingual definition)
- **WelcomeModalStyles.tsx**: Welcome modal styling

#### Help System (`src/components/Help/`)
- **HelpModal.tsx**: Topic-based how-to guide (`activeModal === 'help'`; opened from the top-bar Help button or the Welcome modal). Two-pane MUI Dialog: topic nav list + content
- **helpTopics.ts**: Data-driven topic definitions (`HelpBlock[]` per topic). The dependencies/criticalPath topics reuse the existing flat i18n keys (`after_description`, `cp_basic_format`, …) shared with CpHelp
- **HelpTopicContent.tsx**: Renders `HelpBlock[]` to MUI elements
- Help body translations live in `src/i18n/helpResources.ts`, nested into `config.ts` resources as `help` (referenced as `t('help.topics.<id>.<key>')`); `helpTopics.test.ts` asserts every referenced key resolves in both en and ja

#### Utility Components
- **WbsWidthResizer.tsx**: WBS table width adjustment handle
- **MessageInfo.tsx**: Error/info message display
- **MenuItem.tsx**: Menu item component

### Dependency System
- Dependencies are managed through string format: `"after,distance,offsetDays"` or `"sameas,distance,offsetDays"`
- Distance represents row separation in chart rows
- Dependency resolution happens in `CommonUtils.ts` with holiday/weekend awareness

### File Operations
- Projects saved as ZIP files containing `project.json` and `notes.json`
- Import/export handled in `src/utils/ExportImportHandler.ts`
- Supports both ZIP and JSON formats
- **Schema version 2**: adds `colorSchemes` (per-basis-column palettes) and `colorBasisColumn` next to the legacy `colors` field (which still carries the active palette so older app versions degrade gracefully). Import restores `colorSchemes` via `setEntireColorState` when present, else falls back to the v1 single-palette path (`updateEntireColorSettings`, basis reset to the Color column). History snapshots and the history backup/restore path (`HistoryUtils`/`StateBackupUtils`/`historyThunks`) carry the same two fields
- **Legacy Data Migration**: Automatic migration of notes data where `treeData` is empty but `noteData` exists
- **File menu layout** (`TopBarLocal.tsx`): save/open actions (New, Open File, Download, Download As, JSON Data) stay flat; the three output formats are grouped under a single **Export ▸** submenu (PDF / Excel / HTML). Submenu paths use dot notation (`5.0`, `5.1`, `5.2`) because `subMenuSlice.setOpenSubMenu` derives the open-ancestor chain by splitting the path on `.` — hyphenated paths would collapse the parent on hover. **Export ▸ Excel** first opens a small dialog with an "Include notes sheet" checkbox when the project has any notes (tree notes or non-empty row notes); with no notes it exports directly. The top bar also has a **Coloring** menu (between Setting and Notes) for one-click switching of the color-basis column; its labels are the user-renamed column names.
- **Standalone HTML export** (`src/utils/HtmlSnapshotExport.ts`): "File → Export ▸ HTML" clones the live DOM, inlines external assets, keeps the build-time CSP meta (the policy allows inline scripts but no external hosts, so the exported file inherits the same no-network guarantee), and injects the current `ProjectData` as a `<script type="application/json">`. On startup `LocalApp` calls `readEmbeddedProjectData()` and, if present, feeds it through `handleImport` and suppresses the welcome modal — so opening the exported file shows the finished chart. Produces a fully `file://`-openable file when run from the single-file build.
- **PDF export** (`src/hooks/useGanttPdfExport.ts`): "File → Export ▸ PDF" rasterizes the full chart via `html2canvas` + `jsPDF` (full-render mode bypasses virtualization so every row/date is captured).
- **Excel export** (`src/utils/GanttExcelExport.ts` + `src/hooks/useGanttExcelExport.ts`): "File → Export ▸ Excel" rebuilds the on-screen view as a styled `.xlsx` using `exceljs` — left WBS table (visible columns; the on-screen `No` column is dropped since Excel supplies its own row numbers, while an always-on `WBS` column carrying the mechanical hierarchical number `1` / `1-1` / `1-1-1` is emitted up front even when hidden on screen — the display-name cell is indented via Excel's native cell indent to its WBS depth, level 1 flush left) followed by a one-column-per-day grid. Color-column cells are painted with each row's planned-bar color, but wholly-empty placeholder rows (blank WBS number) are left uncolored, and table cells use font size 9 to match the chart-side bar/separator labels. Bar colors are resolved from the **color-basis column** (`params.colorBasisColumn`, default `color`): the basis column's value — Color column or a text column — is matched against the palette aliases exactly like the live chart. Planned/actual bars, weekend/holiday shading, separator bands (`#ddedff`), faint per-day vertical grid lines and the darker month-start line are reproduced by alpha-compositing each layer to an opaque fill (the live chart stacks a translucent actual bar over the planned bar, so per-cell colors are composited white → day-off → planned → actual). Palette colors saved by the in-app picker as `rgba(...)` are parsed alongside hex. Narrow chart widths (`cellWidth <= 8`) switch the date header to week-of-month numbers, mirroring `Calendar.tsx`. Excel's default gridlines are hidden (`showGridLines: false`) in favor of explicit lines: a faint per-day vertical hairline is drawn only on cells *not* covered by a bar/separator band (an opaque border would slice the bar) and lightens as the chart narrows — every day when wide, lighter at medium widths, Sundays-only when very narrow — mirroring `GridVertical.tsx`. After serialization the sheet XML is post-patched (via the bundled `jszip`) with an `<ignoredErrors>` block (`numberStoredAsText`, `twoDigitTextYear`) to suppress Excel's green-triangle warnings on the intentionally text-typed numeric/date cells — exceljs 4.x has no API for this (the `sqref` is read from each sheet's own `<dimension>` so it covers exactly that sheet). Chart bars carry labels: chart rows get their `displayName`, and each **planned** event bar gets its per-event `eachDisplayName` written into the bar's first cell (mirroring `ChartBar` — actual event bars never show a label; two planned events sharing a start cell have their names joined with `/` rather than one being dropped). Event rows paint **only** their `eventData` bars — the row's own `plannedStartDate`/`plannedEndDate`/actual fields are never drawn as bars nor folded into the date-range crop, matching `EventRowComponent`. When notes are present (and the user keeps "Include notes sheet" checked in the export dialog) a second **"Notes" worksheet** is appended (`params.notes`, wired from the `notes` slice): the hierarchical notepad tree (title indented by depth + last-updated) followed by a **"Row Notes"** section listing per-task notes (`rowNoteData`) labeled with the row's WBS number + name. Note bodies are converted to plain text by the pure, DOM-free `noteContentToPlainText`, which mirrors QuillEditor's own load path: bodies are stored as JSON-stringified Quill **Delta** (`{"ops":[...]}` — decoded with list markers `•`/`☑`/`☐`, indent → 2 spaces/level, divider embed → `──────────`), with `htmlToPlainText` (block/`<br>` tags → newlines, `<li>` → bullets, entities decoded) as the fallback for legacy/sample HTML content. Sheet names are run through `sanitizeSheetName` (strips Excel-forbidden `: \ / ? * [ ]` **and their full-width CJK variants `：＼／？＊［］`** — Excel normalizes the full-width forms to the ASCII ones and flags the file for repair, so a Japanese title's full-width colon must be stripped — plus a leading/trailing apostrophe; caps at 31, case-insensitive dedup) and note cell text is clamped to Excel's 32,767-char limit.

### Testing
- Jest + React Testing Library setup
- TDD methodology with comprehensive test coverage
- Test files use `.test.ts` suffix
- Setup in `setupTests.ts` and `jest.config.js`

### Notes System Architecture
The notes system follows a component-based architecture with clear separation of concerns:

#### **Component Hierarchy**
```
NotesModal (90 lines)
├── NotesModalWrapper (drag & positioning)
├── NotesTree (tree operations)
│   └── DeleteConfirmDialog
├── TreePaneResizer
└── NotesEditor
    ├── NotesTitle
    └── QuillEditor
```

#### **State Management Pattern**
- **Redux Integration**: All state managed through `notesSlice.ts`
- **Custom Hooks**: Business logic encapsulated in reusable hooks
- **Component Isolation**: Each component manages only its specific concerns

#### **Row Notes (per-task notes)**
- **RowNoteButton** (`src/components/Chart/RowNoteButton.tsx`): per-row sticky-note popovers (session-only window manager in `src/utils/rowNoteWindowManager.ts`). The **Esc key closes the topmost (active) note window** (repeated presses close front-to-back; captured on `document` so it works while the Quill editor has focus). Each note icon carries `data-row-note-anchor="<rowId>"` — this is the chart-side anchor for connector arrows
- **RowNoteConnector** (`src/components/Topbar/Notes/components/RowNoteConnector.tsx`): when a row note is selected in the Notes modal ("Task Notes" list → `selectedRowNoteId`), draws an arrow from the task's chart position (the `data-row-note-anchor` element) to the modal (`#notes-modal`), matching RowNoteButton's own bar→window connector (dot at the bar, arrowhead at the note). Hidden when the anchor is off-screen (virtualized away) or covered by the modal rect

#### **Data Migration System**
- **Backward Compatibility**: Automatic migration of legacy note data
- **Smart Title Generation**: Extracts meaningful titles from note content
- **Error Handling**: Graceful fallbacks for corrupted data

#### **Styling Architecture**
- **Styled Components**: Consistent theming with `NotesStyles.ts`
- **Custom CSS**: Quill editor customization in `quill.css`
- **Responsive Design**: Adaptive layouts for different screen sizes

### Internationalization
- i18next configuration in `src/i18n/config.ts`
- Supports English and Japanese
- Holiday data source files live in `public/i18n/holidays/` and are bundled at build time via `import.meta.glob` in `CommonUtils.ts` (not fetched at runtime), so holidays work even when opened via `file://`

### Utility Systems

#### Core Utilities (`src/utils/`)
- **CommonUtils.ts**: Core business logic for date calculations, dependency resolution, holiday handling, and row operations
- **ExportImportHandler.ts**: File import/export operations for ZIP and JSON formats
- **HtmlSnapshotExport.ts**: Standalone single-file HTML export
- **GanttExcelExport.ts**: Styled `.xlsx` export reproducing the chart (`buildGanttWorkbook` builds the workbook — Gantt sheet plus an optional "Notes" sheet from `params.notes`; `buildGanttXlsxBuffer` serializes it and injects per-sheet `<ignoredErrors>`). Also exports the pure `noteContentToPlainText` (Quill Delta JSON or legacy HTML → spreadsheet text) and `htmlToPlainText`. Pure/DOM-free, unit-tested in `GanttExcelExport.test.ts`.
- **WelcomeUtils.ts**: Sample project management and first-time user experience

#### Custom Hooks (`src/hooks/`)
- **useAddRow.ts**: Hook for adding new rows to the WBS
- **useContextMenuOptions.ts**: Context menu option generation and handling (includes the Excel-style "Hide Column(s)" action that hides the selected columns via the `hideColumns` reducer)
- **useGanttPdfExport.ts**: Full-chart PDF export (html2canvas + jsPDF)
- **useColorBasis.ts**: Shared hook for the color-basis feature — exposes the basis candidates (Color column + text columns, labeled with user-renamed column names), `switchTo(columnId)` (collects the column's unique values and dispatches `switchColorBasis`) and `autoAssign(targetRowIds?)` (re-runs auto-assignment on the active basis; also backs the right-click "Auto color setting" items)
- **useGanttExcelExport.ts**: Excel export — gathers Redux state (including the `notes` slice's `treeData`/`noteData`/`rowNoteData` for the Notes sheet and `color.basisColumnId`) and downloads the workbook from `GanttExcelExport.ts`. `exportExcel({ includeNotes })` omits the Notes sheet when `includeNotes` is false (driven by the export dialog in `TopBarLocal`)
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
- **Content-Security-Policy**: injected at build time by the `inject-csp-meta` plugin in `vite.config.ts` (not present in dev because HMR needs inline scripts/WebSockets). The policy contains no external hosts — its purpose is a verifiable "data cannot leave the browser" guarantee, not XSS hardening (production is the single-file build, so `script-src` must allow `'unsafe-inline'`). `scripts/verify-csp.mjs` / `verify-csp-export.mjs` / `verify-exported-html.mjs` boot the built file headlessly (puppeteer) and assert zero CSP violations including all three exports.
- MAX_ROWS limit of 999 tasks per project
- Undo/redo system maintains 30 states maximum
- Holiday and weekend calculations affect dependency resolution
- All data stored locally - no cloud dependencies
- **Notes System**: Supports unlimited hierarchical notes with rich text editing
- **Performance**: Optimized component rendering with React.memo and useCallback
- **Data Integrity**: Automatic validation and migration for project data