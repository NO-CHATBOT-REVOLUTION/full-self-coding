import type { ServerState, ApiResponse } from './types';
import { randomUUID } from 'crypto';

// Global state for the server
export const serverState: ServerState = {
  codeAnalyzer: { status: 'idle' },
  taskSolverManager: { status: 'idle' },
  githubAnalyzer: { status: 'idle' },
  tasks: new Map()
};

export function createResponse(success: boolean, data: any = null, error: string = null): ApiResponse {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString()
  };
}

export function sanitizePath(inputPath: string): string {
  // Basic path sanitization to prevent directory traversal
  // Remove .. sequences but keep absolute paths intact
  return inputPath.replace(/\.\./g, '');
}

export function generateTaskId(): string {
  return randomUUID();
}

export function validateGitUrl(gitRemoteUrl: string): boolean {
  const gitUrlPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+(\.git)?$/;
  const sshUrlPattern = /^git@github\.com:[^\/]+\/[^\/]+(\.git)?$/;
  return gitUrlPattern.test(gitRemoteUrl) || sshUrlPattern.test(gitRemoteUrl);
}

export function extractProjectNameFromUrl(gitRemoteUrl: string): string {
  return gitRemoteUrl.split('/').pop()?.replace('.git', '') || 'repo';
}