export interface ServerTask {
  id: string;
  directory: string;
  status: 'pending' | 'analyzing' | 'analyzed' | 'solving' | 'completed' | 'failed' | 'stopped';
  tasks?: any[];
  analysis?: any;
  reports?: any[];
  progress?: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface CodeAnalyzerState {
  status: 'idle' | 'analyzing' | 'completed' | 'stopped' | 'error';
  taskId?: string;
  analysis?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface TaskSolverManagerState {
  status: 'idle' | 'running' | 'stopped' | 'completed' | 'error';
  taskId?: string;
  manager?: any;
  progress?: number;
  reports?: any[];
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Dashboard {
  uptime: number;
  timestamp: string;
  codeAnalyzer: CodeAnalyzerState;
  taskSolverManager: TaskSolverManagerState;
  tasks: {
    total: number;
    pending: number;
    analyzing: number;
    analyzed: number;
    solving: number;
    completed: number;
    failed: number;
    stopped: number;
  };
}

export interface Health {
  status: 'healthy';
  uptime: number;
  tasks: number;
  codeAnalyzerStatus: string;
  taskSolverManagerStatus: string;
  server?: string;
  version?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface WorkspaceProject {
  name: string;
  path: string;
  createdAt: string;
  modifiedAt: string;
  size: number;
}

export interface Workspace {
  workspaceDir: string;
  projects: WorkspaceProject[];
  count: number;
}

export interface CreateTaskRequest {
  directory: string;
}

export interface CreateRemoteTaskRequest {
  gitRemoteUrl: string;
  projectName?: string;
}

export interface CreateTaskResponse {
  taskId: string;
  status: string;
  gitRemoteUrl?: string;
  projectName?: string;
  workspaceDir?: string;
}

export interface CleanupRequest {
  olderThanDays?: number;
}

export interface CleanupResponse {
  message: string;
  cleaned: number;
  olderThanDays: number;
}