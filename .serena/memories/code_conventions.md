# Code Style and Conventions

## File Naming Conventions
- **Components**: PascalCase (e.g., `NotesModal.tsx`, `ChartRowComponent.tsx`)
- **Utilities**: PascalCase (e.g., `CommonUtils.ts`, `ExportImportHandler.ts`) 
- **Hooks**: camelCase with `use` prefix (e.g., `useNotesTree.ts`, `useContextMenuOptions.ts`)
- **Types**: PascalCase in `DataTypes.ts`
- **Slices**: camelCase with `Slice` suffix (e.g., `baseSettingsSlice.ts`, `notesSlice.ts`)

## Component Architecture Patterns
- **Functional Components**: All components use function declarations with React.memo for optimization
- **Custom Hooks**: Business logic encapsulated in reusable hooks
- **Styled Components**: Consistent theming with separate style files (e.g., `NotesStyles.ts`)
- **Component Isolation**: Each component manages only its specific concerns

## Redux Patterns
- **Redux Toolkit**: All state management uses RTK with slices
- **Undo/Redo**: Built into store configuration with 30-state history
- **Thunks**: Complex async operations in separate thunk files (e.g., `historyThunks.ts`)
- **Selectors**: Separate selector files where needed (e.g., `historySelectors.ts`)

## TypeScript Usage
- **Strict Mode**: Enabled with strict type checking
- **Union Types**: Heavy use for data types (e.g., `WBSData = ChartRow | SeparatorRow | EventRow`)
- **Interface Definitions**: Clear interfaces for all data structures
- **Type Guards**: Used for discriminating union types

## Testing Conventions
- **Test Files**: `.test.ts` suffix (e.g., `CommonUtils.test.ts`)
- **Jest + RTL**: React Testing Library for component testing
- **TDD Methodology**: Tests written with development
- **Coverage**: Comprehensive test coverage expected