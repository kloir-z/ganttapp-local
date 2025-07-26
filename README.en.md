# Excel-like Gantt Chart App

English | [日本語](README.md)

## System Requirements

**Only works on PC Chromium-based browsers (Chrome/Edge).**

- Does not work on Firefox/Safari (no support planned)
- Cannot be used on mobile devices (no support planned)  
- Originally created for personal use, but published in case it might help others with similar needs

## Try It Out

**[https://kloir-z.github.io/ganttapp-local/](https://kloir-z.github.io/ganttapp-local/)**

## Why I Created This

I was creating Gantt charts in Excel using conditional formatting and formulas, but when the number of rows increased (200+ rows), updates became cumbersome and felt like a typical example of "wrong way to use Excel." The performance was slow and lacked good overview capability.

When ChatGPT emerged in 2023, I learned about its high code generation capabilities and thought "maybe I can create a Gantt chart app?" This was the catalyst for starting development.

**Goal**: A tool where you can directly manipulate charts with mouse, with lightweight performance, good overview capability, and support for complex dependency relationships.

## Key Features and Points

### Complete Table-Chart Integration
- Editing the table instantly reflects in the chart
- Dragging the chart automatically updates the table
- **Double-click to create chart**, **drag to move/adjust**, **right-click to delete**

### Excel-like Table Operations
- Cell editing, row insertion/deletion/copying
- Row movement by dragging
- Hierarchical structure for task grouping

### Automatic Dependency Calculation (after and sameas)
- **`after,-x,n`**: Start n days after completion of x rows above
  - Example: `after,-1,3` → Set start date 3 days after 1 row above
- **`sameas,-x`**: Start at the same time as x rows above
  - Example: `sameas,-1` → Match start date of 1 row above
- Real-time updates when any dependency relationship changes

### Automatic Adjustment Considering Holidays
- Automatically avoid weekends/holidays when changing dates (can be enabled/disabled per row)
- Customizable holiday settings (weekend days/colors, holiday colors, custom holidays)
- ※Japanese holidays from 2022-2029 are pre-configured by default

### Chart Overview Capability
- **Chart daily width adjustable in 0.5px increments** - Supports overview display of long-term projects
- Displays up to 1000 tasks smoothly

### Other Features
- **Undo/Redo**: Maintains up to 30 operation history
- **Multi-language Support**: Japanese and English support
- **Date Format Options**: Choose from yyyy/mm/dd, mm/dd/yyyy, or dd/mm/yyyy formats

## Setup

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/yourusername/gantt-local.git
cd gantt-local
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Access `http://localhost:5173` in your browser

## Basic Usage

### Creating a New Project
1. Start a project with "File" → "New"
2. Add and edit tasks in the WBS table
3. Set task relationships in the dependency column
4. Adjust periods in the Gantt chart

### Saving and Loading Projects
- **Save**: Use "File" → "Export" to save as ZIP file
- **Load**: Use "File" → "Import" to open saved files

### Using Notes
1. Open the notes screen with the "Notes" button
2. Select a task in the left tree
3. Record notes in the right editor

## Build & Distribution

### Regular Build
```bash
npm run build      # Production build (output to dist/ folder)
```

### Development Commands
```bash
npm run dev        # Start development server
npm run lint       # Code quality check
npm run test       # Run tests
npm run preview    # Preview build results
```

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **State Management**: Redux Toolkit  
- **Build Tool**: Vite
- **UI Libraries**: Material-UI, Ant Design
- **Rich Text**: Quill Editor
- **File Processing**: JSZip
- **Testing**: Jest + React Testing Library

## License

MIT License - See [LICENSE](LICENSE) file for details