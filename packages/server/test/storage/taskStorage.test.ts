import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TaskStorage } from '../../src/storage/taskStorage.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import type { CreateTaskRequest, TaskStatus, TaskInputType } from '../../src/types/index.js';

describe('TaskStorage', () => {
  let taskStorage: TaskStorage;
  let testStorageDir: string;

  beforeEach(async () => {
    testStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsc-task-storage-test-'));
    taskStorage = new TaskStorage({ storageDir: testStorageDir });
    await taskStorage.initialize();
  });

  afterEach(async () => {
    await fs.remove(testStorageDir);
  });

  describe('constructor and initialization', () => {
    it('should create default directories', async () => {
      const defaultStorage = new TaskStorage();
      await defaultStorage.initialize();
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

  describe('createTask()', () => {
    it('should create tasks with proper initial state', async () => {
      const taskId = 'create-test-task';
      const createRequest: CreateTaskRequest = {
        type: 'github_url',
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
        type: 'local_path',
        url: '/path/to/local/repo'
      };

      const taskState = await taskStorage.createTask(createRequest, taskId);

      expect(taskState.input.config).toBeUndefined();
      expect(taskState.id).toBe(taskId);
    });

    it('should handle all input types', async () => {
      const testCases = [
        { type: 'github_url' as TaskInputType, url: 'https://github.com/repo1.git' },
        { type: 'git_url' as TaskInputType, url: 'https://git.example.com/repo2.git' },
        { type: 'local_path' as TaskInputType, url: '/path/to/repo3' }
      ];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const taskId = `type-test-${i}`;

        const taskState = await taskStorage.createTask(testCase, taskId);
        expect(taskState.input.type).toBe(testCase.type);
        expect(taskState.input.url).toBe(testCase.url);
      }
    });
  });

  describe('saveTask() and loadTask()', () => {
    it('should save and load tasks', async () => {
      const taskId = 'test-task-1';
      const createRequest: CreateTaskRequest = {
        type: 'github_url',
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
      expect(typeof loadedTask!.createdAt).toBe('string');
      expect(typeof loadedTask!.updatedAt).toBe('string');
    });

    it('should return null for non-existent tasks', async () => {
      const result = await taskStorage.loadTask('non-existent-task');
      expect(result).toBeNull();
    });

    it('should handle task updates', async () => {
      const taskId = 'update-task';
      const createRequest: CreateTaskRequest = {
        type: 'github_url',
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
    });

    it('should return null when updating non-existent tasks', async () => {
      const result = await taskStorage.updateTask('non-existent', {
        status: 'completed' as TaskStatus
      });
      expect(result).toBeNull();
    });
  });

  describe('deleteTask()', () => {
    it('should delete existing tasks', async () => {
      const taskId = 'delete-task';
      const createRequest: CreateTaskRequest = {
        type: 'github_url',
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

  describe('getTaskHistory()', () => {
    beforeEach(async () => {
      // Create test tasks
      const tasks = [
        { type: 'github_url' as TaskInputType, url: 'https://github.com/repo1.git', status: 'pending' as TaskStatus },
        { type: 'git_url' as TaskInputType, url: 'https://git.example.com/repo2.git', status: 'analyzing' as TaskStatus },
        { type: 'local_path' as TaskInputType, url: '/path/to/repo3', status: 'completed' as TaskStatus }
      ];

      for (let i = 0; i < tasks.length; i++) {
        const createRequest: CreateTaskRequest = tasks[i];
        const taskState = await taskStorage.createTask(createRequest, `history-task-${i + 1}`);
        taskState.status = tasks[i].status;
        await taskStorage.saveTask(taskState);
      }
    });

    it('should return task summaries', async () => {
      const history = await taskStorage.getTaskHistory();

      expect(history.tasks).toHaveLength(3);
      expect(history.totalCount).toBe(3);

      history.tasks.forEach((task, index) => {
        expect(['history-task-1', 'history-task-2', 'history-task-3']).toContain(task.id);
        expect(task.type).toBeDefined();
        expect(task.url).toBeDefined();
        expect(task.status).toBeDefined();
        expect(['string', 'object']).toContain(typeof task.createdAt);
      });
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
});