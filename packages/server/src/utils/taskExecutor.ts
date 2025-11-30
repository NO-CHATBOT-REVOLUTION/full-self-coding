import {
  analyzeCodebase,
  TaskSolverManager,
  createConfig,
  readConfigWithEnv,
  CodeCommitter,
  type Config,
  type Task,
  type TaskResult,
  TaskStatus as CoreTaskStatus
} from '@full-self-coding/core';
import { globalStateManager } from './globalStateManager.js';
import { TaskStorage } from '../storage/taskStorage.js';
import type { GlobalTaskState, TaskInputType } from '../types/index.js';
import { TaskStatus } from '../types/index.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export class TaskExecutor {
  private storage: TaskStorage;
  private activeTasks: Map<string, Promise<void>> = new Map();

  constructor() {
    this.storage = new TaskStorage();
  }

  /**
   * Execute a full self-coding task
   */
  public async executeTask(taskId: string): Promise<void> {
    // Check if task is already running
    if (this.activeTasks.has(taskId)) {
      console.log(`Task ${taskId} is already running`);
      return;
    }

    const taskPromise = this._executeTaskInternal(taskId);
    this.activeTasks.set(taskId, taskPromise);

    try {
      await taskPromise;
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  private async _executeTaskInternal(taskId: string): Promise<void> {
    console.log(`Starting execution of task ${taskId}`);

    try {
      // Load task from storage
      const taskState = await this.storage.loadTask(taskId);
      if (!taskState) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Update status to analyzing
      await this.updateTaskStatus(taskId, TaskStatus.ANALYZING);
      await this.updateAnalyzerProgress(taskId, {
        status: TaskStatus.ANALYZING,
        progress: 0,
        currentStep: 'Setting up analysis environment'
      });

      // Create working directory
      const workDir = await this.createWorkDirectory(taskId);

      // Prepare the codebase
      const repoUrl = await this.prepareCodebase(taskState.input, workDir);

      // Create configuration
      const config = await this.createConfiguration(taskState.input.config);

      // Update analyzer progress
      await this.updateAnalyzerProgress(taskId, {
        status: TaskStatus.ANALYZING,
        progress: 20,
        currentStep: 'Analyzing codebase structure'
      });

      // Run code analysis
      const tasks: Task[] = await analyzeCodebase(config, repoUrl);

      // Update task with analysis results
      await this.storage.updateTask(taskId, {
        tasks,
        analyzerProgress: {
          status: TaskStatus.ANALYZED,
          progress: 100,
          currentStep: 'Analysis completed',
          completedAt: new Date(),
          totalSteps: tasks.length
        }
      });

      // Update status to executing
      await this.updateTaskStatus(taskId, TaskStatus.EXECUTING);
      await this.updateTaskSolverProgress(taskId, {
        status: TaskStatus.EXECUTING,
        progress: 0,
        totalTasks: tasks.length,
        completedTasks: 0,
        failedTasks: 0,
        currentTask: 'Starting task execution'
      });

      // Execute tasks
      const taskSolverManager = new TaskSolverManager(config, repoUrl);

      // Add tasks to manager
      for (const task of tasks) {
        taskSolverManager.addTask(task);
      }

      // Set up progress monitoring
      this.monitorTaskSolverProgress(taskId, taskSolverManager, tasks.length);

      // Start execution
      await taskSolverManager.start();

      // Get reports
      const reports = taskSolverManager.getReports();

      // Commit changes
      await this.updateTaskSolverProgress(taskId, {
        status: TaskStatus.EXECUTING,
        progress: 90,
        totalTasks: tasks.length,
        completedTasks: reports.filter(r => r.status === CoreTaskStatus.SUCCESS).length,
        failedTasks: reports.filter(r => r.status === CoreTaskStatus.FAILURE).length,
        currentTask: 'Committing changes'
      });

      const committer = new CodeCommitter(reports);
      await committer.commitAllChanges();

      // Save reports
      await this.storage.saveTaskReports(taskId, reports);

      // Calculate final results
      const completedTasks = reports.filter(r => r.status === CoreTaskStatus.SUCCESS).length;
      const failedTasks = reports.filter(r => r.status === CoreTaskStatus.FAILURE).length;
      const duration = new Date().getTime() - new Date(taskState.createdAt).getTime();

      // Update final task state
      await this.storage.updateTask(taskId, {
        status: TaskStatus.COMPLETED,
        reports,
        taskSolverProgress: {
          status: TaskStatus.COMPLETED,
          progress: 100,
          totalTasks: tasks.length,
          completedTasks,
          failedTasks,
          completedAt: new Date()
        },
        finalReport: {
          summary: `Analyzed ${tasks.length} tasks, completed ${completedTasks} successfully, ${failedTasks} failed`,
          totalTasks: tasks.length,
          completedTasks,
          failedTasks,
          duration
        }
      });

      // Clean up working directory
      await this.cleanupWorkDirectory(workDir);

      console.log(`Task ${taskId} completed successfully`);

    } catch (error) {
      console.error(`Task ${taskId} failed:`, error);

      // Update task state with error
      await this.storage.updateTask(taskId, {
        status: TaskStatus.FAILED,
        analyzerProgress: {
          ...await this.getCurrentAnalyzerProgress(taskId),
          status: TaskStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        taskSolverProgress: {
          ...await this.getCurrentTaskSolverProgress(taskId),
          status: TaskStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      // Clean up working directory if it exists
      try {
        await this.cleanupWorkDirectory(path.join(os.tmpdir(), `fsc-task-${taskId}`));
      } catch (cleanupError) {
        console.error(`Failed to cleanup work directory for task ${taskId}:`, cleanupError);
      }

      throw error;
    }
  }

  private async createConfiguration(userConfig?: Partial<Config>): Promise<Config> {
    if (userConfig) {
      return createConfig(userConfig);
    } else {
      return readConfigWithEnv();
    }
  }

  private async createWorkDirectory(taskId: string): Promise<string> {
    const workDir = path.join(os.tmpdir(), `fsc-task-${taskId}`);
    await fs.ensureDir(workDir);
    return workDir;
  }

  private async prepareCodebase(input: any, workDir: string): Promise<string> {
    const { type, url } = input;

    switch (type) {
      case 'github_url':
        // Clone GitHub repository
        await this.cloneRepository(url, workDir);
        return url;

      case 'git_url':
        // Clone Git repository
        await this.cloneRepository(url, workDir);
        return url;

      case 'local_path':
        // Copy local directory
        await this.copyLocalDirectory(url, workDir);
        return url;

      default:
        throw new Error(`Unsupported input type: ${type}`);
    }
  }

  private async cloneRepository(repoUrl: string, targetDir: string): Promise<void> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      await execAsync(`git clone "${repoUrl}" "${targetDir}"`, {
        cwd: process.cwd()
      });
    } catch (error) {
      throw new Error(`Failed to clone repository ${repoUrl}: ${error}`);
    }
  }

  private async copyLocalDirectory(sourcePath: string, targetDir: string): Promise<void> {
    try {
      await fs.copy(sourcePath, targetDir);
    } catch (error) {
      throw new Error(`Failed to copy local directory ${sourcePath}: ${error}`);
    }
  }

  private async cleanupWorkDirectory(workDir: string): Promise<void> {
    try {
      await fs.remove(workDir);
    } catch (error) {
      console.error(`Failed to cleanup work directory ${workDir}:`, error);
    }
  }

  private monitorTaskSolverProgress(taskId: string, taskSolverManager: TaskSolverManager, totalTasks: number): void {
    // This is a simplified progress monitoring
    // In a real implementation, you might want to set up event listeners or callbacks

    let checkCount = 0;
    const maxChecks = 100; // Prevent infinite monitoring
    const checkInterval = setInterval(async () => {
      checkCount++;

      try {
        const taskState = await this.storage.loadTask(taskId);
        if (!taskState || taskState.status !== TaskStatus.EXECUTING) {
          clearInterval(checkInterval);
          return;
        }

        // Get reports to estimate progress
        const reports = taskSolverManager.getReports();
        const completedTasks = reports.filter(r => r.status === CoreTaskStatus.SUCCESS).length;
        const failedTasks = reports.filter(r => r.status === CoreTaskStatus.FAILURE).length;

        const progress = Math.round(((completedTasks + failedTasks) / totalTasks) * 80); // 80% for solving, 20% for commit

        await this.updateTaskSolverProgress(taskId, {
          status: TaskStatus.EXECUTING,
          progress,
          totalTasks,
          completedTasks,
          failedTasks,
          currentTask: `Executing task ${completedTasks + failedTasks + 1} of ${totalTasks}`
        });

        if (completedTasks + failedTasks >= totalTasks || checkCount >= maxChecks) {
          clearInterval(checkInterval);
        }
      } catch (error) {
        console.error(`Error monitoring progress for task ${taskId}:`, error);
        clearInterval(checkInterval);
      }
    }, 2000); // Check every 2 seconds
  }

  private async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    await this.storage.updateTask(taskId, { status });

    // Also update in global state
    globalStateManager.set(`task:${taskId}:status`, status);
  }

  private async updateAnalyzerProgress(taskId: string, progress: any): Promise<void> {
    await this.storage.updateTask(taskId, { analyzerProgress: progress });

    // Also update in global state
    globalStateManager.set(`task:${taskId}:analyzer`, progress);
  }

  private async updateTaskSolverProgress(taskId: string, progress: any): Promise<void> {
    await this.storage.updateTask(taskId, { taskSolverProgress: progress });

    // Also update in global state
    globalStateManager.set(`task:${taskId}:solver`, progress);
  }

  private async getCurrentAnalyzerProgress(taskId: string): Promise<any> {
    const taskState = await this.storage.loadTask(taskId);
    return taskState?.analyzerProgress || {
      status: TaskStatus.PENDING,
      progress: 0,
      currentStep: 'Unknown'
    };
  }

  private async getCurrentTaskSolverProgress(taskId: string): Promise<any> {
    const taskState = await this.storage.loadTask(taskId);
    return taskState?.taskSolverProgress || {
      status: TaskStatus.PENDING,
      progress: 0,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0
    };
  }

  /**
   * Get the current progress of a task
   */
  public async getTaskProgress(taskId: string): Promise<GlobalTaskState | null> {
    return await this.storage.loadTask(taskId);
  }

  /**
   * Check if a task is currently running
   */
  public isTaskRunning(taskId: string): boolean {
    return this.activeTasks.has(taskId);
  }

  /**
   * Get all active tasks
   */
  public getActiveTasks(): string[] {
    return Array.from(this.activeTasks.keys());
  }
}