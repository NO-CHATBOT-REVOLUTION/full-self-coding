import { TaskStatus, type Task, type TaskResult } from './task';
import { TaskSolver } from './taskSolver';
import type { Config } from './config';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ANSI color codes for beautiful terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};


export interface GitStateOptions {
  autoStash?: boolean;
  autoCommit?: boolean;
  ignoreUntracked?: boolean;
  backupBranch?: string;
}

export class CodeCommitter {
  private taskResults: TaskResult[];
  private originalGitNode: string;
  private gitRepoPath: string;
  private gitStateOptions: GitStateOptions;
  private stashedChanges: boolean = false;

  constructor(taskResults: TaskResult[], gitRepoPath: string = '.', gitStateOptions: GitStateOptions = {}) {
    this.taskResults = taskResults;
    this.gitRepoPath = gitRepoPath;
    this.gitStateOptions = {
      autoStash: false,
      autoCommit: false,
      ignoreUntracked: false,
      backupBranch: undefined,
      ...gitStateOptions
    };
    this.originalGitNode = this.getCurrentGitNode();
  }

  /**
   * Get the current git commit hash (HEAD)
   */
  private getCurrentGitNode(): string {
    try {
      return execSync('git rev-parse HEAD', {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      }).trim();
    } catch (error) {
      throw new Error(`Failed to get current git node: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new branch from the original git node
   */
  private createTaskBranch(taskResult: TaskResult): string {
    const branchName = `task-${taskResult.ID}-${Date.now()}`;

    try {
      // Ensure we're on the original node first
      execSync(`git checkout ${this.originalGitNode}`, {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      });

      // Create and checkout new branch
      execSync(`git checkout -b ${branchName}`, {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      });

      return branchName;
    } catch (error) {
      throw new Error(`Failed to create branch ${branchName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Apply git diff content to the working directory
   */
  private async applyGitDiff(gitDiff: string): Promise<void> {
    if (!gitDiff || gitDiff.trim() === '') {
      console.warn('Empty git diff provided, skipping application');
      return;
    }

    try {
      // Create a temporary file for the diff
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-diff-'));
      const diffFile = path.join(tempDir, 'changes.patch');

      try {
        // Write diff to temporary file
        fs.writeFileSync(diffFile, gitDiff, 'utf8');

        // Apply the diff using git apply
        execSync(`git apply --whitespace=fix "${diffFile}"`, {
          cwd: this.gitRepoPath,
          encoding: 'utf8'
        });

        //console.log('Successfully applied git diff');
      } finally {
        // Clean up temporary file
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      throw new Error(`Failed to apply git diff: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Commit the applied changes with a descriptive message
   */
  private commitChanges(taskResult: TaskResult): void {
    try {
      // Add all changes to staging
      execSync('git add -A', {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      });

      // Create commit message
      const commitMessage = this.createCommitMessage(taskResult);

      // Commit the changes
      execSync(`git commit -m "${commitMessage}"`, {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      });

      console.log(`Successfully committed changes for task ${taskResult.ID}`);
    } catch (error) {
      throw new Error(`Failed to commit changes for task ${taskResult.ID}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a descriptive commit message based on the task result
   */
  private createCommitMessage(taskResult: TaskResult): string {
    const status = taskResult.status === TaskStatus.SUCCESS ? '✓' : '✗';
    const title = taskResult.title.replace(/"/g, '\\"'); // Escape quotes
    const report = taskResult.report.replace(/"/g, '\\"'); // Escape quotes

    return `${status} Task ${taskResult.ID}: ${title}

Task Description: ${taskResult.description}

Report: ${report}

Status: ${taskResult.status}
Completed: ${taskResult.completedAt ? new Date(taskResult.completedAt).toISOString() : 'N/A'}`;
  }

  /**
   * Switch back to the original git node and ensure working directory is clean
   */
  private returnToOriginalNode(): void {
    try {
      // First, switch to the original commit
      execSync(`git checkout ${this.originalGitNode}`, {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      });
      //console.log(`Returned to original git node: ${this.originalGitNode}`);

      // Clean up any leftover working directory changes
      this.cleanWorkingDirectory();

    } catch (error) {
      throw new Error(`Failed to return to original git node ${this.originalGitNode}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean the working directory by discarding all changes
   */
  private cleanWorkingDirectory(): void {
    try {
      // Reset all staged and unstaged changes
      execSync('git reset --hard HEAD', {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      });

      // Clean untracked files and directories
      execSync('git clean -fd', {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      });

      //console.log('Working directory cleaned - all changes discarded');
    } catch (error) {
      console.warn(`Warning: Could not clean working directory: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw an error for cleanup failures, just log it
    }
  }

  /**
   * Check if git repository is in a clean state
   */
  private isGitRepoClean(): boolean {
    try {
      const status = execSync('git status --porcelain', {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      }).trim();

      if (this.gitStateOptions.ignoreUntracked) {
        // Ignore untracked files (??), only check for modifications and deletions
        const lines = status.split('\n').filter(line => line.trim());
        const trackedChanges = lines.filter(line => !line.startsWith('??'));
        return trackedChanges.length === 0;
      }

      return status === '';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get detailed git status information
   */
  private getGitStatusInfo(): { modified: string[], untracked: string[], staged: string[] } {
    try {
      const status = execSync('git status --porcelain', {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      }).trim();

      const lines = status.split('\n').filter(line => line.trim());
      const modified: string[] = [];
      const untracked: string[] = [];
      const staged: string[] = [];

      for (const line of lines) {
        const statusCode = line.substring(0, 2);
        const filePath = line.substring(3);

        if (statusCode.startsWith('??')) {
          untracked.push(filePath);
        } else if (statusCode.includes('M') || statusCode.includes('D') || statusCode.includes('A')) {
          staged.push(filePath);
        } else {
          modified.push(filePath);
        }
      }

      return { modified, untracked, staged };
    } catch (error) {
      return { modified: [], untracked: [], staged: [] };
    }
  }

  /**
   * Create backup branch before modifying Git state
   */
  private createBackupBranch(): string | null {
    if (!this.gitStateOptions.backupBranch) {
      return null;
    }

    try {
      const timestamp = Date.now();
      const backupBranchName = `${this.gitStateOptions.backupBranch}-${timestamp}`;

      execSync(`git checkout -b ${backupBranchName}`, {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      });

      execSync(`git checkout ${this.originalGitNode}`, {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      });

      //console.log(`Created backup branch: ${backupBranchName}`);
      return backupBranchName;
    } catch (error) {
      console.warn(`Failed to create backup branch: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Automatically commit current changes
   */
  private autoCommitChanges(): boolean {
    try {
      const status = execSync('git status --porcelain', {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      }).trim();

      if (!status) {
        return true; // Nothing to commit
      }

      // Add all changes
      execSync('git add -A', {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      });

      // Create commit
      const timestamp = new Date().toISOString();
      execSync(`git commit -m "Auto-commit before CodeCommitter - ${timestamp}"`, {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      });

      //console.log('Auto-committed existing changes');
      return true;
    } catch (error) {
      console.error(`Failed to auto-commit changes: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Stash current changes
   */
  private stashChanges(): boolean {
    try {
      // Stash with a descriptive message
      const timestamp = new Date().toISOString();
      execSync(`git stash push -m "CodeCommitter auto-stash - ${timestamp}"`, {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      });

      this.stashedChanges = true;
      //console.log('Stashed existing changes');
      return true;
    } catch (error) {
      console.error(`Failed to stash changes: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Restore stashed changes
   */
  private restoreStashedChanges(): boolean {
    if (!this.stashedChanges) {
      return true;
    }

    try {
      execSync('git stash pop', {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      });

      this.stashedChanges = false;
      //console.log('Restored stashed changes');
      return true;
    } catch (error) {
      console.error(`Failed to restore stashed changes: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Handle dirty Git repository based on options
   */
  private async handleDirtyGitRepo(): Promise<{ success: boolean; action?: string; error?: string }> {
    const statusInfo = this.getGitStatusInfo();

    // console.log(`Git repository is not clean:`);
    // if (statusInfo.modified.length > 0) {
    //   console.log(`  Modified files: ${statusInfo.modified.join(', ')}`);
    // }
    // if (statusInfo.untracked.length > 0) {
    //   console.log(`  Untracked files: ${statusInfo.untracked.join(', ')}`);
    // }
    // if (statusInfo.staged.length > 0) {
    //   console.log(`  Staged files: ${statusInfo.staged.join(', ')}`);
    // }

    // Create backup branch if specified
    const backupBranch = this.createBackupBranch();

    // Try different cleanup strategies based on options
    if (this.gitStateOptions.autoStash) {
      //console.log('Attempting to stash changes...');
      if (this.stashChanges()) {
        return { success: true, action: 'stash' };
      }
    }

    if (this.gitStateOptions.autoCommit) {
      //console.log('Attempting to auto-commit changes...');
      if (this.autoCommitChanges()) {
        return { success: true, action: 'commit' };
      }
    }

    // If we got here, automatic handling failed or wasn't enabled
    const errorMessage = `Git repository is not in a clean state. Please commit or stash changes before running CodeCommitter.

Options:
1. Commit your changes: git add -A && git commit -m "WIP: save progress"
2. Stash your changes: git stash push -m "WIP: save progress"
3. Enable auto-handling:
   - Auto-stash: new CodeCommitter(tasks, '.', { autoStash: true })
   - Auto-commit: new CodeCommitter(tasks, '.', { autoCommit: true })
   - Backup branch: new CodeCommitter(tasks, '.', { backupBranch: 'codecommitter-backup' })
4. Ignore untracked files: new CodeCommitter(tasks, '.', { ignoreUntracked: true })

${backupBranch ? `Backup branch created: ${backupBranch}` : ''}`;

    return { success: false, action: undefined, error: errorMessage };
  }

  /**
   * Validate task result before processing
   */
  private validateTaskResult(taskResult: TaskResult): void {
    if (!taskResult.ID) {
      throw new Error('Task result missing ID');
    }

    if (!taskResult.title) {
      throw new Error('Task result missing title');
    }

    if (!taskResult.status) {
      throw new Error('Task result missing status');
    }
  }

  /**
   * Process a single task result: create branch, apply diff, commit, return to original node
   */
  private async processTaskResult(taskResult: TaskResult): Promise<{ success: boolean; branchName: string; error?: string }> {
    const result = {
      success: false,
      branchName: '',
      error: undefined as string | undefined
    };

    try {
      // Validate task result
      this.validateTaskResult(taskResult);

      // Skip if no git diff to apply
      if (!taskResult.gitDiff || taskResult.gitDiff.trim() === '') {
        console.log(`Skipping task ${taskResult.ID}: No git diff provided`);
        result.success = true;
        return result;
      }

      // Ensure git repo is clean before starting
      if (!this.isGitRepoClean()) {
        const handleResult = await this.handleDirtyGitRepo();
        if (!handleResult.success) {
          throw new Error(handleResult.error);
        }
      }

      // Create task branch
      const branchName = this.createTaskBranch(taskResult);
      result.branchName = branchName;

      // Apply git diff
      await this.applyGitDiff(taskResult.gitDiff);

      // Commit changes
      this.commitChanges(taskResult);

      // Return to original node
      this.returnToOriginalNode();

      result.success = true;
      console.log(`Successfully processed task ${taskResult.ID} on branch ${branchName}`);

    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);

      // Always try to return to original node on error
      try {
        this.returnToOriginalNode();
      } catch (returnError) {
        console.error(`Critical error: Failed to return to original git node: ${returnError instanceof Error ? returnError.message : String(returnError)}`);
      }
    }

    return result;
  }

  /**
   * Generate a beautiful, colorful final report with all task information
   */
  private generateFinalReport(summary: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    results: Array<{
      taskId: string;
      taskTitle: string;
      branchName: string;
      success: boolean;
      error?: string;
    }>;
  }): void {
    // Get terminal width for responsive layout
    const getTerminalWidth = (): number => {
      try {
        return process.stdout.columns || 80; // Fallback to 80 if undefined
      } catch {
        return 80; // Safe fallback
      }
    };

    // Helper function to create responsive lines and boxes
    const createLine = (width: number, char: string = '─'): string => char.repeat(width);
    const createBoxTop = (width: number): string => `┌${createLine(width - 2)}┐`;
    const createBoxBottom = (width: number): string => `└${createLine(width - 2)}┘`;
    const createBoxRow = (width: number, content: string, leftPad: number = 2, rightPad: number = 2): string => {
      const innerWidth = width - leftPad - rightPad - 2; // -2 for box characters
      const truncatedContent = content.length > innerWidth ? content.substring(0, innerWidth - 3) + '...' : content;
      const padding = innerWidth - truncatedContent.length;
      return `│${' '.repeat(leftPad)}${truncatedContent}${' '.repeat(padding + rightPad)}│`;
    };

    // Helper function to get commit hash for a branch
    const getCommitHash = (branchName: string): string => {
      try {
        return execSync(`git rev-parse --short ${branchName}`, {
          cwd: this.gitRepoPath,
          encoding: 'utf8'
        }).trim();
      } catch (error) {
        return 'N/A';
      }
    };

    // Get commit hashes for all successful tasks
    const commitHashes = new Map<string, string>();
    summary.results.forEach(result => {
      if (result.success && result.branchName) {
        commitHashes.set(result.taskId, getCommitHash(result.branchName));
      }
    });

    // Calculate success rate
    const successRate = summary.totalTasks > 0 ? Math.round((summary.successfulTasks / summary.totalTasks) * 100) : 0;
    const terminalWidth = Math.max(40, Math.min(200, getTerminalWidth())); // Clamp between 40-200 chars

    // Center header text
    const headerText = '🚀 CODECOMMITTER FINAL REPORT 🚀';
    const headerPadding = Math.max(0, (terminalWidth - headerText.length) / 2);
    const centeredHeader = `${' '.repeat(Math.floor(headerPadding))}${headerText}${' '.repeat(Math.ceil(headerPadding))}`;

    console.log(`\n${COLORS.bright}${COLORS.bgBlue}${COLORS.white}${centeredHeader}${COLORS.reset}`);
    console.log(`${COLORS.cyan}${createLine(terminalWidth, '═')}${COLORS.reset}\n`);

    // Summary Section with responsive width
    console.log(`${COLORS.bright}${COLORS.yellow}📊 SUMMARY STATISTICS${COLORS.reset}`);
    console.log(`${COLORS.cyan}${createBoxTop(terminalWidth)}${COLORS.reset}`);
    console.log(`${COLORS.cyan}${createBoxRow(terminalWidth, `${COLORS.bright}Total Tasks Processed: ${COLORS.white}${summary.totalTasks}`, 2, 2)}${COLORS.reset}`);
    console.log(`${COLORS.cyan}${createBoxRow(terminalWidth, `${COLORS.green}Successfully Completed: ${COLORS.white}${summary.successfulTasks}`, 2, 2)}${COLORS.reset}`);
    console.log(`${COLORS.cyan}${createBoxRow(terminalWidth, `${COLORS.red}Failed Tasks: ${COLORS.white}${summary.failedTasks}`, 2, 2)}${COLORS.reset}`);
    console.log(`${COLORS.cyan}${createBoxRow(terminalWidth, `${COLORS.yellow}Success Rate: ${COLORS.white}${successRate}%`, 2, 2)}${COLORS.reset}`);
    console.log(`${COLORS.cyan}${createBoxBottom(terminalWidth)}${COLORS.reset}\n`);

    // Get repository URL information
    const getGitUrl = (): string => {
      try {
        // Try to get the remote origin URL (HTTPS or SSH)
        const originUrl = execSync('git config --get remote.origin.url', {
          cwd: this.gitRepoPath,
          encoding: 'utf8'
        }).trim();

        if (originUrl) {
          return originUrl;
        }

        // If no origin, try to get current branch remote URL
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: this.gitRepoPath,
          encoding: 'utf8'
        }).trim();

        if (currentBranch && currentBranch !== 'HEAD') {
          try {
            const remoteName = execSync(`git config --get branch.${currentBranch}.remote`, {
              cwd: this.gitRepoPath,
              encoding: 'utf8'
            }).trim();

            if (remoteName) {
              const remoteUrl = execSync(`git config --get remote.${remoteName}.url`, {
                cwd: this.gitRepoPath,
                encoding: 'utf8'
              }).trim();
              if (remoteUrl) {
                return remoteUrl;
              }
            }
          } catch {
            // Continue to next method
          }
        }

        // Fallback: try to construct URL from git config
        const remoteUrl = execSync('git remote get-url origin 2>/dev/null || echo ""', {
          cwd: this.gitRepoPath,
          encoding: 'utf8'
        }).trim();

        return remoteUrl || 'Local repository';
      } catch (error) {
        return 'Local repository';
      }
    };

    // Get current branch name
    const getCurrentBranch = (): string => {
      try {
        return execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: this.gitRepoPath,
          encoding: 'utf8'
        }).trim();
      } catch {
        return 'Unknown';
      }
    };

    const gitUrl = getGitUrl();
    const currentBranch = getCurrentBranch();

    // Original git info with responsive width
    console.log(`${COLORS.bright}${COLORS.blue}🌳 GIT REPOSITORY INFO${COLORS.reset}`);
    console.log(`${COLORS.cyan}${createBoxTop(terminalWidth)}${COLORS.reset}`);
    console.log(`${COLORS.cyan}${createBoxRow(terminalWidth, `${COLORS.bright}Original Commit Hash: ${COLORS.magenta}${this.originalGitNode}`, 2, 2)}${COLORS.reset}`);
    console.log(`${COLORS.cyan}${createBoxRow(terminalWidth, `${COLORS.bright}Current Branch: ${COLORS.green}${currentBranch}`, 2, 2)}${COLORS.reset}`);

    // Format the git URL nicely
    let urlDisplay = gitUrl;
    let urlType = 'URL';
    if (gitUrl.startsWith('git@')) {
      urlType = 'SSH URL';
      // Extract username/reponame from SSH URL for cleaner display
      const match = gitUrl.match(/git@[^:]+:(.+)\.git$/);
      if (match) {
        urlDisplay = match[1];
      }
    } else if (gitUrl.startsWith('https://')) {
      urlType = 'HTTPS URL';
      // Extract username/reponame from HTTPS URL for cleaner display
      const match = gitUrl.match(/https:\/\/[^\/]+\/(.+)\.git$/);
      if (match) {
        urlDisplay = match[1];
      }
    } else if (gitUrl === 'Local repository') {
      urlType = 'Repository';
      urlDisplay = gitUrl;
    }

    console.log(`${COLORS.cyan}${createBoxRow(terminalWidth, `${COLORS.bright}${urlType}: ${COLORS.cyan}${urlDisplay}`, 2, 2)}${COLORS.reset}`);

    if (this.stashedChanges) {
      console.log(`${COLORS.cyan}${createBoxRow(terminalWidth, `${COLORS.yellow}⚠️  Stashed changes were restored`, 2, 2)}${COLORS.reset}`);
    }
    console.log(`${COLORS.cyan}${createBoxBottom(terminalWidth)}${COLORS.reset}\n`);

    // Task details section with responsive width
    console.log(`${COLORS.bright}${COLORS.magenta}📋 TASK DETAILS${COLORS.reset}`);
    console.log(`${COLORS.cyan}${createLine(terminalWidth, '═')}${COLORS.reset}`);

    summary.results.forEach((result, index) => {
      const task = this.taskResults.find(t => t.ID === result.taskId);
      const status = result.success ?
        `${COLORS.bgGreen}${COLORS.white} ✓ SUCCESS ${COLORS.reset}` :
        `${COLORS.bgRed}${COLORS.white} ✗ FAILED ${COLORS.reset}`;

      // Task title with responsive width
      const titlePrefix = `Task ${index + 1}/${summary.totalTasks}: `;
      const maxTitleWidth = terminalWidth - titlePrefix.length - 1;
      const displayTitle = result.taskTitle.length > maxTitleWidth
        ? result.taskTitle.substring(0, maxTitleWidth - 3) + '...'
        : result.taskTitle;

      console.log(`\n${COLORS.bright}${COLORS.yellow}${titlePrefix}${displayTitle}${COLORS.reset}`);
      console.log(`${COLORS.cyan}├─ 🆔 Task ID:${COLORS.reset} ${COLORS.white}${result.taskId}${COLORS.reset}`);
      console.log(`${COLORS.cyan}├─ 📊 Status:${COLORS.reset} ${status}`);

      if (result.success && result.branchName) {
        const commitHash = commitHashes.get(result.taskId) || 'N/A';
        const maxBranchWidth = terminalWidth - 12; // "├─ 🌿 Branch: ".length
        const displayBranch = result.branchName.length > maxBranchWidth
          ? result.branchName.substring(0, maxBranchWidth - 3) + '...'
          : result.branchName;

        console.log(`${COLORS.cyan}├─ 🌿 Branch:${COLORS.reset} ${COLORS.green}${displayBranch}${COLORS.reset}`);
        console.log(`${COLORS.cyan}├─ 🔗 Commit Hash:${COLORS.reset} ${COLORS.magenta}${commitHash}${COLORS.reset}`);
      }

      if (task) {
        // Responsive description wrapping
        if (task.description) {
          const descriptionPrefix = '├─ 📝 Description: ';
          const maxDescWidth = terminalWidth - descriptionPrefix.length - 2;
          const words = (task.description || 'No description provided').split(' ');
          let currentLine = `${COLORS.cyan}${descriptionPrefix}${COLORS.dim}`;

          words.forEach((word, i) => {
            if ((currentLine.length - descriptionPrefix.length - 10 + word.length + 1) <= maxDescWidth) {
              currentLine += (i === 0 ? '' : ' ') + word;
            } else {
              console.log(`${currentLine}${COLORS.reset}`);
              currentLine = `${COLORS.cyan}${' '.repeat(descriptionPrefix.length - 2)}├─ ${COLORS.dim}${word}`;
            }
          });
          if (currentLine) {
            console.log(`${currentLine}${COLORS.reset}`);
          }
        }

        // Responsive report wrapping
        if (task.report) {
          const reportPrefix = '├─ 📄 Report: ';
          const maxReportWidth = terminalWidth - reportPrefix.length - 2;
          const words = task.report.split(' ');
          let currentLine = `${COLORS.cyan}${reportPrefix}${COLORS.dim}`;

          words.forEach((word, i) => {
            if ((currentLine.length - reportPrefix.length - 10 + word.length + 1) <= maxReportWidth) {
              currentLine += (i === 0 ? '' : ' ') + word;
            } else {
              console.log(`${currentLine}${COLORS.reset}`);
              currentLine = `${COLORS.cyan}${' '.repeat(reportPrefix.length - 2)}├─ ${COLORS.dim}${word}`;
            }
          });
          if (currentLine) {
            console.log(`${currentLine}${COLORS.reset}`);
          }
        }

        if (task.completedAt) {
          const completionTime = new Date(task.completedAt).toLocaleString();
          console.log(`${COLORS.cyan}├─ ⏰ Completed:${COLORS.reset} ${COLORS.blue}${completionTime}${COLORS.reset}`);
        }
      }

      if (result.error) {
        // Responsive error message wrapping
        const errorPrefix = '├─ ❌ Error: ';
        const maxErrorWidth = terminalWidth - errorPrefix.length - 2;
        const words = result.error.split(' ');
        let currentLine = `${COLORS.cyan}${errorPrefix}${COLORS.red}`;

        words.forEach((word, i) => {
          if ((currentLine.length - errorPrefix.length - 10 + word.length + 1) <= maxErrorWidth) {
            currentLine += (i === 0 ? '' : ' ') + word;
          } else {
            console.log(`${currentLine}${COLORS.reset}`);
            currentLine = `${COLORS.cyan}${' '.repeat(errorPrefix.length - 2)}├─ ${COLORS.red}${word}`;
          }
        });
        if (currentLine) {
          console.log(`${currentLine}${COLORS.reset}`);
        }
      }

      console.log(`${COLORS.cyan}└─ ${result.success ? '✅ All changes committed successfully!' : '⚠️  Task failed to complete'}${COLORS.reset}`);
    });

    // Final footer with responsive width
    console.log(`\n${COLORS.cyan}${createLine(terminalWidth, '═')}${COLORS.reset}`);

    if (summary.failedTasks === 0) {
      const successMessage = '🎉 ALL TASKS COMPLETED SUCCESSFULLY! 🎉';
      const successPadding = Math.max(0, (terminalWidth - successMessage.length) / 2);
      const centeredSuccess = `${' '.repeat(Math.floor(successPadding))}${successMessage}${' '.repeat(Math.ceil(successPadding))}`;

      console.log(`${COLORS.bgGreen}${COLORS.white}${COLORS.bright}${centeredSuccess}${COLORS.reset}`);

      const detailMessage = 'Every task was processed and committed successfully.';
      const detailPadding = Math.max(0, (terminalWidth - detailMessage.length) / 2);
      const centeredDetail = `${' '.repeat(Math.floor(detailPadding))}${detailMessage}${' '.repeat(Math.ceil(detailPadding))}`;

      console.log(`${COLORS.green}${centeredDetail}${COLORS.reset}`);
    } else {
      const warningMessage = `⚠️  ${summary.failedTasks} TASK(S) FAILED ⚠️`;
      const warningPadding = Math.max(0, (terminalWidth - warningMessage.length) / 2);
      const centeredWarning = `${' '.repeat(Math.floor(warningPadding))}${warningMessage}${' '.repeat(Math.ceil(warningPadding))}`;

      console.log(`${COLORS.bgYellow}${COLORS.white}${COLORS.bright}${centeredWarning}${COLORS.reset}`);

      const detailMessage = 'Some tasks encountered errors. Please review the details above.';
      const detailPadding = Math.max(0, (terminalWidth - detailMessage.length) / 2);
      const centeredDetail = `${' '.repeat(Math.floor(detailPadding))}${detailMessage}${' '.repeat(Math.ceil(detailPadding))}`;

      console.log(`${COLORS.yellow}${centeredDetail}${COLORS.reset}`);
    }

    const timestamp = new Date().toLocaleString();
    const timeMessage = `Generated on ${timestamp}`;
    const timePadding = Math.max(0, (terminalWidth - timeMessage.length) / 2);
    const centeredTime = `${' '.repeat(Math.floor(timePadding))}${timeMessage}${' '.repeat(Math.ceil(timePadding))}`;

    console.log(`\n${COLORS.dim}${centeredTime}${COLORS.reset}`);

    const footerMessage = '💼 Thank you for using Full Self Coding! 💼';
    const footerPadding = Math.max(0, (terminalWidth - footerMessage.length) / 2);
    const centeredFooter = `${' '.repeat(Math.floor(footerPadding))}${footerMessage}${' '.repeat(Math.ceil(footerPadding))}`;

    console.log(`${COLORS.blue}${centeredFooter}${COLORS.reset}\n`);
  }

  /**
   * Main method to commit all task results
   * For each task result:
   * 1. Remember current git node (done in constructor)
   * 2. Create new branch from current git node
   * 3. Read and apply the git diff
   * 4. Commit the changes
   * 5. Switch back to original git node
   */
  public async commitAllChanges(): Promise<{
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    results: Array<{
      taskId: string;
      taskTitle: string;
      branchName: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results = [];
    let successfulTasks = 0;
    let failedTasks = 0;

    console.log(`Starting to process ${this.taskResults.length} task results...`);
    console.log(`Original git node: ${this.originalGitNode}`);

    for (const taskResult of this.taskResults) {
      console.log(`\nProcessing task ${taskResult.ID}: ${taskResult.title}`);

      const processResult = await this.processTaskResult(taskResult);

      results.push({
        taskId: taskResult.ID,
        taskTitle: taskResult.title,
        branchName: processResult.branchName,
        success: processResult.success,
        error: processResult.error
      });

      if (processResult.success) {
        successfulTasks++;
      } else {
        failedTasks++;
        console.error(`Failed to process task ${taskResult.ID}: ${processResult.error}`);
      }
    }

    // Restore stashed changes if any were made
    if (this.stashedChanges) {
      console.log('\nRestoring stashed changes...');
      if (this.restoreStashedChanges()) {
        console.log('Successfully restored stashed changes');
      } else {
        console.warn('Failed to restore stashed changes. You may need to manually restore them with: git stash pop');
      }
    }

    const summary = {
      totalTasks: this.taskResults.length,
      successfulTasks,
      failedTasks,
      results,
      gitStateOptions: this.gitStateOptions,
      stashedChanges: this.stashedChanges
    };

    // Generate beautiful final report
    this.generateFinalReport(summary);

    return summary;
  }

  /**
   * Get the original git node where the committer started
   */
  public getOriginalGitNode(): string {
    return this.originalGitNode;
  }

  /**
   * Get list of task results that will be processed
   */
  public getTaskResults(): TaskResult[] {
    return [...this.taskResults];
  }

  /**
   * Static method to handle dirty Git state automatically with sensible defaults
   */
  static createWithAutoCleanup(taskResults: TaskResult[], gitRepoPath: string = '.'): CodeCommitter {
    return new CodeCommitter(taskResults, gitRepoPath, {
      autoStash: true,
      backupBranch: 'codecommitter-backup'
    });
  }

  /**
   * Static method to create CodeCommitter that ignores untracked files
   */
  static createIgnoringUntracked(taskResults: TaskResult[], gitRepoPath: string = '.'): CodeCommitter {
    return new CodeCommitter(taskResults, gitRepoPath, {
      ignoreUntracked: true
    });
  }

  /**
   * Static method to create CodeCommitter that auto-commits changes
   */
  static createWithAutoCommit(taskResults: TaskResult[], gitRepoPath: string = '.'): CodeCommitter {
    return new CodeCommitter(taskResults, gitRepoPath, {
      autoCommit: true,
      backupBranch: 'codecommitter-backup'
    });
  }
}