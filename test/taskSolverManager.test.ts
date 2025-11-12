import { TaskSolverManager } from '../src/taskSolverManager';
import type { Task, TaskResult } from '../src/task';
import { TaskStatus } from '../src/task';
import type { Config } from '../src/config';
import { TaskSolver } from '../src/taskSolver';
import { describe, it, expect, mock, test, beforeEach } from "bun:test";
import { SWEAgentType } from '../src/config';

const mockTaskSolver = mock((config: Config, task: Task, agentType: any, gitURL: string) => ({
    solve: mock(() => Promise.resolve()),
    getResult: mock(() => ({})),
    task: task,
}));

// Mock the TaskSolver module
mock.module('../src/taskSolver', () => ({
    TaskSolver: mockTaskSolver
}));

describe('TaskSolverManager', () => {
    let config: Config;
    let gitURL: string;

    beforeEach(() => {
        mockTaskSolver.mockClear();
        config = {
            agentType: SWEAgentType.GEMINI_CLI,
            dockerImageRef: 'node:latest',
            dockerTimeoutSeconds: 300,
            maxParallelDockerContainers: 2,
        };
        gitURL = 'https://github.com/example/repo.git';
    });

    describe('Constructor', () => {
        it('should initialize with correct configuration', () => {
            const manager = new TaskSolverManager(config, gitURL);
            expect(manager).toBeDefined();
        });

        it('should use default maxParallelDockerContainers when not specified', () => {
            const configWithoutLimit = {
                agentType: SWEAgentType.GEMINI_CLI,
                dockerImageRef: 'node:latest',
                dockerTimeoutSeconds: 300,
            };
            const manager = new TaskSolverManager(configWithoutLimit, gitURL);
            expect(manager).toBeDefined();
        });
    });

    describe('addTask', () => {
        it('should add tasks to the queue', () => {
            const manager = new TaskSolverManager(config, gitURL);
            const task: Task = {
                ID: '1',
                title: 'Test Task',
                description: 'A test task',
                priority: 1,
            };

            manager.addTask(task);
            expect(manager).toBeDefined();
        });

        it('should add multiple tasks to the queue', () => {
            const manager = new TaskSolverManager(config, gitURL);
            const tasks: Task[] = [
                {
                    ID: '1',
                    title: 'Task 1',
                    description: 'First task',
                    priority: 1,
                },
                {
                    ID: '2',
                    title: 'Task 2',
                    description: 'Second task',
                    priority: 2,
                },
            ];

            tasks.forEach(task => manager.addTask(task));
            expect(manager).toBeDefined();
        });
    });

    describe('start', () => {
        it('should handle empty task queue gracefully', async () => {
            const manager = new TaskSolverManager(config, gitURL);
            await manager.start();
            const reports = manager.getReports();
            expect(reports).toHaveLength(0);
        });

        it('should run tasks in parallel up to the limit', async () => {
            const manager = new TaskSolverManager(config, gitURL);
            const tasks: Task[] = [
                {
                    ID: '1',
                    title: 'Task 1',
                    description: 'First task',
                    priority: 1,
                },
                {
                    ID: '2',
                    title: 'Task 2',
                    description: 'Second task',
                    priority: 1,
                },
                {
                    ID: '3',
                    title: 'Task 3',
                    description: 'Third task',
                    priority: 1,
                },
            ];

            tasks.forEach(task => manager.addTask(task));

            const taskResults: { [key: string]: TaskResult } = {
                '1': {
                    ...tasks[0],
                    status: TaskStatus.SUCCESS,
                    report: 'Task 1 completed',
                    completedAt: Date.now(),
                },
                '2': {
                    ...tasks[1],
                    status: TaskStatus.SUCCESS,
                    report: 'Task 2 completed',
                    completedAt: Date.now(),
                },
                '3': {
                    ...tasks[2],
                    status: TaskStatus.SUCCESS,
                    report: 'Task 3 completed',
                    completedAt: Date.now(),
                },
            };

            mockTaskSolver.mockImplementation((config: Config, task: Task, agentType: any, gitURL: string) => {
                return {
                    solve: mock().mockImplementation(async () => {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }),
                    getResult: mock().mockReturnValue(taskResults[task.ID]),
                    task: task,
                };
            });

            await manager.start();

            expect(mockTaskSolver).toHaveBeenCalledTimes(3);
            const reports = manager.getReports();
            expect(reports).toHaveLength(3);
            expect(reports.map(r => r.ID).sort()).toEqual(['1', '2', '3']);
        });

        it('should handle task failures gracefully', async () => {
            const manager = new TaskSolverManager(config, gitURL);
            const tasks: Task[] = [
                {
                    ID: '1',
                    title: 'Task 1',
                    description: 'First task',
                    priority: 1,
                },
                {
                    ID: '2',
                    title: 'Task 2',
                    description: 'Second task',
                    priority: 1,
                },
            ];

            manager.addTask(tasks[0]);
            manager.addTask(tasks[1]);

            // ignore next line
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            mockTaskSolver.mockImplementation((config: Config, task: Task, agentType: any, gitURL: string) => {
                if (task.ID === '1') {
                    return {
                        solve: mock().mockRejectedValue(new Error('Task 1 failed')),
                        getResult: mock(),
                        task: task,
                    };
                }
                return {
                    solve: mock().mockImplementation(async () => {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }),
                    getResult: mock().mockReturnValue({
                        ...tasks[1],
                        status: TaskStatus.SUCCESS,
                        report: 'Task 2 completed',
                        completedAt: Date.now(),
                    }),
                    task: task,
                };
            });

            await manager.start();

            expect(mockTaskSolver).toHaveBeenCalledTimes(2);
            const reports = manager.getReports();
            expect(reports).toHaveLength(2);

            const failedTaskReport = reports.find(r => r.ID === '1');
            expect(failedTaskReport?.status).toBe(TaskStatus.FAILURE);
            expect(failedTaskReport?.report).toContain('Error solving task: Task 1 failed');

            const successTaskReport = reports.find(r => r.ID === '2');
            expect(successTaskReport?.status).toBe(TaskStatus.SUCCESS);
            expect(successTaskReport?.report).toBe('Task 2 completed');
        });

        it('should respect maxParallelDockerContainers limit', async () => {
            const configWithLimit = {
                ...config,
                maxParallelDockerContainers: 1,
            };
            const manager = new TaskSolverManager(configWithLimit, gitURL);

            const tasks: Task[] = [
                {
                    ID: '1',
                    title: 'Task 1',
                    description: 'First task',
                    priority: 1,
                },
                {
                    ID: '2',
                    title: 'Task 2',
                    description: 'Second task',
                    priority: 1,
                },
            ];

            tasks.forEach(task => manager.addTask(task));

            let activeCount = 0;
            mockTaskSolver.mockImplementation((config: Config, task: Task, agentType: any, gitURL: string) => {
                activeCount++;
                return {
                    solve: mock().mockImplementation(async () => {
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }),
                    getResult: mock().mockReturnValue({
                        ...task,
                        status: TaskStatus.SUCCESS,
                        report: `${task.title} completed`,
                        completedAt: Date.now(),
                    }),
                    task: task,
                };
            });

            await manager.start();
            expect(mockTaskSolver).toHaveBeenCalledTimes(2);
        });
    });

    describe('getReports', () => {
        it('should return empty array when no tasks completed', () => {
            const manager = new TaskSolverManager(config, gitURL);
            const reports = manager.getReports();
            expect(reports).toEqual([]);
        });

        it('should return reports for completed tasks', async () => {
            const manager = new TaskSolverManager(config, gitURL);
            const task: Task = {
                ID: '1',
                title: 'Test Task',
                description: 'A test task',
                priority: 1,
            };

            manager.addTask(task);

            const expectedResult: TaskResult = {
                ...task,
                status: TaskStatus.SUCCESS,
                report: 'Task completed successfully',
                completedAt: Date.now(),
            };

            mockTaskSolver.mockImplementation((config: Config, task: Task, agentType: any, gitURL: string) => {
                return {
                    solve: mock().mockImplementation(async () => {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }),
                    getResult: mock().mockReturnValue(expectedResult),
                    task: task,
                };
            });

            await manager.start();
            const reports = manager.getReports();

            expect(reports).toHaveLength(1);
            expect(reports[0]).toEqual(expectedResult);
        });
    });
});
