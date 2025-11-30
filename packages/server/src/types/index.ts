import type { Config, Task, TaskResult } from '@full-self-coding/core';

export enum TaskStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  ANALYZED = 'analyzed',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum TaskInputType {
  GITHUB_URL = 'github_url',
  GIT_URL = 'git_url',
  LOCAL_PATH = 'local_path'
}

export interface TaskInput {
  type: TaskInputType;
  url: string;
  config?: Partial<Config>;
}

export interface AnalyzerProgress {
  status: TaskStatus;
  progress: number; // 0-100
  currentStep: string;
  totalSteps?: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface TaskSolverProgress {
  status: TaskStatus;
  progress: number; // 0-100
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  currentTask?: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface GlobalTaskState {
  id: string;
  input: TaskInput;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  analyzerProgress: AnalyzerProgress;
  taskSolverProgress: TaskSolverProgress;
  tasks?: Task[];
  reports?: TaskResult[];
  finalReport?: {
    summary: string;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    duration: number; // in milliseconds
  };
}

export interface CreateTaskRequest {
  type: TaskInputType;
  url: string;
  config?: Partial<Config>;
}

export interface CreateTaskResponse {
  taskId: string;
  status: TaskStatus;
  message: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}

export interface TaskProgressResponse {
  taskId: string;
  status: TaskStatus;
  analyzerProgress: AnalyzerProgress;
  taskSolverProgress: TaskSolverProgress;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskResultsResponse {
  taskId: string;
  status: TaskStatus;
  tasks: Task[];
  reports: TaskResult[];
  finalReport?: {
    summary: string;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    duration: number;
  };
  createdAt: Date;
  completedAt?: Date;
}

export interface TaskHistoryResponse {
  tasks: Array<{
    id: string;
    type: TaskInputType;
    url: string;
    status: TaskStatus;
    createdAt: Date;
    completedAt?: Date;
    summary?: string;
  }>;
  totalCount: number;
}

export interface GlobalStateEntry<T = any> {
  key: string;
  value: T;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface GlobalStateQueryOptions {
  prefix?: string;
  limit?: number;
  offset?: number;
  includeExpired?: boolean;
}

export interface GlobalStateStats {
  totalEntries: number;
  expiredEntries: number;
  memoryUsage: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}