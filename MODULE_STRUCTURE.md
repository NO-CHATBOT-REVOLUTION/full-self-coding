# Full Self-Coding Module Structure

This document describes the refactored module structure of the full-self-coding project.

## Overview

The project has been split into two main modules:

- **Core Module** (`src/core/`) - Contains all business logic and can be used as a library
- **CLI Module** (`src/cli/`) - Contains command-line interface code

## Core Module (`src/core/`)

The core module contains all the business logic and can be imported and used as a library in other projects.

### Structure

```
src/core/
├── index.ts          # Main export file for the core module
├── analyzer.ts       # Code analysis engine
├── taskSolver.ts     # Task execution engine
├── taskSolverManager.ts # Task orchestration
├── codeCommitter.ts  # Code committing logic
├── dockerInstance.ts # Docker container management
├── config.ts         # Configuration management
├── configReader.ts   # Configuration reading utilities
├── task.ts           # Task definitions
├── codingStyle.ts    # Coding style definitions
├── workStyle.ts      # Work style definitions
├── utils/            # Utility functions
│   ├── getDateAndTime.ts
│   ├── trimJSON.ts
│   └── git.ts
├── prompts/          # Prompt templates
│   ├── analyzerPrompt.ts
│   ├── taskSolverPrompt.ts
│   ├── codingStylePrompt.ts
│   └── diff_nodejs.ts
└── SWEAgent/         # SWE agent commands
    ├── claudeCodeCommands.ts
    ├── codexCommands.ts
    ├── cursorCommands.ts
    ├── geminiCodeCommands.ts
    └── SWEAgentTaskSolverCommands.ts
```

### Usage as Library

```javascript
import {
  analyzeCodebase,
  TaskSolverManager,
  createConfig,
  readConfigWithEnv,
  getGitRemoteUrls
} from 'full-self-coding/core';

// Use core functionality in your project
const config = createConfig({
  ai: { model: 'claude-sonnet', apiKey: 'your-key' }
});
```

## CLI Module (`src/cli/`)

The CLI module contains the command-line interface code and depends on the core module.

### Structure

```
src/cli/
└── index.ts          # CLI implementation using Commander.js
```

### Features

- Command-line argument parsing
- Help and version information
- Configuration file support
- Backward compatibility with existing CLI usage

### Usage

```bash
# Run the full analysis
full-self-coding run

# With custom config
full-self-coding run --config ./my-config.json

# Show help
full-self-coding --help
```

## Main Entry Point (`src/main.ts`)

The main entry point remains the same for backward compatibility but now delegates to the CLI module.

## Build System

The `package.json` has been updated with new build scripts:

- `npm run build` - Build all modules (main, core, cli)
- `npm run build:core` - Build only the core module
- `npm run build:cli` - Build only the CLI module

### Module Exports

The package exports are configured for flexible usage:

```json
{
  "exports": {
    ".": "./dist/main.js",
    "./core": "./dist/core/index.js",
    "./cli": "./dist/cli/index.js"
  }
}
```

## Benefits

1. **Separation of Concerns**: Business logic is separated from CLI interface
2. **Library Usage**: Core functionality can be imported as a library
3. **Testing**: Core logic can be tested independently of CLI
4. **Maintainability**: Clear module boundaries make the code easier to maintain
5. **Extensibility**: New interfaces (web UI, API, etc.) can use the core module

## Migration Notes

- Existing CLI usage remains unchanged
- Core functionality is now available as a reusable library
- Server functionality (if exists) was not found in current structure and may need to be recreated in the CLI module or as a separate module