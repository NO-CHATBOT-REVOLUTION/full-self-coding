import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { GlobalTaskState, TaskInput, TaskInputType, TaskStatus, CreateTaskRequest } from '../types/index.js';

export interface TaskStorageConfig {
  storageDir?: string;
}

export class TaskStorage {
  private storageDir: string;
  private tasksDir: string;
  private reportsDir: string;

  constructor(config: TaskStorageConfig = {}) {
    this.storageDir = config.storageDir || path.join(os.homedir(), '.full-self-coding-server');
    this.tasksDir = path.join(this.storageDir, 'tasks');
    this.reportsDir = path.join(this.storageDir, 'reports');
  }

  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.mkdir(this.tasksDir, { recursive: true });
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize storage directories:', error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    // Ensure directories are created before any operation
    await this.initializeDirectories();
  }

  /**
   * Public method to initialize directories (useful for testing)
   */
  public async initialize(): Promise<void> {
    await this.ensureInitialized();
  }

  /**
   * Save a task state to storage
   */
  public async saveTask(taskState: GlobalTaskState): Promise<void> {
    await this.ensureInitialized();

    const taskFile = path.join(this.tasksDir, `${taskState.id}.json`);

    try {
      await fs.writeFile(
        taskFile,
        JSON.stringify(taskState, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error(`Failed to save task ${taskState.id}:`, error);
      throw error;
    }
  }

  /**
   * Load a task state from storage
   */
  public async loadTask(taskId: string): Promise<GlobalTaskState | null> {
    await this.ensureInitialized();

    const taskFile = path.join(this.tasksDir, `${taskId}.json`);

    try {
      const data = await fs.readFile(taskFile, 'utf-8');
      return JSON.parse(data) as GlobalTaskState;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      console.error(`Failed to load task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Update a specific field in a task state
   */
  public async updateTask(
    taskId: string,
    updates: Partial<GlobalTaskState>
  ): Promise<GlobalTaskState | null> {
    const taskState = await this.loadTask(taskId);

    if (!taskState) {
      return null;
    }

    const updatedTask: GlobalTaskState = {
      ...taskState,
      ...updates,
      updatedAt: new Date()
    };

    await this.saveTask(updatedTask);
    return updatedTask;
  }

  /**
   * Delete a task from storage
   */
  public async deleteTask(taskId: string): Promise<boolean> {
    const taskFile = path.join(this.tasksDir, `${taskId}.json`);

    try {
      await fs.unlink(taskFile);
      return true;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return false;
      }
      console.error(`Failed to delete task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get all tasks with optional filtering
   */
  public async getAllTasks(options: {
    status?: TaskStatus;
    type?: TaskInputType;
    limit?: number;
    offset?: number;
  } = {}): Promise<GlobalTaskState[]> {
    try {
      const files = await fs.readdir(this.tasksDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      let tasks: GlobalTaskState[] = [];

      for (const file of jsonFiles) {
        const filePath = path.join(this.tasksDir, file);
        try {
          const data = await fs.readFile(filePath, 'utf-8');
          const task = JSON.parse(data) as GlobalTaskState;

          // Apply filters
          if (options.status && task.status !== options.status) {
            continue;
          }

          if (options.type && task.input.type !== options.type) {
            continue;
          }

          tasks.push(task);
        } catch (error) {
          console.error(`Failed to parse task file ${file}:`, error);
        }
      }

      // Sort by creation date (newest first)
      tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply pagination
      if (options.offset) {
        tasks = tasks.slice(options.offset);
      }

      if (options.limit) {
        tasks = tasks.slice(0, options.limit);
      }

      return tasks;
    } catch (error) {
      console.error('Failed to get all tasks:', error);
      throw error;
    }
  }

  /**
   * Get task history summary
   */
  public async getTaskHistory(options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{
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
  }> {
    const allTasks = await this.getAllTasks();

    const taskSummaries = allTasks.map(task => ({
      id: task.id,
      type: task.input.type,
      url: task.input.url,
      status: task.status,
      createdAt: new Date(task.createdAt),
      completedAt: task.finalReport ? new Date(task.updatedAt) : undefined,
      summary: task.finalReport?.summary
    }));

    const totalCount = taskSummaries.length;

    // Apply pagination
    let paginatedTasks = taskSummaries;

    if (options.offset) {
      paginatedTasks = paginatedTasks.slice(options.offset);
    }

    if (options.limit) {
      paginatedTasks = paginatedTasks.slice(0, options.limit);
    }

    return {
      tasks: paginatedTasks,
      totalCount
    };
  }

  /**
   * Save task reports
   */
  public async saveTaskReports(taskId: string, reports: any[]): Promise<void> {
    const reportsFile = path.join(this.reportsDir, `${taskId}.json`);

    try {
      await fs.writeFile(
        reportsFile,
        JSON.stringify({
          taskId,
          reports,
          savedAt: new Date().toISOString()
        }, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error(`Failed to save reports for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Load task reports
   */
  public async loadTaskReports(taskId: string): Promise<any[] | null> {
    const reportsFile = path.join(this.reportsDir, `${taskId}.json`);

    try {
      const data = await fs.readFile(reportsFile, 'utf-8');
      const reportsData = JSON.parse(data);
      return reportsData.reports || null;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      console.error(`Failed to load reports for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old tasks
   */
  public async cleanupOldTasks(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    // Default: 30 days
    const cutoffDate = new Date(Date.now() - maxAge);
    let cleanedCount = 0;

    try {
      const files = await fs.readdir(this.tasksDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.tasksDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          // Also delete corresponding reports file
          const taskId = file.replace('.json', '');
          const reportsFile = path.join(this.reportsDir, `${taskId}.json`);

          try {
            await fs.unlink(reportsFile);
          } catch (error) {
            // Ignore if reports file doesn't exist
          }

          await fs.unlink(filePath);
          cleanedCount++;
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old tasks:', error);
      throw error;
    }

    return cleanedCount;
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalTasks: number;
    storageDir: string;
    diskUsage: number;
  }> {
    try {
      const tasks = await this.getAllTasks();
      const totalTasks = tasks.length;

      // Calculate disk usage (simplified)
      let diskUsage = 0;
      const files = await fs.readdir(this.tasksDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.tasksDir, file);
          const stats = await fs.stat(filePath);
          diskUsage += stats.size;
        }
      }

      const reportsFiles = await fs.readdir(this.reportsDir);
      for (const file of reportsFiles) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.reportsDir, file);
          const stats = await fs.stat(filePath);
          diskUsage += stats.size;
        }
      }

      return {
        totalTasks,
        storageDir: this.storageDir,
        diskUsage
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      throw error;
    }
  }

  /**
   * Create a new task from a request
   */
  public async createTask(request: CreateTaskRequest, taskId: string): Promise<GlobalTaskState> {
    const taskState: GlobalTaskState = {
      id: taskId,
      input: {
        type: request.type,
        url: request.url,
        config: request.config
      },
      status: 'pending' as TaskStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      analyzerProgress: {
        status: 'pending' as TaskStatus,
        progress: 0,
        currentStep: 'Waiting to start'
      },
      taskSolverProgress: {
        status: 'pending' as TaskStatus,
        progress: 0,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0
      }
    };

    await this.saveTask(taskState);
    return taskState;
  }
}