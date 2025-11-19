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

    console.log(`\n${COLORS.bright}${COLORS.bgBlue}${COLORS.white}🚀 CODECOMMITTER FINAL REPORT 🚀${COLORS.reset}`);
    console.log(`${COLORS.cyan}══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════${COLORS.reset}\n`);

    // Summary Section
    console.log(`${COLORS.bright}${COLORS.yellow}📊 SUMMARY STATISTICS${COLORS.reset}`);
    console.log(`${COLORS.cyan}┌─────────────────────────────────────────────────────────────────────────────────────────────────┐${COLORS.reset}`);
    console.log(`${COLORS.cyan}│${COLORS.reset} ${COLORS.bright}Total Tasks Processed:${COLORS.reset} ${COLORS.white}${summary.totalTasks.toString().padEnd(4)}${COLORS.reset} ${COLORS.cyan}│${COLORS.reset}`);
    console.log(`${COLORS.cyan}│${COLORS.reset} ${COLORS.green}Successfully Completed:${COLORS.reset} ${COLORS.white}${summary.successfulTasks.toString().padEnd(4)}${COLORS.reset} ${COLORS.cyan}│${COLORS.reset}`);
    console.log(`${COLORS.cyan}│${COLORS.reset} ${COLORS.red}Failed Tasks:${COLORS.reset}         ${COLORS.white}${summary.failedTasks.toString().padEnd(4)}${COLORS.reset} ${COLORS.cyan}│${COLORS.reset}`);
    console.log(`${COLORS.cyan}│${COLORS.reset} ${COLORS.yellow}Success Rate:${COLORS.reset}           ${COLORS.white}${successRate}%${' '.padEnd(4)}${COLORS.reset} ${COLORS.cyan}│${COLORS.reset}`);
    console.log(`${COLORS.cyan}└─────────────────────────────────────────────────────────────────────────────────────────────────┘${COLORS.reset}\n`);

    // Original git info
    console.log(`${COLORS.bright}${COLORS.blue}🌳 GIT REPOSITORY INFO${COLORS.reset}`);
    console.log(`${COLORS.cyan}┌─────────────────────────────────────────────────────────────────────────────────────────────────┐${COLORS.reset}`);
    console.log(`${COLORS.cyan}│${COLORS.reset} ${COLORS.bright}Original Commit Hash:${COLORS.reset} ${COLORS.magenta}${this.originalGitNode}${COLORS.reset}`);
    if (this.stashedChanges) {
      console.log(`${COLORS.cyan}│${COLORS.reset} ${COLORS.yellow}⚠️  Stashed changes were restored${COLORS.reset}`);
    }
    console.log(`${COLORS.cyan}└─────────────────────────────────────────────────────────────────────────────────────────────────┘${COLORS.reset}\n`);

    // Task details section
    console.log(`${COLORS.bright}${COLORS.magenta}📋 TASK DETAILS${COLORS.reset}`);
    console.log(`${COLORS.cyan}══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════${COLORS.reset}`);

    summary.results.forEach((result, index) => {
      const task = this.taskResults.find(t => t.ID === result.taskId);
      const status = result.success ?
        `${COLORS.bgGreen}${COLORS.white} ✓ SUCCESS ${COLORS.reset}` :
        `${COLORS.bgRed}${COLORS.white} ✗ FAILED ${COLORS.reset}`;

      console.log(`\n${COLORS.bright}${COLORS.yellow}Task ${index + 1}/${summary.totalTasks}: ${result.taskTitle}${COLORS.reset}`);
      console.log(`${COLORS.cyan}├─ 🆔 Task ID:${COLORS.reset} ${COLORS.white}${result.taskId}${COLORS.reset}`);
      console.log(`${COLORS.cyan}├─ 📊 Status:${COLORS.reset} ${status}`);

      if (result.success && result.branchName) {
        const commitHash = commitHashes.get(result.taskId) || 'N/A';
        console.log(`${COLORS.cyan}├─ 🌿 Branch:${COLORS.reset} ${COLORS.green}${result.branchName}${COLORS.reset}`);
        console.log(`${COLORS.cyan}├─ 🔗 Commit Hash:${COLORS.reset} ${COLORS.magenta}${commitHash}${COLORS.reset}`);
      }

      if (task) {
        console.log(`${COLORS.cyan}├─ 📝 Description:${COLORS.reset} ${COLORS.dim}${task.description || 'No description provided'}${COLORS.reset}`);
        if (task.report) {
          console.log(`${COLORS.cyan}├─ 📄 Report:${COLORS.reset} ${COLORS.dim}${task.report}${COLORS.reset}`);
        }
        if (task.completedAt) {
          const completionTime = new Date(task.completedAt).toLocaleString();
          console.log(`${COLORS.cyan}├─ ⏰ Completed:${COLORS.reset} ${COLORS.blue}${completionTime}${COLORS.reset}`);
        }
      }

      if (result.error) {
        console.log(`${COLORS.cyan}├─ ❌ Error:${COLORS.reset} ${COLORS.red}${result.error}${COLORS.reset}`);
      }

      console.log(`${COLORS.cyan}└─ ${result.success ? '✅ All changes committed successfully!' : '⚠️  Task failed to complete'}${COLORS.reset}`);
    });

    // Final footer
    console.log(`\n${COLORS.cyan}══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════${COLORS.reset}`);

    if (summary.failedTasks === 0) {
      console.log(`${COLORS.bgGreen}${COLORS.white}${COLORS.bright}🎉 ALL TASKS COMPLETED SUCCESSFULLY! 🎉${COLORS.reset}`);
      console.log(`${COLORS.green}   Every task was processed and committed successfully.${COLORS.reset}`);
    } else {
      console.log(`${COLORS.bgYellow}${COLORS.white}${COLORS.bright}⚠️  ${summary.failedTasks} TASK(S) FAILED ⚠️${COLORS.reset}`);
      console.log(`${COLORS.yellow}   Some tasks encountered errors. Please review the details above.${COLORS.reset}`);
    }

    console.log(`\n${COLORS.dim}Generated on ${new Date().toLocaleString()}${COLORS.reset}`);
    console.log(`${COLORS.blue}💼 Thank you for using Full Self Coding! 💼${COLORS.reset}\n`);
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