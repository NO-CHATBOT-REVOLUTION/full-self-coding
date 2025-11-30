# @full-self-coding/server

Server package for automated code analysis and task execution with global state management. Built with Express and TypeScript, powered by Bun runtime.

## Features

- **RESTful API**: Complete HTTP API for task management and state operations
- **Global State Manager**: In-memory state management with TTL support
- **Task Execution**: Asynchronous task processing with real-time progress tracking
- **Local Storage**: Persistent task storage with file system backup
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Security**: CORS, Helmet, and other security middleware
- **Multi-Input Support**: GitHub URLs, Git URLs, and local directory paths
- **Real-time Progress**: Live progress updates for code analysis and task execution
- **Task History**: Complete task history with filtering and pagination

## Installation

```bash
npm install @full-self-coding/server
```

## Quick Start

### Development Mode

```bash
# From project root
bun run server:dev

# Or directly
cd packages/server && bun run dev
```

### Production Mode

```bash
# From project root
bun run server

# Or directly
cd packages/server && bun run start
```

The server will start on `http://localhost:3002` by default.

## API Endpoints

### Health Check

```bash
GET /health
```

### Task Management

#### Create New Task
```bash
POST /api/tasks
Content-Type: application/json

{
  "type": "github_url",
  "url": "https://github.com/user/repo.git",
  "config": {
    "agentType": "claude-code",
    "maxDockerContainers": 5
  }
}
```

#### Get Task Progress
```bash
GET /api/tasks/{taskId}/progress
```

#### Get Task Results
```bash
GET /api/tasks/{taskId}/results
```

#### Get Task History
```bash
GET /api/tasks?limit=10&offset=0
```

#### Get Task Details
```bash
GET /api/tasks/{taskId}
```

#### Get Task Status (Lightweight)
```bash
GET /api/tasks/{taskId}/status
```

#### Delete Task
```bash
DELETE /api/tasks/{taskId}
```

### Global State Management

#### Query State Entries
```bash
GET /api/state?prefix=task:&limit=50
```

#### Get State Statistics
```bash
GET /api/state/stats
```

#### Get All Keys
```bash
GET /api/state/keys?prefix=task:
```

#### Get Value by Key
```bash
GET /api/state/{key}?includeMetadata=true
```

#### Set Value by Key
```bash
POST /api/state/{key}
Content-Type: application/json

{
  "value": "my-value",
  "ttl": 3600000,
  "metadata": {
    "source": "api",
    "version": "1.0"
  }
}
```

#### Update Value by Key
```bash
PUT /api/state/{key}
Content-Type: application/json

{
  "value": "updated-value",
  "metadata": {
    "updated": true
  },
  "mergeMetadata": true
}
```

#### Delete Value by Key
```bash
DELETE /api/state/{key}
```

#### Clean Up Expired Entries
```bash
POST /api/state/cleanup
```

#### Clear All Entries
```bash
DELETE /api/state
```

## Input Types

The server supports three types of inputs for code analysis:

### 1. GitHub URL
```json
{
  "type": "github_url",
  "url": "https://github.com/user/repo.git"
}
```

### 2. Git URL
```json
{
  "type": "git_url",
  "url": "https://gitlab.com/user/repo.git"
}
```

### 3. Local Path
```json
{
  "type": "local_path",
  "url": "/path/to/local/directory"
}
```

## Configuration

### Environment Variables

- **PORT**: Server port (default: 3002)
- **NODE_ENV**: Environment mode (development/production)
- **ALLOWED_ORIGINS**: Comma-separated list of allowed CORS origins

### Task Configuration

```typescript
interface Config {
  agentType: 'claude-code' | 'gemini-cli' | 'codex';
  maxDockerContainers: number;
  maxParallelDockerContainers: number;
  dockerTimeoutSeconds: number;
  dockerMemoryMB: number;
  dockerCpuCores: number;
  maxTasks: number;
  minTasks: number;
  anthropicAPIKey?: string;
  googleGeminiApiKey?: string;
  // ... other configuration options
}
```

## Task Lifecycle

1. **pending** - Task created, waiting to start
2. **analyzing** - Code analysis in progress (0-100%)
3. **analyzed** - Analysis completed, tasks generated
4. **executing** - Task execution in progress (0-100%)
5. **completed** - All tasks completed successfully
6. **failed** - Task failed due to error

## Progress Tracking

### Analyzer Progress
```typescript
{
  status: TaskStatus;
  progress: number;        // 0-100
  currentStep: string;     // Current step description
  totalSteps?: number;     // Total number of steps
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
```

### Task Solver Progress
```typescript
{
  status: TaskStatus;
  progress: number;        // 0-100
  totalTasks: number;      // Total tasks to execute
  completedTasks: number;  // Completed tasks
  failedTasks: number;     // Failed tasks
  currentTask?: string;    // Current task description
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
```

## Storage

Tasks and results are stored locally in:
- **Linux/macOS**: `~/.full-self-coding-server/`
- **Windows**: `%USERPROFILE%\.full-self-coding-server\`

### Storage Structure
```
.full-self-coding-server/
├── tasks/           # Task state files
├── reports/         # Task reports
└── ...
```

## Rate Limiting

- **Task Creation**: 10 tasks per hour per IP
- **General API**: 1000 requests per 15 minutes per IP

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Input Validation**: JSON validation
- **Error Handling**: Secure error responses

## API Examples

### Submit a GitHub Repository for Analysis
```bash
curl -X POST http://localhost:3002/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "github_url",
    "url": "https://github.com/facebook/react.git",
    "config": {
      "agentType": "claude-code",
      "maxTasks": 50
    }
  }'
```

Response:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Task created successfully and started processing"
}
```

### Check Task Progress
```bash
curl http://localhost:3002/api/tasks/550e8400-e29b-41d4-a716-446655440000/progress
```

### Get Final Results
```bash
curl http://localhost:3002/api/tasks/550e8400-e29b-41d4-a716-446655440000/results
```

## Development

### Running Tests
```bash
cd packages/server
bun test
```

### Development Mode with Hot Reload
```bash
cd packages/server
bun run dev
```

### Building
```bash
cd packages/server
bun run build
```

## License

MIT