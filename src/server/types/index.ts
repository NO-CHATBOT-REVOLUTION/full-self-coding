export interface ServerTask {
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

export interface CodeAnalyzerState {
  status: 'idle' | 'analyzing' | 'completed' | 'stopped' | 'error';
  taskId?: string;
  analysis?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TaskSolverManagerState {
  status: 'idle' | 'running' | 'stopped' | 'completed' | 'error';
  taskId?: string;
  manager?: any;
  progress?: number;
  reports?: any[];
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ServerState {
  codeAnalyzer: CodeAnalyzerState;
  taskSolverManager: TaskSolverManagerState;
  tasks: Map<string, ServerTask>;
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
  createdAt: Date;
  modifiedAt: Date;
  size: number;
}