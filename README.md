# Gantt Local

A powerful, offline-first Gantt chart application built with React, Redux, and TypeScript. Create, edit, and manage project timelines completely offline without any cloud dependencies.

## 🚀 Features

- **Offline-First**: Works completely offline with no internet connection required
- **Interactive Gantt Charts**: Visual project timeline with drag & drop functionality
- **Task Management**: Create, edit, and organize tasks with dependencies
- **File Operations**: Import/export projects as ZIP or JSON files
- **Rich Text Notes**: Comprehensive note-taking with Quill editor
- **Internationalization**: Full support for English and Japanese
- **Responsive Design**: Works on desktop and mobile devices
- **No Account Required**: Start using immediately without registration

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **State Management**: Redux Toolkit
- **Build Tool**: Vite
- **UI Components**: Material-UI + Ant Design
- **Styling**: Styled Components
- **Rich Text**: Quill Editor
- **File Handling**: JSZip
- **Testing**: Jest + React Testing Library

## 📦 Installation

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Setup

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

4. Open your browser and navigate to `http://localhost:5173`

## 🎯 Usage

### Basic Operations

1. **Create a New Project**: Click "File" → "New" to start a fresh project
2. **Add Tasks**: Use the context menu or table interface to add new tasks
3. **Set Dependencies**: Link tasks together using the dependency column
4. **Adjust Timeline**: Drag and resize chart bars to modify dates
5. **Save Project**: Export your work as ZIP files for backup

### File Operations

- **Export**: Save your project as a ZIP file containing all data and settings
- **Import**: Load previously saved ZIP files to continue working
- **JSON Export**: Export raw data in JSON format for integration with other tools

### Notes & Documentation

- **Rich Text Notes**: Add detailed notes with formatting, lists, and tables
- **Project Documentation**: Keep all project information in one place
- **Persistent State**: Notes and UI settings are saved with your project

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

### Project Structure

```
src/
├── components/          # React components
│   ├── Gantt/          # Main Gantt chart
│   ├── Table/          # WBS table components
│   ├── Topbar/         # Navigation and menus
│   ├── Setting/        # Configuration dialogs
│   └── Welcome/        # Onboarding
├── hooks/              # Custom React hooks
├── reduxStoreAndSlices/ # Redux state management
├── utils/              # Utility functions
├── types/              # TypeScript definitions
└── i18n/               # Internationalization
```

### Testing

The project includes comprehensive test coverage using TDD methodology:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🌐 Internationalization

Currently supports:
- **English** (en)
- **Japanese** (ja)

Language is auto-detected from browser settings with fallback to English.

## 📄 Data Format

Projects are saved as ZIP files containing:
- `project.json` - Main project data (tasks, settings, etc.)
- `notes.json` - Rich text notes data
- Additional metadata for UI state preservation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern React and TypeScript
- UI components from Material-UI and Ant Design
- Rich text editing powered by Quill
- Inspired by the need for offline project management tools

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/gantt-local/issues) page
2. Create a new issue with detailed description
3. Include steps to reproduce any bugs

---

**Note**: This is an offline-first application. All data is stored locally in your browser. Make sure to export your projects as ZIP files for backup and sharing.