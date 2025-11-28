import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { serverState, createResponse, sanitizePath, generateTaskId, validateGitUrl, extractProjectNameFromUrl } from '../utils';
import analyzeCodebase from '../../analyzer';
import { readConfigWithEnv } from '../../configReader';
import { getGitRemoteUrls } from '../../utils/git';
import { TaskSolverManager } from '../../taskSolverManager';
import type { ServerTask } from '../types';

const router = Router();

/**
 * Start a task for a given directory
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { directory } = req.body;

    if (!directory) {
      return res.status(400).json(createResponse(false, null, 'Directory path is required'));
    }

    const sanitizedDir = sanitizePath(directory);
    const fullPath = path.resolve(sanitizedDir);

    // Check if directory exists
    try {
      const stats = await fs.promises.stat(fullPath);
      if (!stats.isDirectory()) {
        return res.status(400).json(createResponse(false, null, 'Path is not a directory'));
      }
    } catch {
      return res.status(400).json(createResponse(false, null, 'Directory does not exist'));
    }

    // Create task
    const taskId = generateTaskId();
    const task: ServerTask = {
      id: taskId,
      directory: sanitizedDir,
      status: 'pending',
      progress: 0,
      startedAt: new Date()
    };

    serverState.tasks.set(taskId, task);

    // Start analysis in background
    setTimeout(async () => {
      try {
        task.status = 'analyzing';
        task.progress = 10;

        // Load configuration
        const config = readConfigWithEnv();
        const { fetchUrl } = await getGitRemoteUrls(config.useGithubSSH);
        const gitRemoteUrl = fetchUrl || '';

        // Analyze codebase
        task.progress = 30;
        const tasks = await analyzeCodebase(config, gitRemoteUrl);

        task.status = 'analyzed';
        task.tasks = tasks;
        task.analysis = { taskCount: tasks.length, directory: sanitizedDir };
        task.progress = 50;

        serverState.tasks.set(taskId, task);

        // Auto-start task solver manager if not already running
        if (serverState.taskSolverManager.status === 'idle') {
          await startTaskSolverManager(taskId, tasks, config, gitRemoteUrl);
        }

      } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : 'Unknown error';
        task.completedAt = new Date();
        serverState.tasks.set(taskId, task);
      }
    }, 100);

    res.json(createResponse(true, { taskId, status: 'pending' }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Start a task for a remote git repository
 */
router.post('/start-remote', async (req: Request, res: Response) => {
  try {
    const { gitRemoteUrl, projectName } = req.body;

    if (!gitRemoteUrl) {
      return res.status(400).json(createResponse(false, null, 'Git remote URL is required'));
    }

    // Validate git URL format
    if (!validateGitUrl(gitRemoteUrl)) {
      return res.status(400).json(createResponse(false, null, 'Invalid git repository URL format'));
    }

    // Create workspace directory
    const workspaceDir = path.join(process.cwd(), 'workspace');
    if (!fs.existsSync(workspaceDir)) {
      await fs.promises.mkdir(workspaceDir, { recursive: true });
    }

    // Generate project name from URL if not provided
    const finalProjectName = projectName || extractProjectNameFromUrl(gitRemoteUrl);
    const projectDir = path.join(workspaceDir, `${finalProjectName}-${Date.now()}`);

    // Create task
    const taskId = generateTaskId();
    const task: ServerTask = {
      id: taskId,
      directory: projectDir,
      status: 'pending',
      progress: 0,
      startedAt: new Date()
    };

    serverState.tasks.set(taskId, task);

    // Start cloning and analysis in background
    setTimeout(async () => {
      try {
        task.status = 'analyzing';
        task.progress = 5;

        // Clone the repository
        task.progress = 10;
        const { execSync } = await import('child_process');

        try {
          execSync(`git clone "${gitRemoteUrl}" "${projectDir}"`, {
            stdio: 'pipe',
            timeout: 300000 // 5 minutes timeout
          });
          task.progress = 25;
        } catch (error) {
          throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Load configuration
        const config = readConfigWithEnv();

        // Analyze codebase with the remote URL
        task.progress = 30;
        const tasks = await analyzeCodebase(config, gitRemoteUrl, true);

        task.status = 'analyzed';
        task.tasks = tasks;
        task.analysis = {
          taskCount: tasks.length,
          directory: projectDir,
          gitRemoteUrl,
          projectName: finalProjectName,
          type: 'remote'
        };
        task.progress = 50;

        serverState.tasks.set(taskId, task);

        // Auto-start task solver manager if not already running
        if (serverState.taskSolverManager.status === 'idle') {
          await startTaskSolverManager(taskId, tasks, config, gitRemoteUrl);
        }

      } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : 'Unknown error';
        task.completedAt = new Date();

        // Clean up directory if it exists and failed
        try {
          await fs.promises.rm(projectDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }

        serverState.tasks.set(taskId, task);
      }
    }, 100);

    res.json(createResponse(true, {
      taskId,
      status: 'pending',
      gitRemoteUrl,
      projectName: finalProjectName,
      workspaceDir: projectDir
    }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get task status and progress
 */
router.get('/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = serverState.tasks.get(taskId);

    if (!task) {
      return res.status(404).json(createResponse(false, null, 'Task not found'));
    }

    res.json(createResponse(true, task));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get all tasks
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const tasks = Array.from(serverState.tasks.values());
    res.json(createResponse(true, { tasks, count: tasks.length }));

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