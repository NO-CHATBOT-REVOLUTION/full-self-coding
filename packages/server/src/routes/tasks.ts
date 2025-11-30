import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TaskExecutor } from '../utils/taskExecutor.js';
import { TaskStorage } from '../storage/taskStorage.js';
import { globalStateManager } from '../utils/globalStateManager.js';
import type {
  CreateTaskRequest,
  CreateTaskResponse,
  TaskProgressResponse,
  TaskResultsResponse,
  TaskHistoryResponse,
  ErrorResponse
} from '../types/index.js';
import { TaskStatus } from '../types/index.js';

const router = Router();
const taskExecutor = new TaskExecutor();
const taskStorage = new TaskStorage();

/**
 * POST /api/tasks
 * Submit a new full self coding task
 */
router.post('/', async (req, res) => {
  try {
    const { type, url, config } = req.body;

    // Validate request
    if (!type || !url) {
      const errorResponse: ErrorResponse = {
        error: 'Missing required fields: type and url'
      };
      return res.status(400).json(errorResponse);
    }

    // Validate type
    if (!['github_url', 'git_url', 'local_path'].includes(type)) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid type. Must be one of: github_url, git_url, local_path'
      };
      return res.status(400).json(errorResponse);
    }

    // Generate task ID
    const taskId = uuidv4();

    // Create task in storage
    const taskState = await taskStorage.createTask(
      { type, url, config },
      taskId
    );

    // Store in global state for quick access
    globalStateManager.set(`task:${taskId}`, taskState, {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      metadata: { type: 'task', status: taskState.status }
    });

    // Start execution in background
    taskExecutor.executeTask(taskId).catch(error => {
      console.error(`Failed to start task ${taskId}:`, error);
    });

    res.status(201).json({
      taskId,
      status: taskState.status,
      message: 'Task created successfully and started processing'
    });

  } catch (error) {
    console.error('Error creating task:', error);
    const errorResponse: ErrorResponse = {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /api/tasks/:taskId/progress
 * Get current progress of a task
 */
router.get('/:taskId/progress', async (req, res) => {
  try {
    const { taskId } = req.params;

    // Try to get from global state first (faster)
    let taskState = globalStateManager.get(`task:${taskId}`);

    // If not in global state, try storage
    if (!taskState) {
      taskState = await taskStorage.loadTask(taskId);
    }

    if (!taskState) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    const response: TaskProgressResponse = {
      taskId: taskState.id,
      status: taskState.status,
      analyzerProgress: taskState.analyzerProgress,
      taskSolverProgress: taskState.taskSolverProgress,
      createdAt: taskState.createdAt,
      updatedAt: taskState.updatedAt
    };

    res.json(response);

  } catch (error) {
    console.error('Error getting task progress:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/tasks/:taskId/results
 * Get final results of a completed task
 */
router.get('/:taskId/results', async (req, res) => {
  try {
    const { taskId } = req.params;

    // Load task from storage (must get full data for results)
    const taskState = await taskStorage.loadTask(taskId);

    if (!taskState) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    // Check if task is completed
    if (taskState.status !== TaskStatus.COMPLETED) {
      return res.status(400).json({
        error: 'Task not completed',
        currentStatus: taskState.status,
        message: 'Results are only available for completed tasks'
      });
    }

    // Load reports from storage
    const reports = await taskStorage.loadTaskReports(taskId) || [];

    const response: TaskResultsResponse = {
      taskId: taskState.id,
      status: taskState.status,
      tasks: taskState.tasks || [],
      reports,
      finalReport: taskState.finalReport,
      createdAt: taskState.createdAt,
      completedAt: taskState.finalReport ? new Date(taskState.updatedAt) : undefined
    };

    res.json(response);

  } catch (error) {
    console.error('Error getting task results:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/tasks
 * Get task history
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    // Validate query parameters
    if (limit > 100) {
      return res.status(400).json({
        error: 'Limit cannot exceed 100'
      });
    }

    if (limit < 1) {
      return res.status(400).json({
        error: 'Limit must be at least 1'
      });
    }

    if (offset < 0) {
      return res.status(400).json({
        error: 'Offset cannot be negative'
      });
    }

    const history = await taskStorage.getTaskHistory({ limit, offset });

    const response: TaskHistoryResponse = {
      tasks: history.tasks.map(task => ({
        id: task.id,
        type: task.type,
        url: task.url,
        status: task.status,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        summary: task.summary
      })),
      totalCount: history.totalCount
    };

    res.json(response);

  } catch (error) {
    console.error('Error getting task history:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/tasks/:taskId
 * Delete a task and its data
 */
router.delete('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    // Check if task is running
    if (taskExecutor.isTaskRunning(taskId)) {
      return res.status(400).json({
        error: 'Cannot delete running task',
        message: 'Task must be completed or failed before it can be deleted'
      });
    }

    // Delete from storage
    const deleted = await taskStorage.deleteTask(taskId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    // Remove from global state
    globalStateManager.delete(`task:${taskId}`);
    globalStateManager.delete(`task:${taskId}:status`);
    globalStateManager.delete(`task:${taskId}:analyzer`);
    globalStateManager.delete(`task:${taskId}:solver`);

    res.json({
      message: 'Task deleted successfully',
      taskId
    });

  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/tasks/:taskId
 * Get detailed information about a specific task
 */
router.get('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    // Load task from storage
    const taskState = await taskStorage.loadTask(taskId);

    if (!taskState) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    res.json(taskState);

  } catch (error) {
    console.error('Error getting task details:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/tasks/:taskId/status
 * Get only the status of a task (lightweight endpoint)
 */
router.get('/:taskId/status', async (req, res) => {
  try {
    const { taskId } = req.params;

    // Try global state first (faster)
    let status = globalStateManager.get(`task:${taskId}:status`);

    // If not in global state, check storage
    if (!status) {
      const taskState = await taskStorage.loadTask(taskId);
      if (taskState) {
        status = taskState.status;
        // Cache in global state
        globalStateManager.set(`task:${taskId}:status`, status);
      }
    }

    if (!status) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    res.json({
      taskId,
      status,
      isRunning: taskExecutor.isTaskRunning(taskId)
    });

  } catch (error) {
    console.error('Error getting task status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;