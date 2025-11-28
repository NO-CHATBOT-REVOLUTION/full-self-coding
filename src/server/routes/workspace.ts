import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { serverState, createResponse } from '../utils';
import type { WorkspaceProject } from '../types';

const router = Router();

/**
 * Clean up workspace by removing old cloned repositories
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const { olderThanDays = 7 } = req.body;
    const workspaceDir = path.join(process.cwd(), 'workspace');

    if (!fs.existsSync(workspaceDir)) {
      return res.json(createResponse(true, { message: 'Workspace directory does not exist', cleaned: 0 }));
    }

    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    const entries = await fs.promises.readdir(workspaceDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const entryPath = path.join(workspaceDir, entry.name);
        try {
          const stats = await fs.promises.stat(entryPath);

          if (stats.mtime.getTime() < cutoffTime) {
            await fs.promises.rm(entryPath, { recursive: true, force: true });
            cleanedCount++;
            console.log(`Cleaned up old workspace: ${entry.name}`);
          }
        } catch (error) {
          console.warn(`Failed to clean up ${entry.name}:`, error);
        }
      }
    }

    res.json(createResponse(true, {
      message: `Workspace cleanup completed`,
      cleaned: cleanedCount,
      olderThanDays
    }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * List workspace directories
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const workspaceDir = path.join(process.cwd(), 'workspace');

    if (!fs.existsSync(workspaceDir)) {
      return res.json(createResponse(true, { workspaceDir, projects: [], count: 0 }));
    }

    const entries = await fs.promises.readdir(workspaceDir, { withFileTypes: true });
    const projects: WorkspaceProject[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const entryPath = path.join(workspaceDir, entry.name);
        try {
          const stats = await fs.promises.stat(entryPath);

          projects.push({
            name: entry.name,
            path: entryPath,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            size: stats.size
          });
        } catch (error) {
          console.warn(`Failed to read stats for ${entry.name}:`, error);
        }
      }
    }

    projects.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

    res.json(createResponse(true, {
      workspaceDir,
      projects,
      count: projects.length
    }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

export default router;