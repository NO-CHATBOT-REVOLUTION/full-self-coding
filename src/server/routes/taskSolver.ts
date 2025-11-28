import { Router, Request, Response } from 'express';
import { serverState, createResponse } from '../utils';
import { TaskSolverManager } from '../../taskSolverManager';
import { readConfigWithEnv } from '../../configReader';
import { getGitRemoteUrls } from '../../utils/git';

const router = Router();

/**
 * Start task solver manager
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { taskId, tasks } = req.body;

    if (serverState.taskSolverManager.status !== 'idle') {
      return res.status(400).json(createResponse(false, null, 'Task solver manager is already running'));
    }

    if (!taskId || !tasks) {
      return res.status(400).json(createResponse(false, null, 'Task ID and tasks are required'));
    }

    const config = readConfigWithEnv();
    const { fetchUrl } = await getGitRemoteUrls(config.useGithubSSH);
    const gitRemoteUrl = fetchUrl || '';

    await startTaskSolverManager(taskId, tasks, config, gitRemoteUrl);

    res.json(createResponse(true, { taskId, status: 'running' }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Monitor task solver manager progress
 */
router.get('/progress', (req: Request, res: Response) => {
  try {
    const response = {
      ...serverState.taskSolverManager,
      currentTaskCount: serverState.tasks.size,
      tasks: Array.from(serverState.tasks.values()).map(task => ({
        id: task.id,
        directory: task.directory,
        status: task.status,
        progress: task.progress
      }))
    };

    res.json(createResponse(true, response));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get final report of task solver manager
 */
router.get('/report', (req: Request, res: Response) => {
  try {
    if (serverState.taskSolverManager.status !== 'completed') {
      return res.status(400).json(createResponse(false, null, 'Task solver manager has not completed execution'));
    }

    res.json(createResponse(true, serverState.taskSolverManager.reports));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get task solver manager status
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    res.json(createResponse(true, serverState.taskSolverManager));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Stop task solver manager
 */
router.post('/stop', (req: Request, res: Response) => {
  try {
    if (serverState.taskSolverManager.status !== 'running') {
      return res.status(400).json(createResponse(false, null, 'Task solver manager is not currently running'));
    }

    const manager = serverState.taskSolverManager.manager;
    if (manager && typeof manager.stop === 'function') {
      manager.stop();
    }

    const previousStatus = serverState.taskSolverManager.status;
    serverState.taskSolverManager = {
      ...serverState.taskSolverManager,
      status: 'stopped',
      completedAt: new Date()
    };

    res.json(createResponse(true, { previousStatus, currentStatus: 'stopped' }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

// Helper function to start task solver manager
async function startTaskSolverManager(taskId: string, tasks: any[], config: any, gitRemoteUrl: string) {
  try {
    serverState.taskSolverManager = {
      status: 'running',
      taskId,
      manager: null,
      progress: 0,
      startedAt: new Date()
    };

    const taskSolverManager = new TaskSolverManager(config, gitRemoteUrl);

    // Add tasks to manager
    for (const task of tasks) {
      taskSolverManager.addTask(task);
    }

    serverState.taskSolverManager.manager = taskSolverManager;

    // Start manager in background
    setTimeout(async () => {
      try {
        await taskSolverManager.start();

        const reports = taskSolverManager.getReports();

        serverState.taskSolverManager = {
          status: 'completed',
          taskId,
          manager: null,
          progress: 100,
          reports,
          completedAt: new Date()
        };

        // Update task status
        const task = serverState.tasks.get(taskId);
        if (task) {
          task.status = 'completed';
          task.reports = reports;
          task.completedAt = new Date();
          serverState.tasks.set(taskId, task);
        }

      } catch (error) {
        serverState.taskSolverManager = {
          status: 'error',
          taskId,
          manager: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        };

        // Update task status
        const task = serverState.tasks.get(taskId);
        if (task) {
          task.status = 'failed';
          task.error = error instanceof Error ? error.message : 'Unknown error';
          task.completedAt = new Date();
          serverState.tasks.set(taskId, task);
        }
      }
    }, 100);

  } catch (error) {
    serverState.taskSolverManager = {
      status: 'error',
      taskId,
      manager: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date()
    };
  }
}

export default router;