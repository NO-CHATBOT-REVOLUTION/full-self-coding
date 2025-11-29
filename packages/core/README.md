# @full-self-coding/core

Core library for automated code analysis and task execution. Written in pure TypeScript and optimized for Bun runtime.

## Installation

```bash
npm install @full-self-coding/core
```

## Usage

```typescript
import {
  analyzeCodebase,
  TaskSolverManager,
  createConfig,
  readConfigWithEnv,
  getGitRemoteUrls,
  CodeCommitter,
  type Config,
  type Task
} from '@full-self-coding/core';

// Create configuration
const config = createConfig({
  agentType: 'claude-code',
  anthropicAPIKey: 'your-api-key',
  maxDockerContainers: 10,
  maxParallelDockerContainers: 3
});

// Or read from environment and config files
const config = readConfigWithEnv();

// Analyze codebase
const gitUrl = 'https://github.com/user/repo.git';
const tasks: Task[] = await analyzeCodebase(config, gitUrl);

// Execute tasks
const taskSolver = new TaskSolverManager(config, gitUrl);
for (const task of tasks) {
  taskSolver.addTask(task);
}
await taskSolver.start();

// Get results
const reports = taskSolver.getReports();

// Commit changes
const committer = new CodeCommitter(reports);
await committer.commitAllChanges();
```

## TypeScript Features

- **Full TypeScript Support**: Complete type definitions included
- **Strict Mode**: All code compiled with TypeScript strict mode
- **No Build Step**: Package uses `.ts` files directly for import
- **Bun Optimized**: Optimized for Bun runtime performance

## Core APIs

### Configuration Management

```typescript
import { createConfig, readConfigWithEnv, type Config } from '@full-self-coding/core';

// Create configuration from user config
const config = createConfig(userConfig);

// Read configuration with environment variable support
const config = readConfigWithEnv();
```

### Code Analysis

```typescript
import { analyzeCodebase, type Task } from '@full-self-coding/core';

// Analyze repository and generate tasks
const tasks: Task[] = await analyzeCodebase(config, gitUrl);
```

### Task Execution

```typescript
import { TaskSolverManager, TaskSolver } from '@full-self-coding/core';

// Execute multiple tasks in parallel
const taskManager = new TaskSolverManager(config, gitUrl);

// Execute single task
const taskSolver = new TaskSolver(config, task, agentType, gitUrl);
await taskSolver.solve();
const result = taskSolver.getResult();
```

### Docker Management

```typescript
import { DockerInstance } from '@full-self-coding/core';

const docker = new DockerInstance();
await docker.startContainer('node:latest', 'task-name');
await docker.runCommands(['npm', 'install']);
await docker.shutdownContainer();
```

### Git Operations

```typescript
import { getGitRemoteUrls, CodeCommitter } from '@full-self-coding/core';

// Get repository URLs
const { fetchUrl, pushUrl } = await getGitRemoteUrls(true); // use SSH

// Commit changes with AI-generated messages
const committer = new CodeCommitter(reports);
await committer.commitAllChanges();
```

## Features

- **Code Analysis Engine**: Intelligent codebase analysis and task generation
- **Multi-Agent Support**: Claude Code, Gemini CLI, and extensible agent architecture
- **Docker Container Management**: Secure, isolated task execution
- **Task Execution Framework**: Parallel task processing with resource management
- **Code Committing Automation**: AI-powered git commit generation and execution
- **Configuration Management**: Hierarchical config with environment variable support
- **Type-Safe API**: Full TypeScript definitions and type safety
- **Bun Runtime**: Optimized for Bun's performance and TypeScript support

## Package Structure

```
packages/core/
├── src/
│   ├── index.ts           # Main package exports
│   ├── analyzer/          # Code analysis logic
│   ├── config/            # Configuration management
│   ├── docker/            # Docker container management
│   ├── tasksolver/        # Task execution framework
│   ├── committer/         # Code committing logic
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── test/                  # Test files
└── package.json           # Package configuration
```

## Development

This package is designed to be used directly with TypeScript source files when installed via npm. The package.json points to `.ts` files, making it fully compatible with Bun and other TypeScript runtimes.

## License

MIT