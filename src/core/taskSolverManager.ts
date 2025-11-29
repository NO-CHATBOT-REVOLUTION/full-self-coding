import { TaskStatus, type Task, type TaskResult } from './task';
import { TaskSolver } from './taskSolver';
import type { Config } from './config';


export class TaskSolverManager {
    private taskQueue: Task[] = [];
    private completedTasks: TaskResult[] = [];
    private activeTasks: Map<string, TaskSolver> = new Map();
    private maxParallelDockerContainers: number;
    private config: Config;
    private gitURL: string;

    constructor(config: Config, gitURL: string) {
        this.config = config;
        this.gitURL = gitURL;
        this.maxParallelDockerContainers = config.maxParallelDockerContainers || 1;
    }

    addTask(task: Task) {
        this.taskQueue.push(task);
    }

    async start() {
        while (this.taskQueue.length > 0 || this.activeTasks.size > 0) {
            while (this.activeTasks.size < this.maxParallelDockerContainers && this.taskQueue.length > 0) {
                console.log(`Active tasks: ${this.activeTasks.size}, Task queue: ${this.taskQueue.length}`);
                const task = this.taskQueue.shift();
                if (task) {
                    this.startTask(task);
                    console.log(`Started task ${task.ID}`);
                }
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
        }
    }

    private async startTask(task: Task) {
        console.log(`start task ${task.ID}`);
        // // wait for 20 seconds
        // await new Promise(resolve => setTimeout(resolve, 20000));
        // return;
        const taskSolver = new TaskSolver(this.config, task, this.config.agentType, this.gitURL);
        this.activeTasks.set(task.ID, taskSolver);
        try {
            console.log(`try to solve task ${task.ID}`);
            await taskSolver.solve();
            const result = taskSolver.getResult();
            this.completedTasks.push(result);
        } catch (error) {
            console.error(`Error solving task ${task.ID}:`, error);
            const result: TaskResult = {
                ...task,
                status: TaskStatus.FAILURE,
                report: `Error solving task: ${error instanceof Error ? error.message : String(error)}`,
                completedAt: Date.now(),
            };
            this.completedTasks.push(result);
        } finally {
            this.activeTasks.delete(task.ID);
        }
    }

    getReports() {
        return this.completedTasks;
    }
}