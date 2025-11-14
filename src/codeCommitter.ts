import { TaskStatus, type Task, type TaskResult } from './task';
import { TaskSolver } from './taskSolver';
import type { Config } from './config';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';


export class CodeCommitter {
  private taskResults: TaskResult[];
  private originalGitNode: string;
  private gitRepoPath: string;

  constructor(taskResults: TaskResult[], gitRepoPath: string = '.') {
    this.taskResults = taskResults;
    this.gitRepoPath = gitRepoPath;
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

        console.log('Successfully applied git diff');
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
   * Switch back to the original git node
   */
  private returnToOriginalNode(): void {
    try {
      execSync(`git checkout ${this.originalGitNode}`, {
        cwd: this.gitRepoPath,
        encoding: 'utf8'
      });
      console.log(`Returned to original git node: ${this.originalGitNode}`);
    } catch (error) {
      throw new Error(`Failed to return to original git node ${this.originalGitNode}: ${error instanceof Error ? error.message : String(error)}`);
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
      return status === '';
    } catch (error) {
      return false;
    }
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
        throw new Error('Git repository is not in a clean state. Please commit or stash changes before running CodeCommitter.');
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

    const summary = {
      totalTasks: this.taskResults.length,
      successfulTasks,
      failedTasks,
      results
    };

    console.log(`\n=== CodeCommitter Summary ===`);
    console.log(`Total tasks: ${summary.totalTasks}`);
    console.log(`Successful: ${summary.successfulTasks}`);
    console.log(`Failed: ${summary.failedTasks}`);
    console.log(`Original git node: ${this.originalGitNode}`);

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
}