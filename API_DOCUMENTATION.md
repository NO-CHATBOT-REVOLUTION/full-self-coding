# Full Self-Coding Server API Documentation

## Overview

The Full Self-Coding CLI can be run in server mode to provide a REST API for code analysis and task management. Start the server with:

```bash
full-self-coding --server [port]
```

Default port is 3000 if not specified.

## Base URL

```
http://localhost:3000
```

## Authentication

No authentication is currently implemented. Use with caution in production environments.

## API Endpoints

### System Information

#### Health Check
`GET /health`

Returns server status and basic system information.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 123.45,
    "tasks": 2,
    "codeAnalyzerStatus": "idle",
    "taskSolverManagerStatus": "running"
  },
  "timestamp": "2024-01-27T12:00:00.000Z"
}
```

#### Dashboard
`GET /api/dashboard`

Returns a comprehensive overview of all system components.

**Response:**
```json
{
  "success": true,
  "data": {
    "uptime": 123.45,
    "timestamp": "2024-01-27T12:00:00.000Z",
    "codeAnalyzer": { "status": "idle" },
    "taskSolverManager": { "status": "running" },
    "tasks": {
      "total": 5,
      "pending": 1,
      "analyzing": 0,
      "analyzed": 2,
      "solving": 1,
      "completed": 1,
      "failed": 0,
      "stopped": 0
    }
  }
}
```

---

### Remote Repository Management

#### Start Remote Task
`POST /api/tasks/start-remote`

Start a new task by cloning a remote git repository.

**Request Body:**
```json
{
  "gitRemoteUrl": "https://github.com/user/repo.git",
  "projectName": "optional-custom-name"
}
```

**Parameters:**
- `gitRemoteUrl` (required, string): GitHub repository URL (HTTPS or SSH)
- `projectName` (optional, string): Custom project name. If not provided, extracted from repo URL

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "uuid-string",
    "status": "pending",
    "gitRemoteUrl": "https://github.com/user/repo.git",
    "projectName": "repo",
    "workspaceDir": "/path/to/workspace/repo-timestamp"
  }
}
```

**Supported URL Formats:**
- `https://github.com/user/repo.git`
- `https://github.com/user/repo`
- `git@github.com:user/repo.git`
- `git@github.com:user/repo`

#### List Workspace
`GET /api/workspace`

List all cloned repositories in the workspace.

**Response:**
```json
{
  "success": true,
  "data": {
    "workspaceDir": "/path/to/workspace",
    "projects": [
      {
        "name": "repo-1640995200000",
        "path": "/path/to/workspace/repo-1640995200000",
        "createdAt": "2024-01-27T12:00:00.000Z",
        "modifiedAt": "2024-01-27T12:30:00.000Z",
        "size": 1048576
      }
    ],
    "count": 1
  }
}
```

#### Clean Up Workspace
`POST /api/workspace/cleanup`

Remove old cloned repositories from workspace.

**Request Body:**
```json
{
  "olderThanDays": 7
}
```

**Parameters:**
- `olderThanDays` (optional, number): Remove projects older than this many days. Default: 7

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Workspace cleanup completed",
    "cleaned": 3,
    "olderThanDays": 7
  }
}
```

---

### Task Management

#### Start Task
`POST /api/tasks/start`

Start a new task for analyzing a given directory.

**Request Body:**
```json
{
  "directory": "/path/to/project"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "uuid-string",
    "status": "pending"
  }
}
```

#### Get Task Status
`GET /api/tasks/:taskId`

Get detailed status and progress for a specific task.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "directory": "/path/to/project",
    "status": "completed",
    "progress": 100,
    "tasks": [...],
    "analysis": { "taskCount": 3, "directory": "/path/to/project" },
    "reports": [...],
    "startedAt": "2024-01-27T12:00:00.000Z",
    "completedAt": "2024-01-27T12:05:00.000Z"
  }
}
```

#### List All Tasks
`GET /api/tasks`

Get status of all tasks.

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid-string",
        "directory": "/path/to/project",
        "status": "completed",
        "progress": 100
      }
    ],
    "count": 1
  }
}
```

**Task Status Values:**
- `pending` - Task queued but not started
- `analyzing` - Code analysis in progress
- `analyzed` - Analysis completed, waiting for solver
- `solving` - Task execution in progress
- `completed` - Task completed successfully
- `failed` - Task failed with error
- `stopped` - Task was manually stopped

---

### Code Analyzer

#### Start Code Analyzer
`POST /api/analyzer/start`

Start code analysis for a directory.

**Request Body:**
```json
{
  "directory": "/path/to/project"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "uuid-string",
    "status": "analyzing"
  }
}
```

#### Get Analyzer Status
`GET /api/analyzer/status`

Get current status of the code analyzer.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "idle",
    "taskId": "uuid-string",
    "analysis": { "taskCount": 3 },
    "startedAt": "2024-01-27T12:00:00.000Z",
    "completedAt": "2024-01-27T12:02:00.000Z"
  }
}
```

#### Get Analyzer Report
`GET /api/analyzer/report`

Get the completed analysis report.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "taskId": "uuid-string",
    "analysis": { "taskCount": 3, "directory": "/path/to/project" },
    "completedAt": "2024-01-27T12:02:00.000Z"
  }
}
```

#### Stop Code Analyzer
`POST /api/analyzer/stop`

Stop the running code analyzer.

**Response:**
```json
{
  "success": true,
  "data": {
    "previousStatus": "analyzing",
    "currentStatus": "stopped"
  }
}
```

---

### Task Solver Manager

#### Start Task Solver Manager
`POST /api/task-solver/start`

Start the task solver manager to execute tasks.

**Request Body:**
```json
{
  "taskId": "uuid-string",
  "tasks": [
    {
      "description": "Task description",
      "type": "feature",
      "details": "..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "uuid-string",
    "status": "running"
  }
}
```

#### Get Task Solver Progress
`GET /api/task-solver/progress`

Monitor progress of the task solver manager.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "running",
    "taskId": "uuid-string",
    "progress": 75,
    "reports": [...],
    "currentTaskCount": 2,
    "tasks": [
      {
        "id": "uuid-string",
        "directory": "/path/to/project",
        "status": "solving",
        "progress": 75
      }
    ]
  }
}
```

#### Get Task Solver Status
`GET /api/task-solver/status`

Get current status of the task solver manager.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "running",
    "taskId": "uuid-string",
    "progress": 75,
    "startedAt": "2024-01-27T12:00:00.000Z"
  }
}
```

#### Get Task Solver Report
`GET /api/task-solver/report`

Get the final report from completed task solver execution.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "taskId": "uuid-string",
      "description": "Task description",
      "type": "feature",
      "status": "completed",
      "changes": [...],
      "report": "..."
    }
  ]
}
```

#### Stop Task Solver Manager
`POST /api/task-solver/stop`

Stop the running task solver manager.

**Response:**
```json
{
  "success": true,
  "data": {
    "previousStatus": "running",
    "currentStatus": "stopped"
  }
}
```

---

### Emergency Operations

#### Emergency Stop All
`POST /api/emergency-stop`

Immediately stop all running components (analyzer, task solver, and individual tasks).

**Response:**
```json
{
  "success": true,
  "data": {
    "stoppedComponents": ["codeAnalyzer", "taskSolverManager", "task-uuid-string"],
    "message": "Emergency stop completed successfully"
  }
}
```

#### Stop Specific Task
`POST /api/emergency-stop/task-solver/:taskId`

Stop a specific task solver.

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "uuid-string",
    "status": "stopped"
  }
}
```

---

## Error Handling

All endpoints return a consistent response format:

```json
{
  "success": false,
  "error": "Error description",
  "timestamp": "2024-01-27T12:00:00.000Z"
}
```

## HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters, invalid state)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Rate Limiting

No rate limiting is currently implemented.

## WebSocket Support

WebSocket endpoints are not currently implemented. Use polling for real-time updates.

## Example Usage

### Analyze a local directory:
```bash
curl -X POST http://localhost:3000/api/tasks/start \
  -H "Content-Type: application/json" \
  -d '{"directory": "/path/to/my-project"}'
```

### Analyze a remote git repository:
```bash
curl -X POST http://localhost:3000/api/tasks/start-remote \
  -H "Content-Type: application/json" \
  -d '{"gitRemoteUrl": "https://github.com/user/repo.git"}'
```

### List workspace projects:
```bash
curl http://localhost:3000/api/workspace
```

### Clean up old projects:
```bash
curl -X POST http://localhost:3000/api/workspace/cleanup \
  -H "Content-Type: application/json" \
  -d '{"olderThanDays": 3}'
```

### Monitor progress:
```bash
curl http://localhost:3000/api/dashboard
```

### Get detailed task status:
```bash
curl http://localhost:3000/api/tasks/uuid-string
```

### Emergency stop:
```bash
curl -X POST http://localhost:3000/api/emergency-stop
```

## Data Structures

### Task Object
```typescript
interface Task {
  id: string;
  directory: string;
  status: 'pending' | 'analyzing' | 'analyzed' | 'solving' | 'completed' | 'failed' | 'stopped';
  tasks?: any[];
  analysis?: any;
  reports?: any[];
  progress?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}
```

### Response Format
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
```