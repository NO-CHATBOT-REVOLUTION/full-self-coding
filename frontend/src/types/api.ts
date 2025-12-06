// API Types for Full Self Coding Server

export type TaskInputType = 'github_url' | 'git_url' | 'local_path';

export interface CreateTaskRequest {
  type: TaskInputType;
  url: string;
  config?: {
    timeout?: number;
    maxTasks?: number;
    agentType?: string;
  };
}

export interface CreateTaskResponse {
  taskId: string;
  status: string;
  message: string;
}

export interface AnalyzerProgress {
  status: string;
  progress: number;
  currentStep?: string;
}

export interface TaskSolverProgress {
  status: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  currentTask?: string;
}

export interface TaskProgressResponse {
  taskId: string;
  status: string;
  analyzerProgress: AnalyzerProgress;
  taskSolverProgress: TaskSolverProgress;
  createdAt: string;
  updatedAt: string;
}

export interface TaskReport {
  title: string;
  description: string;
  priority: number;
  ID: string;
  status: string;
  report: string;
  completedAt?: number;
  gitDiff?: string;
}

export interface FinalReport {
  summary: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  duration: number;
}

export interface TaskResultsResponse {
  taskId: string;
  status: string;
  tasks: TaskReport[];
  reports: TaskReport[];
  finalReport?: FinalReport;
  createdAt: string;
  completedAt?: string;
}

export interface TaskHistoryItem {
  id: string;
  type: TaskInputType;
  url: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  summary?: string;
}

export interface TaskHistoryResponse {
  tasks: TaskHistoryItem[];
  totalCount: number;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}

export interface ServerInfo {
  name: string;
  version: string;
  description: string;
  endpoints: {
    health: string;
    tasks: {
      create: string;
      getProgress: string;
      getResults: string;
      getHistory: string;
      getDetails: string;
      getStatus: string;
      delete: string;
    };
    state: {
      query: string;
      getStats: string;
      getKeys: string;
      getValue: string;
      setValue: string;
      updateValue: string;
      deleteValue: string;
      cleanup: string;
      clearAll: string;
    };
  };
  documentation: string;
}