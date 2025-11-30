import { describe, it, expect } from 'bun:test';
import {
  TaskStatus,
  TaskInputType,
  TaskInput,
  AnalyzerProgress,
  TaskSolverProgress,
  GlobalTaskState,
  CreateTaskRequest,
  CreateTaskResponse,
  TaskProgressResponse,
  TaskResultsResponse,
  TaskHistoryResponse,
  ErrorResponse,
  GlobalStateEntry,
  GlobalStateQueryOptions,
  GlobalStateStats
} from '../../src/types/index.js';

describe('Type Definitions', () => {
  describe('TaskStatus', () => {
    it('should have all required status values', () => {
      expect(TaskStatus.PENDING).toBe('pending');
      expect(TaskStatus.ANALYZING).toBe('analyzing');
      expect(TaskStatus.ANALYZED).toBe('analyzed');
      expect(TaskStatus.EXECUTING).toBe('executing');
      expect(TaskStatus.COMPLETED).toBe('completed');
      expect(TaskStatus.FAILED).toBe('failed');
    });

    it('should have exactly 6 status values', () => {
      const statusValues = Object.values(TaskStatus);
      expect(statusValues).toHaveLength(6);
      expect(statusValues).toContain('pending');
      expect(statusValues).toContain('analyzing');
      expect(statusValues).toContain('analyzed');
      expect(statusValues).toContain('executing');
      expect(statusValues).toContain('completed');
      expect(statusValues).toContain('failed');
    });
  });

  describe('TaskInputType', () => {
    it('should have all required input types', () => {
      expect(TaskInputType.GITHUB_URL).toBe('github_url');
      expect(TaskInputType.GIT_URL).toBe('git_url');
      expect(TaskInputType.LOCAL_PATH).toBe('local_path');
    });

    it('should have exactly 3 input types', () => {
      const inputTypes = Object.values(TaskInputType);
      expect(inputTypes).toHaveLength(3);
      expect(inputTypes).toContain('github_url');
      expect(inputTypes).toContain('git_url');
      expect(inputTypes).toContain('local_path');
    });
  });

  describe('TaskInput Interface', () => {
    it('should accept valid task input', () => {
      const validInput: TaskInput = {
        type: TaskInputType.GITHUB_URL,
        url: 'https://github.com/test/repo.git',
        config: { timeout: 60000 }
      };

      expect(validInput.type).toBe('github_url');
      expect(validInput.url).toBe('https://github.com/test/repo.git');
      expect(validInput.config).toEqual({ timeout: 60000 });
    });

    it('should accept task input without config', () => {
      const inputWithoutConfig: TaskInput = {
        type: TaskInputType.LOCAL_PATH,
        url: '/path/to/local/repo'
      };

      expect(inputWithoutConfig.config).toBeUndefined();
    });

    it('should accept all input types', () => {
      const githubInput: TaskInput = {
        type: TaskInputType.GITHUB_URL,
        url: 'https://github.com/test/repo.git'
      };

      const gitInput: TaskInput = {
        type: TaskInputType.GIT_URL,
        url: 'https://git.example.com/test/repo.git'
      };

      const localInput: TaskInput = {
        type: TaskInputType.LOCAL_PATH,
        url: '/path/to/local/repo'
      };

      expect(githubInput.type).toBe('github_url');
      expect(gitInput.type).toBe('git_url');
      expect(localInput.type).toBe('local_path');
    });
  });

  describe('AnalyzerProgress Interface', () => {
    it('should accept valid analyzer progress', () => {
      const progress: AnalyzerProgress = {
        status: TaskStatus.ANALYZING,
        progress: 45,
        currentStep: 'Analyzing codebase structure',
        totalSteps: 100,
        startedAt: new Date(),
        completedAt: undefined,
        error: undefined
      };

      expect(progress.status).toBe('analyzing');
      expect(progress.progress).toBe(45);
      expect(progress.currentStep).toBe('Analyzing codebase structure');
      expect(progress.totalSteps).toBe(100);
      expect(progress.startedAt).toBeInstanceOf(Date);
      expect(progress.completedAt).toBeUndefined();
      expect(progress.error).toBeUndefined();
    });

    it('should accept completed analyzer progress', () => {
      const completedProgress: AnalyzerProgress = {
        status: TaskStatus.ANALYZED,
        progress: 100,
        currentStep: 'Analysis completed',
        totalSteps: 100,
        startedAt: new Date(Date.now() - 60000),
        completedAt: new Date(),
        error: undefined
      };

      expect(completedProgress.status).toBe('analyzed');
      expect(completedProgress.progress).toBe(100);
      expect(completedProgress.completedAt).toBeInstanceOf(Date);
    });

    it('should accept failed analyzer progress', () => {
      const failedProgress: AnalyzerProgress = {
        status: TaskStatus.FAILED,
        progress: 25,
        currentStep: 'Analyzing dependencies',
        totalSteps: 100,
        startedAt: new Date(Date.now() - 30000),
        completedAt: undefined,
        error: 'Failed to analyze dependencies'
      };

      expect(failedProgress.status).toBe('failed');
      expect(failedProgress.error).toBe('Failed to analyze dependencies');
    });
  });

  describe('TaskSolverProgress Interface', () => {
    it('should accept valid task solver progress', () => {
      const progress: TaskSolverProgress = {
        status: TaskStatus.EXECUTING,
        progress: 60,
        totalTasks: 10,
        completedTasks: 6,
        failedTasks: 0,
        currentTask: 'Processing task 7',
        startedAt: new Date(Date.now() - 120000),
        completedAt: undefined,
        error: undefined
      };

      expect(progress.status).toBe('executing');
      expect(progress.progress).toBe(60);
      expect(progress.totalTasks).toBe(10);
      expect(progress.completedTasks).toBe(6);
      expect(progress.failedTasks).toBe(0);
      expect(progress.currentTask).toBe('Processing task 7');
    });

    it('should accept completed task solver progress', () => {
      const completedProgress: TaskSolverProgress = {
        status: TaskStatus.COMPLETED,
        progress: 100,
        totalTasks: 10,
        completedTasks: 8,
        failedTasks: 2,
        startedAt: new Date(Date.now() - 300000),
        completedAt: new Date(),
        error: undefined
      };

      expect(completedProgress.status).toBe('completed');
      expect(completedProgress.completedAt).toBeInstanceOf(Date);
    });

    it('should accept failed task solver progress', () => {
      const failedProgress: TaskSolverProgress = {
        status: TaskStatus.FAILED,
        progress: 30,
        totalTasks: 10,
        completedTasks: 3,
        failedTasks: 1,
        currentTask: 'Processing task 5',
        startedAt: new Date(Date.now() - 60000),
        completedAt: undefined,
        error: 'Task execution failed'
      };

      expect(failedProgress.status).toBe('failed');
      expect(failedProgress.error).toBe('Task execution failed');
    });
  });

  describe('GlobalTaskState Interface', () => {
    it('should accept valid global task state', () => {
      const taskState: GlobalTaskState = {
        id: 'task-123',
        input: {
          type: TaskInputType.GITHUB_URL,
          url: 'https://github.com/test/repo.git',
          config: { timeout: 60000 }
        },
        status: TaskStatus.ANALYZING,
        createdAt: new Date(Date.now() - 120000),
        updatedAt: new Date(),
        analyzerProgress: {
          status: TaskStatus.ANALYZING,
          progress: 80,
          currentStep: 'Analyzing codebase structure',
          totalSteps: 100
        },
        taskSolverProgress: {
          status: TaskStatus.PENDING,
          progress: 0,
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0
        },
        tasks: [
          { title: 'Task 1', description: 'Description 1', priority: 1, ID: 'task-1' },
          { title: 'Task 2', description: 'Description 2', priority: 2, ID: 'task-2' }
        ],
        reports: [
          { title: 'Task 1', status: 'success', report: 'Success', ID: 'task-1' }
        ],
        finalReport: {
          summary: 'Task execution completed',
          totalTasks: 2,
          completedTasks: 1,
          failedTasks: 1,
          duration: 120000
        }
      };

      expect(taskState.id).toBe('task-123');
      expect(taskState.status).toBe('analyzing');
      expect(taskState.input.type).toBe('github_url');
      expect(taskState.analyzerProgress.progress).toBe(80);
      expect(taskState.taskSolverProgress.status).toBe('pending');
      expect(taskState.tasks).toHaveLength(2);
      expect(taskState.reports).toHaveLength(1);
      expect(taskState.finalReport?.summary).toBe('Task execution completed');
    });

    it('should accept minimal global task state', () => {
      const minimalState: GlobalTaskState = {
        id: 'minimal-task',
        input: {
          type: TaskInputType.LOCAL_PATH,
          url: '/path/to/repo'
        },
        status: TaskStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        analyzerProgress: {
          status: TaskStatus.PENDING,
          progress: 0,
          currentStep: 'Waiting to start'
        },
        taskSolverProgress: {
          status: TaskStatus.PENDING,
          progress: 0,
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0
        }
      };

      expect(minimalState.id).toBe('minimal-task');
      expect(minimalState.tasks).toBeUndefined();
      expect(minimalState.reports).toBeUndefined();
      expect(minimalState.finalReport).toBeUndefined();
    });
  });

  describe('API Request/Response Types', () => {
    describe('CreateTaskRequest', () => {
      it('should accept valid create task request', () => {
        const request: CreateTaskRequest = {
          type: TaskInputType.GITHUB_URL,
          url: 'https://github.com/test/repo.git',
          config: { timeout: 30000, maxTasks: 5 }
        };

        expect(request.type).toBe('github_url');
        expect(request.url).toBe('https://github.com/test/repo.git');
        expect(request.config?.timeout).toBe(30000);
      });

      it('should accept create task request without config', () => {
        const request: CreateTaskRequest = {
          type: TaskInputType.GIT_URL,
          url: 'https://git.example.com/test/repo.git'
        };

        expect(request.config).toBeUndefined();
      });
    });

    describe('CreateTaskResponse', () => {
      it('should accept valid create task response', () => {
        const response: CreateTaskResponse = {
          taskId: 'generated-task-id',
          status: TaskStatus.PENDING,
          message: 'Task created successfully and started processing'
        };

        expect(response.taskId).toBe('generated-task-id');
        expect(response.status).toBe('pending');
        expect(response.message).toBe('Task created successfully and started processing');
      });
    });

    describe('TaskProgressResponse', () => {
      it('should accept valid task progress response', () => {
        const response: TaskProgressResponse = {
          taskId: 'progress-task-id',
          status: TaskStatus.EXECUTING,
          analyzerProgress: {
            status: TaskStatus.COMPLETED,
            progress: 100,
            currentStep: 'Analysis completed'
          },
          taskSolverProgress: {
            status: TaskStatus.EXECUTING,
            progress: 65,
            totalTasks: 10,
            completedTasks: 6,
            failedTasks: 0,
            currentTask: 'Processing task 7'
          },
          createdAt: new Date(Date.now() - 180000),
          updatedAt: new Date()
        };

        expect(response.taskId).toBe('progress-task-id');
        expect(response.status).toBe('executing');
        expect(response.analyzerProgress.progress).toBe(100);
        expect(response.taskSolverProgress.progress).toBe(65);
      });
    });

    describe('TaskResultsResponse', () => {
      it('should accept valid task results response', () => {
        const response: TaskResultsResponse = {
          taskId: 'results-task-id',
          status: TaskStatus.COMPLETED,
          tasks: [
            { title: 'Task 1', description: 'Description 1', priority: 1, ID: 'task-1' },
            { title: 'Task 2', description: 'Description 2', priority: 2, ID: 'task-2' }
          ],
          reports: [
            { title: 'Task 1', status: 'success', report: 'Success', ID: 'task-1' },
            { title: 'Task 2', status: 'failure', report: 'Failed', ID: 'task-2' }
          ],
          finalReport: {
            summary: 'Execution completed with 1 success and 1 failure',
            totalTasks: 2,
            completedTasks: 1,
            failedTasks: 1,
            duration: 240000
          },
          createdAt: new Date(Date.now() - 300000),
          completedAt: new Date()
        };

        expect(response.taskId).toBe('results-task-id');
        expect(response.status).toBe('completed');
        expect(response.tasks).toHaveLength(2);
        expect(response.reports).toHaveLength(2);
        expect(response.finalReport?.summary).toContain('1 success and 1 failure');
        expect(response.completedAt).toBeInstanceOf(Date);
      });
    });

    describe('TaskHistoryResponse', () => {
      it('should accept valid task history response', () => {
        const response: TaskHistoryResponse = {
          tasks: [
            {
              id: 'history-task-1',
              type: TaskInputType.GITHUB_URL,
              url: 'https://github.com/repo1.git',
              status: TaskStatus.COMPLETED,
              createdAt: new Date(Date.now() - 86400000), // 1 day ago
              completedAt: new Date(Date.now() - 80000000),
              summary: 'Task completed successfully'
            },
            {
              id: 'history-task-2',
              type: TaskInputType.LOCAL_PATH,
              url: '/path/to/local/repo',
              status: TaskStatus.FAILED,
              createdAt: new Date(Date.now() - 3600000), // 1 hour ago
              summary: undefined
            }
          ],
          totalCount: 25
        };

        expect(response.tasks).toHaveLength(2);
        expect(response.totalCount).toBe(25);
        expect(response.tasks[0].status).toBe('completed');
        expect(response.tasks[0].summary).toBe('Task completed successfully');
        expect(response.tasks[1].status).toBe('failed');
        expect(response.tasks[1].summary).toBeUndefined();
      });
    });

    describe('ErrorResponse', () => {
      it('should accept valid error response', () => {
        const errorResponse: ErrorResponse = {
          error: 'Validation error',
          message: 'Missing required field: url'
        };

        expect(errorResponse.error).toBe('Validation error');
        expect(errorResponse.message).toBe('Missing required field: url');
      });

      it('should accept error response without message', () => {
        const errorResponse: ErrorResponse = {
          error: 'Internal server error'
        };

        expect(errorResponse.error).toBe('Internal server error');
        expect(errorResponse.message).toBeUndefined();
      });
    });
  });

  describe('Global State Management Types', () => {
    describe('GlobalStateEntry', () => {
      it('should accept valid global state entry', () => {
        const entry: GlobalStateEntry<string> = {
          key: 'test-key',
          value: 'test-value',
          createdAt: new Date(Date.now() - 60000),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 300000), // 5 minutes from now
          metadata: { type: 'test', version: 1 }
        };

        expect(entry.key).toBe('test-key');
        expect(entry.value).toBe('test-value');
        expect(entry.createdAt).toBeInstanceOf(Date);
        expect(entry.updatedAt).toBeInstanceOf(Date);
        expect(entry.expiresAt).toBeInstanceOf(Date);
        expect(entry.metadata?.type).toBe('test');
      });

      it('should accept entry without optional fields', () => {
        const entry: GlobalStateEntry<number> = {
          key: 'counter',
          value: 42,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        expect(entry.expiresAt).toBeUndefined();
        expect(entry.metadata).toBeUndefined();
      });
    });

    describe('GlobalStateQueryOptions', () => {
      it('should accept valid query options', () => {
        const options: GlobalStateQueryOptions = {
          prefix: 'task:',
          limit: 10,
          offset: 20,
          includeExpired: false
        };

        expect(options.prefix).toBe('task:');
        expect(options.limit).toBe(10);
        expect(options.offset).toBe(20);
        expect(options.includeExpired).toBe(false);
      });

      it('should accept empty query options', () => {
        const options: GlobalStateQueryOptions = {};

        expect(options.prefix).toBeUndefined();
        expect(options.limit).toBeUndefined();
        expect(options.offset).toBeUndefined();
        expect(options.includeExpired).toBeUndefined();
      });
    });

    describe('GlobalStateStats', () => {
      it('should accept valid stats', () => {
        const stats: GlobalStateStats = {
          totalEntries: 150,
          expiredEntries: 25,
          memoryUsage: 1048576, // 1MB in bytes
          oldestEntry: new Date(Date.now() - 86400000), // 1 day ago
          newestEntry: new Date()
        };

        expect(stats.totalEntries).toBe(150);
        expect(stats.expiredEntries).toBe(25);
        expect(stats.memoryUsage).toBe(1048576);
        expect(stats.oldestEntry).toBeInstanceOf(Date);
        expect(stats.newestEntry).toBeInstanceOf(Date);
      });

      it('should accept stats without optional date fields', () => {
        const stats: GlobalStateStats = {
          totalEntries: 0,
          expiredEntries: 0,
          memoryUsage: 0
        };

        expect(stats.oldestEntry).toBeUndefined();
        expect(stats.newestEntry).toBeUndefined();
      });
    });
  });

  describe('Type Compatibility', () => {
    it('should allow task status comparisons', () => {
      const status: TaskStatus = TaskStatus.COMPLETED;
      expect(status === 'completed').toBe(true);
      expect(status === TaskStatus.COMPLETED).toBe(true);
    });

    it('should allow input type comparisons', () => {
      const inputType: TaskInputType = TaskInputType.GITHUB_URL;
      expect(inputType === 'github_url').toBe(true);
      expect(inputType === TaskInputType.GITHUB_URL).toBe(true);
    });

    it('should handle optional config fields correctly', () => {
      const input1: TaskInput = {
        type: TaskInputType.GITHUB_URL,
        url: 'https://github.com/test/repo.git'
      };

      const input2: TaskInput = {
        type: TaskInputType.GITHUB_URL,
        url: 'https://github.com/test/repo.git',
        config: { timeout: 60000 }
      };

      expect(input1.config).toBeUndefined();
      expect(input2.config).toBeDefined();
      expect(input2.config?.timeout).toBe(60000);
    });

    it('should handle optional date fields in progress objects', () => {
      const progress1: AnalyzerProgress = {
        status: TaskStatus.PENDING,
        progress: 0,
        currentStep: 'Waiting to start'
      };

      const progress2: AnalyzerProgress = {
        status: TaskStatus.COMPLETED,
        progress: 100,
        currentStep: 'Completed',
        completedAt: new Date()
      };

      expect(progress1.completedAt).toBeUndefined();
      expect(progress2.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('Type Safety', () => {
    it('should enforce required fields', () => {
      // These should compile without errors
      const taskInput: TaskInput = {
        type: TaskInputType.GITHUB_URL,
        url: 'https://github.com/test/repo.git' // Required field
      };

      const progress: AnalyzerProgress = {
        status: TaskStatus.ANALYZING, // Required field
        progress: 50, // Required field
        currentStep: 'Analyzing' // Required field
      };

      expect(taskInput.url).toBeDefined();
      expect(progress.currentStep).toBeDefined();
    });

    it('should allow undefined for optional fields', () => {
      const response: TaskProgressResponse = {
        taskId: 'test-task',
        status: TaskStatus.ANALYZING,
        analyzerProgress: {
          status: TaskStatus.ANALYZING,
          progress: 25,
          currentStep: 'Starting analysis'
        },
        taskSolverProgress: {
          status: TaskStatus.PENDING,
          progress: 0,
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // All optional fields can be undefined
      expect(response.analyzerProgress.totalSteps).toBeUndefined();
      expect(response.analyzerProgress.completedAt).toBeUndefined();
      expect(response.analyzerProgress.error).toBeUndefined();
      expect(response.taskSolverProgress.currentTask).toBeUndefined();
    });
  });
});