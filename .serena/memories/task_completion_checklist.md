# Task Completion Checklist

## Required Steps When Completing Tasks

### 1. Code Quality Checks
- **Run Linting**: `npm run lint` - Ensure ESLint passes with TypeScript rules
- **Fix Warnings**: Address all linting warnings (max-warnings 0 in config)
- **Type Checking**: Ensure TypeScript compilation succeeds

### 2. Testing Requirements  
- **Run Tests**: `npm run test` - All Jest tests must pass
- **Test Coverage**: Consider `npm run test:coverage` for new features
- **Test Related Code**: Write tests for new utility functions

### 3. Build Verification
- **Production Build**: `npm run build` - Verify TypeScript compilation and Vite build
- **Preview Check**: `npm run preview` if needed to test build output

### 4. Development Environment Notes
- **Windows Compatibility**: Commands may show bash path errors but function correctly
- **Port Monitoring**: Use `netstat -an | findstr :5173` to verify dev server status

## Code Integration Standards
- **Follow Existing Patterns**: Match component structure and naming conventions
- **Redux Integration**: Use existing slice patterns for state management
- **Performance**: Apply React.memo and useCallback for optimization
- **TypeScript**: Maintain strict typing standards

## Important Constraints
- **MAX_ROWS**: Respect 999 task limit per project
- **Undo/Redo**: Ensure new actions integrate with history system
- **File Format**: Maintain ZIP/JSON compatibility for save/load
- **Browser Support**: Test in Chromium-based browsers only