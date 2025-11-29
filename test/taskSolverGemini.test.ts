import { describe, it, expect, mock, test } from "bun:test";
import { TaskSolver } from "../src/core/taskSolver";
import {  TaskStatus } from "../src/core/task";
import {  SWEAgentType } from "../src/core/config";
import type { Task } from "../src/core/task";
import type { Config } from "../src/core/config";
import { WorkStyle } from "../src/core/workStyle";
import {GEMINI_API_KEY} from "./apiKeySetup";

test("run a task with gemini cli agent", async () => {
    const config: Config = {
        agentType: SWEAgentType.GEMINI_CLI,
        dockerImageRef: "node:latest", // Use a real Docker image
        dockerTimeoutSeconds: 10000000, // Increased timeout for real Docker operations
        maxDockerContainers: 5,
        maxParallelDockerContainers: 1,
        maxTasks: 100,
        minTasks: 1,
        dockerMemoryMB: 512,
        dockerCpuCores: 1,
        workStyle: WorkStyle.DEFAULT, // WorkStyle is imported from workStyle.ts in analyzer.ts
        codingStyleLevel: 0,
        googleGeminiAPIKeyExportNeeded: true,
        googleGeminiApiKey: GEMINI_API_KEY,
    };
    
    const gitRemoteUrl = "https://github.com/lidangzzz/tinycc";

    const task: Task = {
        ID: "test-task-1",
        title: "add more details to the README.",
        description: "For the tinycc project, add more details to the README.",
        priority: 3,
    };

    const taskSolverInstance  = new TaskSolver(config, task , SWEAgentType.GEMINI_CLI, gitRemoteUrl);
    await taskSolverInstance.solve();
    const result = taskSolverInstance.getResult();
    console.log("Below is the result of the task solver:")
    // output all the properties of the result
    console.log(result.report);

    // below is the git diff
    console.log(result.gitDiff);
}, 100000000);