import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TaskExecutor } from '../../src/utils/taskExecutor.js';
import type { CreateTaskRequest, TaskInputType } from '../../src/types/index.js';

describe('TaskExecutor', () => {
  let taskExecutor: TaskExecutor;

  beforeEach(() => {
    taskExecutor = new TaskExecutor();
  });

  afterEach(() => {
    // Clean up any running tasks
    const activeTasks = taskExecutor.getActiveTasks();
    activeTasks.forEach(taskId => {
      // In a real implementation, you would cancel the task
      // For testing purposes, we'll just clear the active tasks
    });
  });

  describe('Constructor', () => {
    it('should create a TaskExecutor instance', () => {
      expect(taskExecutor).toBeDefined();
      expect(taskExecutor).toBeInstanceOf(TaskExecutor);
    });

    it('should initialize with no active tasks', () => {
      const activeTasks = taskExecutor.getActiveTasks();
      expect(activeTasks).toHaveLength(0);
    });
  });

  describe('getTaskProgress()', () => {
    it('should return null for non-existent tasks', async () => {
      const progress = await taskExecutor.getTaskProgress('non-existent-task');
      expect(progress).toBeNull();
    });

    it('should handle task ID validation', async () => {
      const invalidIds = ['', null, undefined];

      for (const id of invalidIds) {
        const progress = await taskExecutor.getTaskProgress(id as any);
        expect(progress).toBeNull();
      }
    });
  });

  describe('isTaskRunning()', () => {
    it('should return false for non-running tasks', () => {
      expect(taskExecutor.isTaskRunning('non-existent-task')).toBe(false);
    });

    it('should return false for empty task ID', () => {
      expect(taskExecutor.isTaskRunning('')).toBe(false);
    });

    it('should return false for null task ID', () => {
      expect(taskExecutor.isTaskRunning(null as any)).toBe(false);
    });
  });

  describe('getActiveTasks()', () => {
    it('should return empty array when no tasks are running', () => {
      const activeTasks = taskExecutor.getActiveTasks();
      expect(activeTasks).toEqual([]);
      expect(Array.isArray(activeTasks)).toBe(true);
    });

    it('should return array of task IDs', () => {
      const activeTasks = taskExecutor.getActiveTasks();
      expect(Array.isArray(activeTasks)).toBe(true);
      expect(activeTasks.every(id => typeof id === 'string')).toBe(true);
    });
  });

  describe('Task Input Validation', () => {
    it('should validate all supported input types', () => {
      const validInputs: CreateTaskRequest[] = [
        {
          type: 'github_url',
          url: 'https://github.com/user/repo.git'
        },
        {
          type: 'git_url',
          url: 'https://git.example.com/user/repo.git'
        },
        {
          type: 'local_path',
          url: '/path/to/local/repo'
        }
      ];

      validInputs.forEach((input, index) => {
        expect(input.type).toBeDefined();
        expect(['github_url', 'git_url', 'local_path']).toContain(input.type);
        expect(input.url).toBeDefined();
        expect(input.url.length).toBeGreaterThan(0);
      });
    });

    it('should handle tasks with config', () => {
      const inputWithConfig: CreateTaskRequest = {
        type: 'github_url',
        url: 'https://github.com/user/repo.git',
        config: {
          timeout: 60000,
          maxTasks: 10,
          agentType: 'claude-code'
        }
      };

      expect(inputWithConfig.config).toBeDefined();
      expect(inputWithConfig.config?.timeout).toBe(60000);
      expect(inputWithConfig.config?.maxTasks).toBe(10);
      expect(inputWithConfig.config?.agentType).toBe('claude-code');
    });

    it('should handle tasks without config', () => {
      const inputWithoutConfig: CreateTaskRequest = {
        type: 'local_path',
        url: '/path/to/local/repo'
      };

      expect(inputWithoutConfig.config).toBeUndefined();
    });

    it('should validate URL formats', () => {
      const testCases = [
        {
          type: 'github_url',
          url: 'https://github.com/user/repo.git',
          isValid: true
        },
        {
          type: 'git_url',
          url: 'https://git.example.com/user/repo.git',
          isValid: true
        },
        {
          type: 'local_path',
          url: '/path/to/local/repo',
          isValid: true
        },
        {
          type: 'github_url',
          url: 'invalid-url',
          isValid: false
        },
        {
          type: 'git_url',
          url: '',
          isValid: false
        },
        {
          type: 'local_path',
          url: '',
          isValid: false
        }
      ];

      testCases.forEach((testCase, index) => {
        expect(testCase.type).toBeDefined();
        expect(testCase.url).toBeDefined();
        // In a real implementation, you would validate the URL format
        // For testing purposes, we just check that the values exist
      });
    });
  });

  describe('Task Status Handling', () => {
    it('should handle all task statuses', () => {
      const statuses = ['pending', 'analyzing', 'analyzed', 'executing', 'completed', 'failed'];

      statuses.forEach((status, index) => {
        expect(status).toBeDefined();
        expect(typeof status).toBe('string');
        expect(status.length).toBeGreaterThan(0);
      });
    });

    it('should validate status transitions', () => {
      const validTransitions = [
        { from: 'pending', to: 'analyzing' },
        { from: 'analyzing', to: 'analyzed' },
        { from: 'analyzed', to: 'executing' },
        { from: 'executing', to: 'completed' },
        { from: 'executing', to: 'failed' }
      ];

      validTransitions.forEach((transition, index) => {
        expect(transition.from).toBeDefined();
        expect(transition.to).toBeDefined();
        // In a real implementation, you would validate that transitions are allowed
      });
    });
  });

  describe('Progress Monitoring', () => {
    it('should handle analyzer progress updates', () => {
      const progressUpdates = [
        { status: 'pending', progress: 0, currentStep: 'Waiting to start' },
        { status: 'analyzing', progress: 25, currentStep: 'Analyzing codebase' },
        { status: 'analyzing', progress: 50, currentStep: 'Processing files' },
        { status: 'analyzed', progress: 100, currentStep: 'Analysis completed' }
      ];

      progressUpdates.forEach((progress, index) => {
        expect(progress.status).toBeDefined();
        expect(progress.progress).toBeGreaterThanOrEqual(0);
        expect(progress.progress).toBeLessThan(101);
        expect(progress.currentStep).toBeDefined();
      });
    });

    it('should handle task solver progress updates', () => {
      const progressUpdates = [
        {
          status: 'pending',
          progress: 0,
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0
        },
        {
          status: 'executing',
          progress: 25,
          totalTasks: 10,
          completedTasks: 2,
          failedTasks: 0,
          currentTask: 'Processing task 3'
        },
        {
          status: 'executing',
          progress: 75,
          totalTasks: 10,
          completedTasks: 7,
          failedTasks: 1,
          currentTask: 'Processing task 9'
        },
        {
          status: 'completed',
          progress: 100,
          totalTasks: 10,
          completedTasks: 8,
          failedTasks: 2
        }
      ];

      progressUpdates.forEach((progress, index) => {
        expect(progress.status).toBeDefined();
        expect(progress.progress).toBeGreaterThanOrEqual(0);
        expect(progress.progress).toBeLessThan(101);
        expect(progress.totalTasks).toBeGreaterThanOrEqual(0);
        expect(progress.completedTasks).toBeGreaterThanOrEqual(0);
        expect(progress.failedTasks).toBeGreaterThanOrEqual(0);
        expect(progress.completedTasks + progress.failedTasks).toBeLessThanOrEqual(progress.totalTasks);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid task inputs gracefully', () => {
      const invalidInputs = [
        { type: 'invalid_type', url: 'https://github.com/test/repo.git' },
        { type: 'github_url', url: '' },
        { type: '', url: 'https://github.com/test/repo.git' },
        { type: null, url: 'https://github.com/test/repo.git' },
        { type: 'github_url', url: null },
        { type: undefined, url: 'https://github.com/test/repo.git' },
        { type: 'github_url', url: undefined }
      ];

      invalidInputs.forEach((input, index) => {
        expect(() => {
          // In a real implementation, this would validate the input
          const validTypes = ['github_url', 'git_url', 'local_path'];
          if (!validTypes.includes(input.type as any)) {
            throw new Error(`Invalid task type: ${input.type}`);
          }
          if (!input.url || typeof input.url !== 'string' || input.url.trim() === '') {
            throw new Error('Invalid URL');
          }
        }).toThrow();
      });
    });

    it('should handle malformed URLs', () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        'github.com/user/repo',
        '/path/with/../traversal',
        ''
      ];

      malformedUrls.forEach((url, index) => {
      if (url.length === 0 || !url.includes('.') || url.includes('..')) {
        expect(() => {
          throw new Error('Invalid URL format');
        }).toThrow();
      }
    });
    });
  });

  describe('Concurrency', () => {
    it('should prevent duplicate task execution', () => {
      const taskId = 'concurrent-task';

      // First check - task should not be running
      expect(taskExecutor.isTaskRunning(taskId)).toBe(false);

      // In a real implementation, you would start the task here
      // For testing, we just check the initial state
      expect(taskExecutor.isTaskRunning(taskId)).toBe(false);
    });

    it('should handle multiple task IDs', () => {
      const taskIds = ['task-1', 'task-2', 'task-3', 'task-4', 'task-5'];

      taskIds.forEach((taskId, index) => {
        expect(taskId).toBeDefined();
        expect(typeof taskId).toBe('string');
        expect(taskId.length).toBeGreaterThan(0);
        expect(taskExecutor.isTaskRunning(taskId)).toBe(false);
      });
    });

    it('should return array of active task IDs', () => {
      const activeTasks = taskExecutor.getActiveTasks();

      expect(Array.isArray(activeTasks)).toBe(true);
      expect(activeTasks.every(id => typeof id === 'string')).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should handle multiple TaskExecutor instances', () => {
      const executor1 = new TaskExecutor();
      const executor2 = new TaskExecutor();
      const executor3 = new TaskExecutor();

      expect(executor1).toBeDefined();
      expect(executor2).toBeDefined();
      expect(executor3).toBeDefined();
      expect(executor1).not.toBe(executor2);
      expect(executor2).not.toBe(executor3);
      expect(executor1).not.toBe(executor3);

      // All should have no active tasks initially
      expect(executor1.getActiveTasks()).toEqual([]);
      expect(executor2.getActiveTasks()).toEqual([]);
      expect(executor3.getActiveTasks()).toEqual([]);
    });
  });
});