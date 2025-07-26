# Gantt Chart Tool

English | [日本語](README.md)

A local Gantt chart application built with TypeScript and React.

## Online Demo

Try the demo published on GitHub Pages:  
**[https://yourusername.github.io/gantapp-local/](https://yourusername.github.io/gantapp-local/)**

※ Replace `yourusername` with your actual GitHub username

## Key Features

### Project Management
- **Task Management**: Create, edit, and delete tasks
- **Dependency Settings**: Set relationships between tasks
- **Progress Tracking**: Manage task progress percentages
- **Hierarchical Structure**: Organize tasks in groups

### Gantt Chart Display
- **Visual Timeline**: Display task durations as horizontal bar charts
- **Drag & Drop**: Adjust task periods with mouse operations
- **Holiday Support**: Schedule calculations based on working days
- **Color Customization**: Color-code tasks

### File Operations
- **Project Save**: Save entire projects in ZIP format
- **Project Load**: Restore from saved ZIP files
- **JSON Support**: Export data in JSON format for external integration

### Notes Feature
- **Rich Text Editor**: Advanced memo functionality with Quill editor
- **Task-specific Notes**: Record detailed notes for each task
- **Formatting Support**: Headers, bullet points, tables, and more

### Additional Features
- **Multi-language Support**: Japanese and English support
- **Undo/Redo**: Undo and redo operations
- **Responsive Design**: Works on desktop and tablet devices

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

### Single HTML File Creation
```bash
# Currently unavailable due to technical issues
# Please use the online demo on GitHub Pages instead
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

## Data Format

Projects are saved as ZIP files containing:
- `project.json`: Main project data
- `notes.json`: Notes data  
- Other UI configuration information

## License

MIT License - See [LICENSE](LICENSE) file for details

---

**Note**: This application runs locally. Data is stored in your browser, so we recommend regularly backing up with ZIP files.