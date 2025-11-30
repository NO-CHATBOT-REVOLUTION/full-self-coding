import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TaskStorage } from './taskStorage.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import type { CreateTaskRequest, TaskStatus, TaskInputType } from '../types/index.js';

describe('TaskStorage', () => {
  let taskStorage: TaskStorage;
  let testStorageDir: string;

  beforeEach(async () => {
    testStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsc-task-storage-test-'));
    taskStorage = new TaskStorage({ storageDir: testStorageDir });
  });

  afterEach(async () => {
    await fs.remove(testStorageDir);
  });

  describe('constructor and initialization', () => {
    it('should create default directories', async () => {
      const defaultStorage = new TaskStorage();
      const defaultDir = path.join(os.homedir(), '.full-self-coding-server');

      expect(await fs.pathExists(defaultDir)).toBe(true);
      expect(await fs.pathExists(path.join(defaultDir, 'tasks'))).toBe(true);
      expect(await fs.pathExists(path.join(defaultDir, 'reports'))).toBe(true);

      await fs.remove(defaultDir);
    });

    it('should create custom directories', async () => {
      expect(await fs.pathExists(testStorageDir)).toBe(true);
      expect(await fs.pathExists(path.join(testStorageDir, 'tasks'))).toBe(true);
      expect(await fs.pathExists(path.join(testStorageDir, 'reports'))).toBe(true);
    });
  });

  describe('saveTask() and loadTask()', () => {
    it('should save and load tasks', async () => {
      const taskId = 'test-task-1';
      const createRequest: CreateTaskRequest = {
        type: 'github_url' as TaskInputType,
        url: 'https://github.com/test/repo.git',
        config: { timeout: 30000 }
      };

      const taskState = await taskStorage.createTask(createRequest, taskId);

      await taskStorage.saveTask(taskState);
      const loadedTask = await taskStorage.loadTask(taskId);

      expect(loadedTask).not.toBeNull();
      expect(loadedTask!.id).toBe(taskId);
      expect(loadedTask!.input.type).toBe('github_url');
      expect(loadedTask!.input.url).toBe('https://github.com/test/repo.git');
      expect(loadedTask!.input.config).toEqual({ timeout: 30000 });
      expect(loadedTask!.status).toBe('pending');
      expect(loadedTask!.createdAt).toBeInstanceOf(Date);
      expect(loadedTask!.updatedAt).toBeInstanceOf(Date);
    });

    it('should return null for non-existent tasks', async () => {
      const result = await taskStorage.loadTask('non-existent-task');
      expect(result).toBeNull();
    });

    it('should handle large task data', async () => {
      const taskId = 'large-task';
      const largeData = 'x'.repeat(10000); // 10KB of data
      const createRequest: CreateTaskRequest = {
        type: 'local_path' as TaskInputType,
        url: '/path/to/large/repo'
      };

      const taskState = await taskStorage.createTask(createRequest, taskId);
      taskState.analyzerProgress.currentStep = largeData;

      await taskStorage.saveTask(taskState);
      const loadedTask = await taskStorage.loadTask(taskId);

      expect(loadedTask!.analyzerProgress.currentStep).toBe(largeData);
    });

    it('should handle special characters in task data', async () => {
      const taskId = 'special-chars-task';
      const createRequest: CreateTaskRequest = {
        type: 'git_url' as TaskInputType,
        url: 'https://github.com/test/special-chars.git'
      };

      const taskState = await taskStorage.createTask(createRequest, taskId);
      taskState.taskSolverProgress.currentTask = 'Special chars: 🚀 "quotes" \'apostrophes\' \n newlines \t tabs';

      await taskStorage.saveTask(taskState);
      const loadedTask = await taskStorage.loadTask(taskId);

      expect(loadedTask!.taskSolverProgress.currentTask).toContain('🚀');
      expect(loadedTask!.taskSolverProgress.currentTask).toContain('"quotes"');
      expect(loadedTask!.taskSolverProgress.currentTask).toContain('\n newlines');
    });
  });

  describe('updateTask()', () => {
    it('should update existing tasks', async () => {
      const taskId = 'update-task';
      const createRequest: CreateTaskRequest = {
        type: 'github_url' as TaskInputType,
        url: 'https://github.com/test/repo.git'
      };

      const taskState = await taskStorage.createTask(createRequest, taskId);
      await taskStorage.saveTask(taskState);

      const updates = {
        status: 'analyzing' as TaskStatus,
        analyzerProgress: {
          status: 'analyzing' as TaskStatus,
          progress: 50,
          currentStep: 'Analyzing codebase structure'
        }
      };

      const updatedTask = await taskStorage.updateTask(taskId, updates);

      expect(updatedTask).not.toBeNull();
      expect(updatedTask!.status).toBe('analyzing');
      expect(updatedTask!.analyzerProgress.progress).toBe(50);
      expect(updatedTask!.analyzerProgress.currentStep).toBe('Analyzing codebase structure');
      expect(updatedTask!.updatedAt.getTime()).toBeGreaterThan(taskState.updatedAt.getTime());
    });

    it('should return null for non-existent tasks', async () => {
      const result = await taskStorage.updateTask('non-existent', {
        status: 'completed' as TaskStatus
      });
      expect(result).toBeNull();
    });

    it('should preserve existing fields when updating', async () => {
      const taskId = 'preserve-fields-task';
      const createRequest: CreateTaskRequest = {
        type: 'local_path' as TaskInputType,
        url: '/path/to/repo'
      };

      const taskState = await taskStorage.createTask(createRequest, taskId);
      taskState.analyzerProgress.currentStep = 'Original step';
      await taskStorage.saveTask(taskState);

      const updates = {
        status: 'executing' as TaskStatus
      };

      const updatedTask = await taskStorage.updateTask(taskId, updates);

      expect(updatedTask!.status).toBe('executing');
      expect(updatedTask!.analyzerProgress.currentStep).toBe('Original step'); // Preserved
      expect(updatedTask!.input).toEqual(taskState.input); // Preserved
    });
  });

  describe('deleteTask()', () => {
    it('should delete existing tasks', async () => {
      const taskId = 'delete-task';
      const createRequest: CreateTaskRequest = {
        type: 'github_url' as TaskInputType,
        url: 'https://github.com/test/repo.git'
      };

      const taskState = await taskStorage.createTask(createRequest, taskId);
      await taskStorage.saveTask(taskState);

      const deleted = await taskStorage.deleteTask(taskId);

      expect(deleted).toBe(true);
      expect(await taskStorage.loadTask(taskId)).toBeNull();
    });

    it('should return false for non-existent tasks', async () => {
      const deleted = await taskStorage.deleteTask('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('getAllTasks()', () => {
    beforeEach(async () => {
      // Create test tasks
      const tasks = [
        { type: 'github_url' as TaskInputType, url: 'https://github.com/repo1.git', status: 'pending' as TaskStatus },
        { type: 'git_url' as TaskInputType, url: 'https://git.example.com/repo2.git', status: 'analyzing' as TaskStatus },
        { type: 'local_path' as TaskInputType, url: '/path/to/repo3', status: 'completed' as TaskStatus },
        { type: 'github_url' as TaskInputType, url: 'https://github.com/repo4.git', status: 'failed' as TaskStatus }
      ];

      for (let i = 0; i < tasks.length; i++) {
        const createRequest: CreateTaskRequest = tasks[i];
        const taskState = await taskStorage.createTask(createRequest, `task-${i + 1}`);
        taskState.status = tasks[i].status;
        await taskStorage.saveTask(taskState);

        // Add delays to ensure different creation times for sorting
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });

    it('should retrieve all tasks sorted by creation date (newest first)', async () => {
      const allTasks = await taskStorage.getAllTasks();

      expect(allTasks).toHaveLength(4);

      // Check sorting (newest first)
      for (let i = 0; i < allTasks.length - 1; i++) {
        expect(allTasks[i].createdAt.getTime()).toBeGreaterThanOrEqual(allTasks[i + 1].createdAt.getTime());
      }
    });

    it('should filter by status', async () => {
      const pendingTasks = await taskStorage.getAllTasks({ status: 'pending' });
      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0].status).toBe('pending');

      const completedTasks = await taskStorage.getAllTasks({ status: 'completed' });
      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0].status).toBe('completed');
    });

    it('should filter by type', async () => {
      const githubTasks = await taskStorage.getAllTasks({ type: 'github_url' });
      expect(githubTasks).toHaveLength(2);
      expect(githubTasks.every(task => task.input.type === 'github_url')).toBe(true);

      const localTasks = await taskStorage.getAllTasks({ type: 'local_path' });
      expect(localTasks).toHaveLength(1);
      expect(localTasks[0].input.type).toBe('local_path');
    });

    it('should apply pagination', async () => {
      const paginatedTasks = await taskStorage.getAllTasks({ limit: 2, offset: 1 });
      expect(paginatedTasks).toHaveLength(2);

      const limitedTasks = await taskStorage.getAllTasks({ limit: 2 });
      expect(limitedTasks).toHaveLength(2);

      const offsetTasks = await taskStorage.getAllTasks({ offset: 2 });
      expect(offsetTasks).toHaveLength(2);
    });

    it('should combine filters', async () => {
      const filteredTasks = await taskStorage.getAllTasks({
        status: 'pending',
        type: 'github_url'
      });
      expect(filteredTasks).toHaveLength(1);
      expect(filteredTasks[0].status).toBe('pending');
      expect(filteredTasks[0].input.type).toBe('github_url');
    });
  });

  describe('getTaskHistory()', () => {
    beforeEach(async () => {
      const tasks = [
        { type: 'github_url' as TaskInputType, url: 'https://github.com/repo1.git', status: 'completed' as TaskStatus, summary: 'Task completed successfully' },
        { type: 'git_url' as TaskInputType, url: 'https://git.example.com/repo2.git', status: 'failed' as TaskStatus },
        { type: 'local_path' as TaskInputType, url: '/path/to/repo3', status: 'completed' as TaskStatus, summary: 'Another completed task' }
      ];

      for (let i = 0; i < tasks.length; i++) {
        const createRequest: CreateTaskRequest = tasks[i];
        const taskState = await taskStorage.createTask(createRequest, `history-task-${i + 1}`);
        taskState.status = tasks[i].status;

        if (tasks[i].summary) {
          taskState.finalReport = {
            summary: tasks[i].summary!,
            totalTasks: 5,
            completedTasks: 4,
            failedTasks: 1,
            duration: 60000
          };
        }

        await taskStorage.saveTask(taskState);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });

    it('should return task summaries', async () => {
      const history = await taskStorage.getTaskHistory();

      expect(history.tasks).toHaveLength(3);
      expect(history.totalCount).toBe(3);

      history.tasks.forEach((task, index) => {
        expect(task.id).toBe(`history-task-${3 - index}`); // Newest first
        expect(task.type).toBeDefined();
        expect(task.url).toBeDefined();
        expect(task.status).toBeDefined();
        expect(task.createdAt).toBeInstanceOf(Date);
      });
    });

    it('should include completedAt for completed tasks', async () => {
      const history = await taskStorage.getTaskHistory();

      const completedTasks = history.tasks.filter(task => task.status === 'completed');
      expect(completedTasks).toHaveLength(2);
      completedTasks.forEach(task => {
        expect(task.completedAt).toBeInstanceOf(Date);
      });
    });

    it('should include summary when available', async () => {
      const history = await taskStorage.getTaskHistory();

      const tasksWithSummary = history.tasks.filter(task => task.summary);
      expect(tasksWithSummary).toHaveLength(2);
      expect(tasksWithSummary[0].summary).toBe('Another completed task');
      expect(tasksWithSummary[1].summary).toBe('Task completed successfully');
    });

    it('should apply pagination to history', async () => {
      const paginatedHistory = await taskStorage.getTaskHistory({ limit: 2, offset: 1 });

      expect(paginatedHistory.tasks).toHaveLength(2);
      expect(paginatedHistory.totalCount).toBe(3);
    });
  });

  describe('saveTaskReports() and loadTaskReports()', () => {
    it('should save and load task reports', async () => {
      const taskId = 'reports-task';
      const reports = [
        {
          title: 'Test Task 1',
          description: 'First test task',
          priority: 1,
          ID: 'task-1',
          status: 'success',
          report: 'Task completed successfully',
          completedAt: Date.now(),
          gitDiff: 'diff --git a/file.js b/file.js\n+ new line'
        },
        {
          title: 'Test Task 2',
          description: 'Second test task',
          priority: 2,
          ID: 'task-2',
          status: 'failure',
          report: 'Task failed with error',
          completedAt: Date.now()
        }
      ];

      await taskStorage.saveTaskReports(taskId, reports);
      const loadedReports = await taskStorage.loadTaskReports(taskId);

      expect(loadedReports).not.toBeNull();
      expect(loadedReports).toHaveLength(2);
      expect(loadedReports![0].title).toBe('Test Task 1');
      expect(loadedReports![1].status).toBe('failure');
    });

    it('should return null for non-existent reports', async () => {
      const reports = await taskStorage.loadTaskReports('non-existent');
      expect(reports).toBeNull();
    });

    it('should handle empty reports array', async () => {
      const taskId = 'empty-reports';
      await taskStorage.saveTaskReports(taskId, []);

      const loadedReports = await taskStorage.loadTaskReports(taskId);
      expect(loadedReports).toEqual([]);
    });
  });

  describe('cleanupOldTasks()', () => {
    it('should clean up old tasks', async () => {
      const taskId = 'old-task';
      const createRequest: CreateTaskRequest = {
        type: 'github_url' as TaskInputType,
        url: 'https://github.com/test/repo.git'
      };

      const taskState = await taskStorage.createTask(createRequest, taskId);
      await taskStorage.saveTask(taskState);

      // Manually set an old modification time
      const taskFile = path.join(testStorageDir, 'tasks', `${taskId}.json`);
      const oldTime = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      await fs.utimes(taskFile, oldTime, oldTime);

      const cleanedCount = await taskStorage.cleanupOldTasks(24 * 60 * 60 * 1000); // 1 day

      expect(cleanedCount).toBe(1);
      expect(await taskStorage.loadTask(taskId)).toBeNull();
    });

    it('should not clean up recent tasks', async () => {
      const taskId = 'recent-task';
      const createRequest: CreateTaskRequest = {
        type: 'github_url' as TaskInputType,
        url: 'https://github.com/test/repo.git'
      };

      const taskState = await taskStorage.createTask(createRequest, taskId);
      await taskStorage.saveTask(taskState);

      const cleanedCount = await taskStorage.cleanupOldTasks(24 * 60 * 60 * 1000); // 1 day

      expect(cleanedCount).toBe(0);
      expect(await taskStorage.loadTask(taskId)).not.toBeNull();
    });

    it('should also clean up associated reports', async () => {
      const taskId = 'task-with-reports';
      const createRequest: CreateTaskRequest = {
        type: 'github_url' as TaskInputType,
        url: 'https://github.com/test/repo.git'
      };

      const taskState = await taskStorage.createTask(createRequest, taskId);
      await taskStorage.saveTask(taskState);
      await taskStorage.saveTaskReports(taskId, [{ title: 'Test', description: 'Test', priority: 1, ID: 'test', status: 'success', report: 'Success' }]);

      // Set old modification time
      const taskFile = path.join(testStorageDir, 'tasks', `${taskId}.json`);
      const oldTime = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      await fs.utimes(taskFile, oldTime, oldTime);

      const cleanedCount = await taskStorage.cleanupOldTasks(24 * 60 * 60 * 1000); // 1 day

      expect(cleanedCount).toBe(1);
      expect(await taskStorage.loadTask(taskId)).toBeNull();
      expect(await taskStorage.loadTaskReports(taskId)).toBeNull();
    });
  });

  describe('getStorageStats()', () => {
    it('should return storage statistics', async () => {
      const tasks = [
        { id: 'stats-task-1', type: 'github_url' as TaskInputType, url: 'https://github.com/repo1.git' },
        { id: 'stats-task-2', type: 'git_url' as TaskInputType, url: 'https://git.example.com/repo2.git' }
      ];

      for (const task of tasks) {
        const createRequest: CreateTaskRequest = task;
        const taskState = await taskStorage.createTask(createRequest, task.id);
        await taskStorage.saveTask(taskState);
        await taskStorage.saveTaskReports(task.id, [{ title: 'Report', description: 'Test', priority: 1, ID: 'report-1', status: 'success', report: 'Success' }]);
      }

      const stats = await taskStorage.getStorageStats();

      expect(stats.totalTasks).toBe(2);
      expect(stats.storageDir).toBe(testStorageDir);
      expect(stats.diskUsage).toBeGreaterThan(0);
    });

    it('should return zero stats for empty storage', async () => {
      const stats = await taskStorage.getStorageStats();

      expect(stats.totalTasks).toBe(0);
      expect(stats.diskUsage).toBe(0);
    });
  });

  describe('createTask()', () => {
    it('should create tasks with proper initial state', async () => {
      const taskId = 'create-test-task';
      const createRequest: CreateTaskRequest = {
        type: 'github_url' as TaskInputType,
        url: 'https://github.com/test/repo.git',
        config: { timeout: 60000 }
      };

      const taskState = await taskStorage.createTask(createRequest, taskId);

      expect(taskState.id).toBe(taskId);
      expect(taskState.input.type).toBe('github_url');
      expect(taskState.input.url).toBe('https://github.com/test/repo.git');
      expect(taskState.input.config).toEqual({ timeout: 60000 });
      expect(taskState.status).toBe('pending');
      expect(taskState.createdAt).toBeInstanceOf(Date);
      expect(taskState.updatedAt).toBeInstanceOf(Date);
      expect(taskState.analyzerProgress.status).toBe('pending');
      expect(taskState.analyzerProgress.progress).toBe(0);
      expect(taskState.taskSolverProgress.status).toBe('pending');
      expect(taskState.taskSolverProgress.progress).toBe(0);
    });

    it('should handle tasks without config', async () => {
      const taskId = 'no-config-task';
      const createRequest: CreateTaskRequest = {
        type: 'local_path' as TaskInputType,
        url: '/path/to/local/repo'
      };

      const taskState = await taskStorage.createTask(createRequest, taskId);

      expect(taskState.input.config).toBeUndefined();
      expect(taskState.id).toBe(taskId);
    });
  });

  describe('error handling', () => {
    it('should handle corrupted task files gracefully', async () => {
      const taskId = 'corrupted-task';
      const taskFile = path.join(testStorageDir, 'tasks', `${taskId}.json`);

      // Write invalid JSON
      await fs.writeFile(taskFile, '{ invalid json content }');

      const loadedTask = await taskStorage.loadTask(taskId);
      expect(loadedTask).toBeNull();
    });

    it('should handle corrupted report files gracefully', async () => {
      const taskId = 'corrupted-reports';
      const reportsFile = path.join(testStorageDir, 'reports', `${taskId}.json`);

      // Write invalid JSON
      await fs.writeFile(reportsFile, '{ invalid json content }');

      const loadedReports = await taskStorage.loadTaskReports(taskId);
      expect(loadedReports).toBeNull();
    });
  });
});