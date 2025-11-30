import { describe, it, expect, beforeEach, afterEach, jest } from 'bun:test';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import taskRoutes from './tasks.js';
import { TaskStorage } from '../storage/taskStorage.js';
import { TaskExecutor } from '../utils/taskExecutor.js';
import { globalStateManager } from '../utils/globalStateManager.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// Mock dependencies
jest.mock('../utils/taskExecutor.js');
jest.mock('../storage/taskStorage.js');
jest.mock('../utils/globalStateManager.js');

const MockTaskExecutor = TaskExecutor as jest.MockedClass<typeof TaskExecutor>;
const MockTaskStorage = TaskStorage as jest.MockedClass<typeof TaskStorage>;
const MockGlobalStateManager = globalStateManager as jest.Mocked<typeof globalStateManager>;

describe('Tasks API Routes', () => {
  let app: express.Application;
  let mockTaskExecutor: jest.Mocked<TaskExecutor>;
  let mockTaskStorage: jest.Mocked<TaskStorage>;
  let testStorageDir: string;

  beforeEach(async () => {
    // Create test storage directory
    testStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsc-api-test-'));

    // Setup mocks
    mockTaskExecutor = {
      executeTask: jest.fn(),
      isTaskRunning: jest.fn(),
      getActiveTasks: jest.fn(),
      getTaskProgress: jest.fn()
    } as any;

    mockTaskStorage = {
      createTask: jest.fn(),
      loadTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      getAllTasks: jest.fn(),
      getTaskHistory: jest.fn(),
      saveTaskReports: jest.fn(),
      loadTaskReports: jest.fn()
    } as any;

    MockGlobalStateManager.set = jest.fn();
    MockGlobalStateManager.get = jest.fn();
    MockGlobalStateManager.delete = jest.fn();

    MockTaskExecutor.mockImplementation(() => mockTaskExecutor);
    MockTaskStorage.mockImplementation(() => mockTaskStorage);

    // Setup Express app with middleware
    app = express();
    app.use(helmet());
    app.use(cors());
    app.use(compression());
    app.use(express.json({ limit: '10mb' }));
    app.use('/api/tasks', taskRoutes);
  });

  afterEach(async () => {
    await fs.remove(testStorageDir);
    jest.clearAllMocks();
  });

  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const taskRequest = {
        type: 'github_url',
        url: 'https://github.com/test/repo.git'
      };

      const mockTaskState = {
        id: 'test-task-id',
        input: taskRequest,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        analyzerProgress: {
          status: 'pending',
          progress: 0,
          currentStep: 'Waiting to start'
        },
        taskSolverProgress: {
          status: 'pending',
          progress: 0,
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0
        }
      };

      mockTaskStorage.createTask.mockResolvedValue(mockTaskState as any);
      mockTaskExecutor.executeTask.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/tasks')
        .send(taskRequest)
        .expect(201);

      expect(response.body).toEqual({
        taskId: 'test-task-id',
        status: 'pending',
        message: 'Task created successfully and started processing'
      });

      expect(mockTaskStorage.createTask).toHaveBeenCalledWith(taskRequest, expect.any(String));
      expect(MockGlobalStateManager.set).toHaveBeenCalled();
      expect(mockTaskExecutor.executeTask).toHaveBeenCalledWith('test-task-id');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ url: 'https://github.com/test/repo.git' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Missing required fields: type and url'
      });

      expect(mockTaskStorage.createTask).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid type', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          type: 'invalid_type',
          url: 'https://github.com/test/repo.git'
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid type. Must be one of: github_url, git_url, local_path'
      });

      expect(mockTaskStorage.createTask).not.toHaveBeenCalled();
    });

    it('should handle git_url type', async () => {
      const taskRequest = {
        type: 'git_url',
        url: 'https://git.example.com/repo.git'
      };

      const mockTaskState = {
        id: 'git-task-id',
        input: taskRequest,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        analyzerProgress: { status: 'pending', progress: 0, currentStep: 'Waiting to start' },
        taskSolverProgress: { status: 'pending', progress: 0, totalTasks: 0, completedTasks: 0, failedTasks: 0 }
      };

      mockTaskStorage.createTask.mockResolvedValue(mockTaskState as any);
      mockTaskExecutor.executeTask.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/tasks')
        .send(taskRequest)
        .expect(201);

      expect(response.body.taskId).toBe('git-task-id');
      expect(mockTaskStorage.createTask).toHaveBeenCalledWith(taskRequest, expect.any(String));
    });

    it('should handle local_path type', async () => {
      const taskRequest = {
        type: 'local_path',
        url: '/path/to/local/repo'
      };

      const mockTaskState = {
        id: 'local-task-id',
        input: taskRequest,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        analyzerProgress: { status: 'pending', progress: 0, currentStep: 'Waiting to start' },
        taskSolverProgress: { status: 'pending', progress: 0, totalTasks: 0, completedTasks: 0, failedTasks: 0 }
      };

      mockTaskStorage.createTask.mockResolvedValue(mockTaskState as any);
      mockTaskExecutor.executeTask.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/tasks')
        .send(taskRequest)
        .expect(201);

      expect(response.body.taskId).toBe('local-task-id');
      expect(mockTaskStorage.createTask).toHaveBeenCalledWith(taskRequest, expect.any(String));
    });

    it('should handle tasks with config', async () => {
      const taskRequest = {
        type: 'github_url',
        url: 'https://github.com/test/repo.git',
        config: { timeout: 60000, maxTasks: 10 }
      };

      const mockTaskState = {
        id: 'config-task-id',
        input: taskRequest,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        analyzerProgress: { status: 'pending', progress: 0, currentStep: 'Waiting to start' },
        taskSolverProgress: { status: 'pending', progress: 0, totalTasks: 0, completedTasks: 0, failedTasks: 0 }
      };

      mockTaskStorage.createTask.mockResolvedValue(mockTaskState as any);
      mockTaskExecutor.executeTask.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/tasks')
        .send(taskRequest)
        .expect(201);

      expect(response.body.taskId).toBe('config-task-id');
      expect(mockTaskStorage.createTask).toHaveBeenCalledWith(taskRequest, expect.any(String));
    });

    it('should handle storage errors gracefully', async () => {
      const taskRequest = {
        type: 'github_url',
        url: 'https://github.com/test/repo.git'
      };

      mockTaskStorage.createTask.mockRejectedValue(new Error('Storage error'));

      const response = await request(app)
        .post('/api/tasks')
        .send(taskRequest)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
        message: 'Storage error'
      });
    });
  });

  describe('GET /api/tasks/:taskId/progress', () => {
    it('should return task progress from global state', async () => {
      const taskId = 'progress-task';
      const mockTaskState = {
        id: taskId,
        input: { type: 'github_url', url: 'https://github.com/test/repo.git' },
        status: 'analyzing',
        createdAt: new Date(),
        updatedAt: new Date(),
        analyzerProgress: {
          status: 'analyzing',
          progress: 45,
          currentStep: 'Analyzing codebase structure',
          totalSteps: 100
        },
        taskSolverProgress: {
          status: 'pending',
          progress: 0,
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0
        }
      };

      MockGlobalStateManager.get.mockReturnValue(mockTaskState);

      const response = await request(app)
        .get(`/api/tasks/${taskId}/progress`)
        .expect(200);

      expect(response.body).toEqual({
        taskId,
        status: 'analyzing',
        analyzerProgress: mockTaskState.analyzerProgress,
        taskSolverProgress: mockTaskState.taskSolverProgress,
        createdAt: mockTaskState.createdAt,
        updatedAt: mockTaskState.updatedAt
      });

      expect(MockGlobalStateManager.get).toHaveBeenCalledWith(`task:${taskId}`);
      expect(mockTaskStorage.loadTask).not.toHaveBeenCalled();
    });

    it('should fall back to storage when not in global state', async () => {
      const taskId = 'storage-progress-task';
      const mockTaskState = {
        id: taskId,
        input: { type: 'git_url', url: 'https://git.example.com/repo.git' },
        status: 'executing',
        createdAt: new Date(),
        updatedAt: new Date(),
        analyzerProgress: {
          status: 'completed',
          progress: 100,
          currentStep: 'Analysis completed'
        },
        taskSolverProgress: {
          status: 'executing',
          progress: 60,
          totalTasks: 10,
          completedTasks: 6,
          failedTasks: 0,
          currentTask: 'Processing task 7'
        }
      };

      MockGlobalStateManager.get.mockReturnValue(null);
      mockTaskStorage.loadTask.mockResolvedValue(mockTaskState as any);

      const response = await request(app)
        .get(`/api/tasks/${taskId}/progress`)
        .expect(200);

      expect(response.body.taskId).toBe(taskId);
      expect(response.body.status).toBe('executing');
      expect(mockTaskStorage.loadTask).toHaveBeenCalledWith(taskId);
    });

    it('should return 404 for non-existent tasks', async () => {
      const taskId = 'non-existent-task';

      MockGlobalStateManager.get.mockReturnValue(null);
      mockTaskStorage.loadTask.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/tasks/${taskId}/progress`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Task not found'
      });
    });

    it('should handle storage errors gracefully', async () => {
      const taskId = 'error-task';

      MockGlobalStateManager.get.mockReturnValue(null);
      mockTaskStorage.loadTask.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/tasks/${taskId}/progress`)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
        message: 'Database error'
      });
    });
  });

  describe('GET /api/tasks/:taskId/results', () => {
    it('should return task results for completed tasks', async () => {
      const taskId = 'completed-task';
      const mockTaskState = {
        id: taskId,
        status: 'completed',
        input: { type: 'github_url', url: 'https://github.com/test/repo.git' },
        createdAt: new Date(Date.now() - 60000),
        updatedAt: new Date(),
        tasks: [
          { title: 'Task 1', description: 'Description 1', priority: 1, ID: 'task-1' },
          { title: 'Task 2', description: 'Description 2', priority: 2, ID: 'task-2' }
        ],
        finalReport: {
          summary: 'All tasks completed successfully',
          totalTasks: 2,
          completedTasks: 2,
          failedTasks: 0,
          duration: 45000
        }
      };

      const mockReports = [
        {
          title: 'Task 1',
          description: 'Description 1',
          priority: 1,
          ID: 'task-1',
          status: 'success',
          report: 'Task completed successfully',
          completedAt: Date.now(),
          gitDiff: 'diff content'
        },
        {
          title: 'Task 2',
          description: 'Description 2',
          priority: 2,
          ID: 'task-2',
          status: 'success',
          report: 'Another task completed successfully',
          completedAt: Date.now()
        }
      ];

      mockTaskStorage.loadTask.mockResolvedValue(mockTaskState as any);
      mockTaskStorage.loadTaskReports.mockResolvedValue(mockReports);

      const response = await request(app)
        .get(`/api/tasks/${taskId}/results`)
        .expect(200);

      expect(response.body).toEqual({
        taskId,
        status: 'completed',
        tasks: mockTaskState.tasks,
        reports: mockReports,
        finalReport: mockTaskState.finalReport,
        createdAt: mockTaskState.createdAt,
        completedAt: expect.any(Date)
      });
    });

    it('should return 400 for non-completed tasks', async () => {
      const taskId = 'pending-task';
      const mockTaskState = {
        id: taskId,
        status: 'analyzing',
        input: { type: 'github_url', url: 'https://github.com/test/repo.git' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockTaskStorage.loadTask.mockResolvedValue(mockTaskState as any);

      const response = await request(app)
        .get(`/api/tasks/${taskId}/results`)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Task not completed',
        currentStatus: 'analyzing',
        message: 'Results are only available for completed tasks'
      });
    });

    it('should return 404 for non-existent tasks', async () => {
      const taskId = 'non-existent-task';

      mockTaskStorage.loadTask.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/tasks/${taskId}/results`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Task not found'
      });
    });

    it('should handle missing reports gracefully', async () => {
      const taskId = 'no-reports-task';
      const mockTaskState = {
        id: taskId,
        status: 'completed',
        input: { type: 'github_url', url: 'https://github.com/test/repo.git' },
        createdAt: new Date(),
        updatedAt: new Date(),
        tasks: [],
        finalReport: null
      };

      mockTaskStorage.loadTask.mockResolvedValue(mockTaskState as any);
      mockTaskStorage.loadTaskReports.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/tasks/${taskId}/results`)
        .expect(200);

      expect(response.body.reports).toEqual([]);
    });
  });

  describe('GET /api/tasks', () => {
    it('should return task history with default pagination', async () => {
      const mockHistory = {
        tasks: [
          {
            id: 'task-1',
            type: 'github_url',
            url: 'https://github.com/repo1.git',
            status: 'completed',
            createdAt: new Date(Date.now() - 1000),
            completedAt: new Date(),
            summary: 'Task completed successfully'
          },
          {
            id: 'task-2',
            type: 'git_url',
            url: 'https://git.example.com/repo2.git',
            status: 'failed',
            createdAt: new Date(Date.now() - 2000),
            summary: undefined
          }
        ],
        totalCount: 2
      };

      mockTaskStorage.getTaskHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(response.body).toEqual(mockHistory);
      expect(mockTaskStorage.getTaskHistory).toHaveBeenCalledWith({ limit: 10, offset: 0 });
    });

    it('should handle custom pagination parameters', async () => {
      const mockHistory = {
        tasks: [
          {
            id: 'task-3',
            type: 'local_path',
            url: '/path/to/repo3',
            status: 'analyzing',
            createdAt: new Date(),
            summary: undefined
          }
        ],
        totalCount: 5
      };

      mockTaskStorage.getTaskHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/tasks?limit=5&offset=2')
        .expect(200);

      expect(response.body).toEqual(mockHistory);
      expect(mockTaskStorage.getTaskHistory).toHaveBeenCalledWith({ limit: 5, offset: 2 });
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/tasks?limit=101')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Limit cannot exceed 100'
      });
    });

    it('should return 400 for invalid limit (less than 1)', async () => {
      const response = await request(app)
        .get('/api/tasks?limit=0')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Limit must be at least 1'
      });
    });

    it('should return 400 for invalid offset', async () => {
      const response = await request(app)
        .get('/api/tasks?offset=-1')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Offset cannot be negative'
      });
    });

    it('should handle storage errors gracefully', async () => {
      mockTaskStorage.getTaskHistory.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/tasks')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
        message: 'Database connection failed'
      });
    });
  });

  describe('DELETE /api/tasks/:taskId', () => {
    it('should delete a completed task', async () => {
      const taskId = 'completed-task-to-delete';

      mockTaskExecutor.isTaskRunning.mockReturnValue(false);
      mockTaskStorage.deleteTask.mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Task deleted successfully',
        taskId
      });

      expect(mockTaskExecutor.isTaskRunning).toHaveBeenCalledWith(taskId);
      expect(mockTaskStorage.deleteTask).toHaveBeenCalledWith(taskId);
      expect(MockGlobalStateManager.delete).toHaveBeenCalledTimes(4); // task:*, task:*:status, task:*:analyzer, task:*:solver
    });

    it('should delete a failed task', async () => {
      const taskId = 'failed-task-to-delete';

      mockTaskExecutor.isTaskRunning.mockReturnValue(false);
      mockTaskStorage.deleteTask.mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .expect(200);

      expect(response.body.message).toBe('Task deleted successfully');
    });

    it('should return 400 when trying to delete a running task', async () => {
      const taskId = 'running-task';

      mockTaskExecutor.isTaskRunning.mockReturnValue(true);

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Cannot delete running task',
        message: 'Task must be completed or failed before it can be deleted'
      });

      expect(mockTaskStorage.deleteTask).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent tasks', async () => {
      const taskId = 'non-existent-task';

      mockTaskExecutor.isTaskRunning.mockReturnValue(false);
      mockTaskStorage.deleteTask.mockResolvedValue(false);

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Task not found'
      });
    });

    it('should handle storage errors gracefully', async () => {
      const taskId = 'error-task';

      mockTaskExecutor.isTaskRunning.mockReturnValue(false);
      mockTaskStorage.deleteTask.mockRejectedValue(new Error('Storage error'));

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
        message: 'Storage error'
      });
    });
  });

  describe('GET /api/tasks/:taskId', () => {
    it('should return detailed task information', async () => {
      const taskId = 'detailed-task';
      const mockTaskState = {
        id: taskId,
        input: { type: 'github_url', url: 'https://github.com/test/repo.git', config: { timeout: 30000 } },
        status: 'executing',
        createdAt: new Date(Date.now() - 300000),
        updatedAt: new Date(),
        analyzerProgress: {
          status: 'completed',
          progress: 100,
          currentStep: 'Analysis completed'
        },
        taskSolverProgress: {
          status: 'executing',
          progress: 50,
          totalTasks: 8,
          completedTasks: 4,
          failedTasks: 0,
          currentTask: 'Processing task 5'
        },
        tasks: [
          { title: 'Task 1', description: 'Description 1', priority: 1, ID: 'task-1' }
        ]
      };

      mockTaskStorage.loadTask.mockResolvedValue(mockTaskState as any);

      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .expect(200);

      expect(response.body).toEqual(mockTaskState);
    });

    it('should return 404 for non-existent tasks', async () => {
      const taskId = 'non-existent-detailed-task';

      mockTaskStorage.loadTask.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Task not found'
      });
    });
  });

  describe('GET /api/tasks/:taskId/status', () => {
    it('should return task status from global state', async () => {
      const taskId = 'status-task';
      const status = 'executing';

      MockGlobalStateManager.get.mockReturnValue(status);
      mockTaskExecutor.isTaskRunning.mockReturnValue(true);

      const response = await request(app)
        .get(`/api/tasks/${taskId}/status`)
        .expect(200);

      expect(response.body).toEqual({
        taskId,
        status,
        isRunning: true
      });

      expect(MockGlobalStateManager.get).toHaveBeenCalledWith(`task:${taskId}:status`);
      expect(mockTaskStorage.loadTask).not.toHaveBeenCalled();
    });

    it('should fall back to storage when not in global state', async () => {
      const taskId = 'storage-status-task';
      const mockTaskState = {
        id: taskId,
        status: 'completed',
        input: { type: 'github_url', url: 'https://github.com/test/repo.git' }
      };

      MockGlobalStateManager.get.mockReturnValue(null);
      mockTaskStorage.loadTask.mockResolvedValue(mockTaskState as any);
      mockTaskExecutor.isTaskRunning.mockReturnValue(false);

      const response = await request(app)
        .get(`/api/tasks/${taskId}/status`)
        .expect(200);

      expect(response.body).toEqual({
        taskId,
        status: 'completed',
        isRunning: false
      });

      expect(MockGlobalStateManager.get).toHaveBeenCalledWith(`task:${taskId}:status`);
      expect(mockTaskStorage.loadTask).toHaveBeenCalledWith(taskId);
      expect(MockGlobalStateManager.set).toHaveBeenCalledWith(`task:${taskId}:status`, 'completed');
    });

    it('should return 404 for non-existent tasks', async () => {
      const taskId = 'non-existent-status-task';

      MockGlobalStateManager.get.mockReturnValue(null);
      mockTaskStorage.loadTask.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/tasks/${taskId}/status`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Task not found'
      });
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle very large request bodies', async () => {
      const largeConfig = { data: 'x'.repeat(100000) }; // 100KB
      const taskRequest = {
        type: 'github_url',
        url: 'https://github.com/test/repo.git',
        config: largeConfig
      };

      // This should work with the 10MB limit
      const response = await request(app)
        .post('/api/tasks')
        .send(taskRequest)
        .expect(500); // Will fail due to mocks, but should not be due to size

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('Middleware integration', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/tasks/non-existent')
        .expect(404);

      // Check for common security headers (helmet middleware)
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should handle CORS headers', async () => {
      const response = await request(app)
        .options('/api/tasks')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should compress responses for large data', async () => {
      const largeHistory = {
        tasks: Array.from({ length: 100 }, (_, i) => ({
          id: `task-${i}`,
          type: 'github_url',
          url: `https://github.com/repo${i}.git`,
          status: 'completed',
          createdAt: new Date(),
          summary: `Large summary data ${i}: ${'x'.repeat(1000)}`
        })),
        totalCount: 100
      };

      mockTaskStorage.getTaskHistory.mockResolvedValue(largeHistory);

      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      // Check for compression header
      expect(response.headers['content-encoding']).toBeDefined();
    });
  });
});