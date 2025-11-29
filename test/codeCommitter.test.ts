import { describe, it, expect, mock, beforeEach, afterEach, test } from "bun:test";
import { CodeCommitter, type GitStateOptions } from '../src/core/codeCommitter';
import type { TaskResult } from '../src/core/task';
import { TaskStatus } from '../src/core/task';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('CodeCommitter', () => {
    let tempRepoDir: string;
    let codeCommitter: CodeCommitter;
    let sampleTaskResults: TaskResult[];

    beforeEach(() => {
        // Create a temporary directory for testing
        tempRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-committer-test-'));

        // Initialize a git repository in the temp directory
        try {
            execSync('git init', { cwd: tempRepoDir });
            execSync('git config user.name "Test User"', { cwd: tempRepoDir });
            execSync('git config user.email "test@example.com"', { cwd: tempRepoDir });

            // Create an initial commit
            const initialFile = path.join(tempRepoDir, 'README.md');
            fs.writeFileSync(initialFile, '# Test Repository');
            execSync('git add README.md', { cwd: tempRepoDir });
            execSync('git commit -m "Initial commit"', { cwd: tempRepoDir });
        } catch (error) {
            console.error('Failed to setup test git repository:', error);
        }

        // Sample task results for testing
        sampleTaskResults = [
            {
                ID: 'task-1',
                title: 'Add new feature',
                description: 'Implement a new feature for the application',
                priority: 1,
                status: TaskStatus.SUCCESS,
                report: 'Successfully implemented the new feature',
                completedAt: Date.now(),
                gitDiff: `diff --git a/new-feature.js b/new-feature.js
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/new-feature.js
@@ -0,0 +1,5 @@
+// New feature implementation
+function newFeature() {
+    console.log('Hello from new feature!');
+}
+
+export default newFeature;`
            },
            {
                ID: 'task-2',
                title: 'Update documentation',
                description: 'Update the README with new information',
                priority: 2,
                status: TaskStatus.SUCCESS,
                report: 'Updated README with new documentation',
                completedAt: Date.now(),
                gitDiff: `diff --git a/README.md b/README.md
index 1234567..abcdefg 100644
--- a/README.md
+++ b/README.md
@@ -1,3 +1,6 @@
 # Test Repository

+This repository has been updated with new features.
+
+## Usage
+Run the application to see the new features.`
            },
            {
                ID: 'task-3',
                title: 'Failed task',
                description: 'This task should fail',
                priority: 3,
                status: TaskStatus.FAILURE,
                report: 'Task failed due to an error',
                completedAt: Date.now(),
                gitDiff: '' // No diff for failed task
            }
        ];
    });

    afterEach(() => {
        // Clean up the temporary directory
        try {
            fs.rmSync(tempRepoDir, { recursive: true, force: true });
        } catch (error) {
            console.error('Failed to cleanup test directory:', error);
        }
    });

    describe('Constructor', () => {
        it('should initialize with task results and default path', () => {
            const committer = new CodeCommitter(sampleTaskResults);
            expect(committer).toBeDefined();
            expect(committer.getTaskResults()).toHaveLength(3);
        });

        it('should initialize with task results and custom path', () => {
            const committer = new CodeCommitter(sampleTaskResults, tempRepoDir);
            expect(committer).toBeDefined();
            expect(committer.getTaskResults()).toHaveLength(3);
        });

        it('should get the original git node', () => {
            const committer = new CodeCommitter(sampleTaskResults, tempRepoDir);
            const originalNode = committer.getOriginalGitNode();
            expect(originalNode).toMatch(/^[a-f0-9]{40}$/); // Git commit hash format
        });
    });

    describe('Task Result Processing', () => {
        it('should process task results with valid git diffs', async () => {
            const committer = new CodeCommitter(sampleTaskResults.slice(0, 1), tempRepoDir);
            const result = await committer.commitAllChanges();

            expect(result.totalTasks).toBe(1);
            expect(result.successfulTasks).toBe(1);
            expect(result.failedTasks).toBe(0);
            expect(result.results[0].success).toBe(true);
            expect(result.results[0].taskId).toBe('task-1');
            expect(result.results[0].branchName).toMatch(/^task-task-1-\d+$/);
        });

        it('should skip tasks with empty git diffs', async () => {
            const taskWithoutDiff: TaskResult = {
                ...sampleTaskResults[2],
                gitDiff: ''
            };

            const committer = new CodeCommitter([taskWithoutDiff], tempRepoDir);
            const result = await committer.commitAllChanges();

            expect(result.totalTasks).toBe(1);
            expect(result.successfulTasks).toBe(1);
            expect(result.failedTasks).toBe(0);
            expect(result.results[0].success).toBe(true);
        });

        it('should handle multiple task results', async () => {
            const committer = new CodeCommitter(sampleTaskResults, tempRepoDir);
            const result = await committer.commitAllChanges();

            expect(result.totalTasks).toBe(3);
            expect(result.successfulTasks).toBe(2); // task-3 has no diff and should be skipped
            expect(result.failedTasks).toBe(1); // task-3 should fail validation or be skipped
        });
    });

    describe('Git Operations', () => {
        it('should create separate branches for each task', async () => {
            const committer = new CodeCommitter(sampleTaskResults.slice(0, 2), tempRepoDir);
            await committer.commitAllChanges();

            // Verify that branches were created
            const branches = execSync('git branch --list "task-*"', {
                cwd: tempRepoDir,
                encoding: 'utf8'
            });

            expect(branches).toContain('task-task-1-');
            expect(branches).toContain('task-task-2-');
        });

        it('should return to original git node after processing', async () => {
            const committer = new CodeCommitter(sampleTaskResults.slice(0, 1), tempRepoDir);
            const originalNode = committer.getOriginalGitNode();

            await committer.commitAllChanges();

            // Verify we're back on the original commit
            const currentHead = execSync('git rev-parse HEAD', {
                cwd: tempRepoDir,
                encoding: 'utf8'
            }).trim();

            expect(currentHead).toBe(originalNode);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid task results gracefully', async () => {
            const invalidTask: TaskResult = {
                ID: '', // Invalid empty ID
                title: 'Invalid Task',
                description: 'This task has no ID',
                priority: 1,
                status: TaskStatus.SUCCESS,
                report: 'Should fail validation',
                completedAt: Date.now(),
                gitDiff: 'diff --git a/test.js b/test.js'
            };

            const committer = new CodeCommitter([invalidTask], tempRepoDir);
            const result = await committer.commitAllChanges();

            expect(result.totalTasks).toBe(1);
            expect(result.successfulTasks).toBe(0);
            expect(result.failedTasks).toBe(1);
            expect(result.results[0].success).toBe(false);
            expect(result.results[0].error).toContain('Task result missing ID');
        });
    });

    describe('Validation', () => {
        it('should validate task result fields', async () => {
            const tasksWithMissingFields: TaskResult[] = [
                {
                    ...sampleTaskResults[0],
                    ID: '', // Missing ID
                    title: sampleTaskResults[0].title,
                    status: sampleTaskResults[0].status,
                    description: sampleTaskResults[0].description,
                    priority: 1
                },
                {
                    ...sampleTaskResults[1],
                    ID: sampleTaskResults[1].ID,
                    title: '', // Missing title
                    status: sampleTaskResults[1].status,
                    description: sampleTaskResults[1].description,
                    priority: 1
                },
                {
                    ...sampleTaskResults[1],
                    ID: sampleTaskResults[1].ID,
                    title: sampleTaskResults[1].title,
                    status: '' as TaskStatus, // Missing status
                    description: sampleTaskResults[1].description,
                    priority: 1
                }
            ];

            const committer = new CodeCommitter(tasksWithMissingFields, tempRepoDir);
            const result = await committer.commitAllChanges();

            expect(result.totalTasks).toBe(3);
            expect(result.successfulTasks).toBe(0);
            expect(result.failedTasks).toBe(3);

            // Check that all tasks failed with validation errors
            result.results.forEach((taskResult, index) => {
                expect(taskResult.success).toBe(false);
                if (index === 0) {
                    expect(taskResult.error).toContain('missing ID');
                } else if (index === 1) {
                    expect(taskResult.error).toContain('missing title');
                } else if (index === 2) {
                    expect(taskResult.error).toContain('missing status');
                }
            });
        });
    });

    describe('File Operations', () => {
        it('should apply git diffs correctly', async () => {
            const committer = new CodeCommitter([sampleTaskResults[0]], tempRepoDir);
            await committer.commitAllChanges();

            // Check out the branch and verify the file was created
            const branchName = `task-${sampleTaskResults[0].ID}-`;
            execSync(`git checkout $(git branch --list "${branchName}*" | sed 's/^[* ] //')`, {
                cwd: tempRepoDir
            });

            const newFeaturePath = path.join(tempRepoDir, 'new-feature.js');
            expect(fs.existsSync(newFeaturePath)).toBe(true);

            const content = fs.readFileSync(newFeaturePath, 'utf8');
            expect(content).toContain('newFeature');
            expect(content).toContain('Hello from new feature!');
        });
    });

    describe('Summary and Reporting', () => {
        it('should provide detailed summary results', async () => {
            const committer = new CodeCommitter(sampleTaskResults, tempRepoDir);
            const summary = await committer.commitAllChanges();

            expect(summary).toHaveProperty('totalTasks', 3);
            expect(summary).toHaveProperty('successfulTasks');
            expect(summary).toHaveProperty('failedTasks');
            expect(summary).toHaveProperty('results');
            expect(summary.results).toHaveLength(3);

            summary.results.forEach((result, index) => {
                expect(result).toHaveProperty('taskId', sampleTaskResults[index].ID);
                expect(result).toHaveProperty('taskTitle', sampleTaskResults[index].title);
                expect(result).toHaveProperty('branchName');
                expect(result).toHaveProperty('success');
                if (!result.success) {
                    expect(result).toHaveProperty('error');
                }
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty task results array', async () => {
            const committer = new CodeCommitter([], tempRepoDir);
            const result = await committer.commitAllChanges();

            expect(result.totalTasks).toBe(0);
            expect(result.successfulTasks).toBe(0);
            expect(result.failedTasks).toBe(0);
            expect(result.results).toHaveLength(0);
        });

        it('should handle tasks with no gitDiff property', async () => {
            const taskWithoutDiffProp: TaskResult = {
                ...sampleTaskResults[0],
                gitDiff: undefined // Explicitly undefined
            };

            const committer = new CodeCommitter([taskWithoutDiffProp], tempRepoDir);
            const result = await committer.commitAllChanges();

            expect(result.totalTasks).toBe(1);
            expect(result.successfulTasks).toBe(1);
            expect(result.failedTasks).toBe(0);
        });
    });

    describe('Git State Management', () => {
        it('should detect clean Git repository', () => {
            const committer = new CodeCommitter([], tempRepoDir);
            // In a clean test repo, this should not throw an error
            expect(() => committer.getOriginalGitNode()).not.toThrow();
        });

        it('should work with ignoreUntracked option', async () => {
            // Create an untracked file
            const untrackedFile = path.join(tempRepoDir, 'untracked.txt');
            fs.writeFileSync(untrackedFile, 'Untracked content');

            const gitStateOptions: GitStateOptions = { ignoreUntracked: true };
            const committer = new CodeCommitter([sampleTaskResults[0]], tempRepoDir, gitStateOptions);

            // Should work even with untracked files when ignoreUntracked is true
            const result = await committer.commitAllChanges();
            expect(result.totalTasks).toBe(1);
            expect(result.successfulTasks).toBe(1);
        });

        it('should create backup branch when specified', async () => {
            const gitStateOptions: GitStateOptions = {
                backupBranch: 'test-backup'
            };

            const committer = new CodeCommitter([], tempRepoDir, gitStateOptions);

            // Should not throw error even with backup option
            expect(committer.getTaskResults()).toHaveLength(0);
        });
    });

    describe('Static Factory Methods', () => {
        it('should create CodeCommitter with auto cleanup', () => {
            const committer = CodeCommitter.createWithAutoCleanup(sampleTaskResults, tempRepoDir);
            expect(committer).toBeDefined();
            expect(committer.getTaskResults()).toHaveLength(3);
        });

        it('should create CodeCommitter ignoring untracked files', () => {
            const committer = CodeCommitter.createIgnoringUntracked(sampleTaskResults, tempRepoDir);
            expect(committer).toBeDefined();
            expect(committer.getTaskResults()).toHaveLength(3);
        });

        it('should create CodeCommitter with auto commit', () => {
            const committer = CodeCommitter.createWithAutoCommit(sampleTaskResults, tempRepoDir);
            expect(committer).toBeDefined();
            expect(committer.getTaskResults()).toHaveLength(3);
        });
    });
});