# Full Self-Coding Module Structure

This document describes the refactored module structure of the full-self-coding project.

## Overview

The project has been restructured as a monorepo with separate npm packages:

- **Core Package** (`packages/core/`) - Contains all business logic and can be used as a library
- **CLI Package** (`packages/cli/`) - Contains command-line interface code

## Core Package (`packages/core/`)

The core package contains all the business logic and can be imported and used as a library in other projects.

### Structure

```
packages/core/
├── src/
│   ├── index.ts          # Main export file for the core package
│   ├── analyzer.ts       # Code analysis engine
│   ├── taskSolver.ts     # Task execution engine
│   ├── taskSolverManager.ts # Task orchestration
│   ├── codeCommitter.ts  # Code committing logic
│   ├── dockerInstance.ts # Docker container management
│   ├── config.ts         # Configuration management
│   ├── configReader.ts   # Configuration reading utilities
│   ├── task.ts           # Task definitions
│   ├── codingStyle.ts    # Coding style definitions
│   ├── workStyle.ts      # Work style definitions
│   ├── utils/            # Utility functions
│   │   ├── getDateAndTime.ts
│   │   ├── trimJSON.ts
│   │   └── git.ts
│   ├── prompts/          # Prompt templates
│   │   ├── analyzerPrompt.ts
│   │   ├── taskSolverPrompt.ts
│   │   ├── codingStylePrompt.ts
│   │   └── diff_nodejs.ts
│   └── SWEAgent/         # SWE agent commands
│       ├── claudeCodeCommands.ts
│       ├── codexCommands.ts
│       ├── cursorCommands.ts
│       ├── geminiCodeCommands.ts
│       └── SWEAgentTaskSolverCommands.ts
├── test/                 # Test files
├── package.json          # Package configuration
└── README.md             # Package documentation
```

### Package Information

- **Package Name**: `@full-self-coding/core`
- **Type**: Pure TypeScript (no build step)
- **Runtime**: Optimized for Bun
- **Main Entry**: `src/index.ts`

### Usage as Library

```typescript
import {
  analyzeCodebase,
  TaskSolverManager,
  createConfig,
  readConfigWithEnv,
  getGitRemoteUrls,
  type Config,
  type Task
} from '@full-self-coding/core';

// Use core functionality in your project
const config = createConfig({
  agentType: 'claude-code',
  anthropicAPIKey: 'your-api-key'
});

const tasks = await analyzeCodebase(config, 'https://github.com/user/repo.git');
```

## CLI Package (`packages/cli/`)

The CLI package contains the command-line interface code and depends on the core package.

### Structure

```
packages/cli/
├── src/
│   └── index.ts          # CLI implementation using Commander.js
├── package.json          # Package configuration
└── README.md             # Package documentation
```

### Package Information

- **Package Name**: `@full-self-coding/cli`
- **Binary**: `full-self-coding-cli`
- **Type**: Pure TypeScript (no build step)
- **Runtime**: Optimized for Bun
- **Main Entry**: `src/index.ts`

### Features

- Command-line argument parsing
- Help and version information
- Configuration file support
- Binary execution through npm package

### Usage

```bash
# Run the full analysis
full-self-coding-cli

# With custom config
full-self-coding-cli run --config ./my-config.json

# Show help
full-self-coding-cli --help

# Development mode
cd packages/cli
bun src/index.ts
```

## Monorepo Structure

The project uses npm workspaces to manage the monorepo:

```
full-self-coding/
├── packages/
│   ├── core/             # Core library package
│   └── cli/              # CLI package
├── package.json          # Root package with workspace configuration
├── README.md             # Main project documentation
└── MODULE_STRUCTURE.md   # This file
```

### Root Package Configuration

```json
{
  "name": "full-self-coding",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "cd packages/cli && bun run dev",
    "start": "cd packages/cli && bun run start",
    "test": "cd packages/core && bun run test"
  }
}
```

## TypeScript Execution

Both packages are designed to run directly from TypeScript source files:

- **No Build Step**: TypeScript files are executed directly by Bun
- **Fast Development**: Edit source and immediately run
- **Type Safety**: Full TypeScript support with strict mode
- **Import Support**: Direct import from `.ts` files

## Package Publishing

### Core Package

```json
{
  "name": "@full-self-coding/core",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "type": "module",
  "publishConfig": {
    "access": "public"
  }
}
```

### CLI Package

```json
{
  "name": "@full-self-coding/cli",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "type": "module",
  "bin": {
    "full-self-coding-cli": "./src/index.ts"
  },
  "dependencies": {
    "@full-self-coding/core": "^1.0.1"
  }
}
```

## Benefits

1. **Pure TypeScript**: No build step required, direct TypeScript execution
2. **Package Modularity**: Clear separation between core library and CLI interface
3. **NPM Distribution**: Packages can be published to npmjs.com
4. **Dependency Management**: Clear dependency relationship between packages
5. **Development Experience**: Fast iteration with Bun runtime
6. **Library Usage**: Core functionality can be imported as a library
7. **Testing**: Core logic tested independently of CLI
8. **Maintainability**: Clear package boundaries and responsibilities
9. **Extensibility**: New interfaces can use the core package

## Migration Notes

- Project structure changed from `src/` to `packages/`
- All source files moved to `packages/*/src/`
- Tests moved to `packages/core/test/`
- Removed all build steps and `dist/` directories
- Uses pure TypeScript execution with Bun runtime
- Existing functionality preserved in new package structure