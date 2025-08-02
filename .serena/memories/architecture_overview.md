# Architecture Overview

## Application Structure
This is an offline-first Gantt chart application with a component-based React architecture and centralized Redux state management.

## Core Data Flow
1. **WBS Table** (ReactGrid) ↔ **Redux Store** ↔ **Gantt Chart** (Canvas/SVG)
2. **User Actions** → **Redux Dispatches** → **State Updates** → **Component Re-renders**
3. **File Operations** → **ZIP/JSON Processing** → **State Hydration/Dehydration**

## Key Architectural Decisions

### State Management Strategy
- **Single Source of Truth**: All application state in Redux store
- **Slice-based Organization**: Feature-specific slices (notes, colors, settings, etc.)
- **Undo/Redo System**: Built into store with 30-state history
- **Optimistic Updates**: Immediate UI updates with validation

### Component Hierarchy
```
LocalApp (root)
├── LocalComponents (authenticated wrapper)
├── TopBarLocal (navigation)
├── Gantt (chart container)
│   ├── Calendar (date headers)
│   ├── ChartRowComponent (task bars)
│   ├── EventRowComponent (milestones)
│   └── GridVertical (date lines)
├── WBSInfo (ReactGrid table)
└── Settings/Notes/Welcome (modal systems)
```

### Data Types Architecture
- **WBSData Union**: `ChartRow | SeparatorRow | EventRow`
- **Dependency System**: String-based format with distance calculations
- **Date Handling**: Multiple date libraries for different purposes
- **File Format**: ZIP containers with `project.json` + `notes.json`

### Performance Optimizations
- **React.memo**: Component memoization for large lists
- **useCallback**: Event handler memoization
- **Virtualization**: Efficient rendering of 1000+ rows
- **Granular State**: Minimal re-renders through targeted selectors