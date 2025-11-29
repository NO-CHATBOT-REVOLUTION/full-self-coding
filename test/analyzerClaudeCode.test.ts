import { expect, test, mock } from "bun:test";
import { analyzeCodebase } from "../src/core/analyzer";
import { type Config, SWEAgentType } from "../src/core/config";
import type { Task } from "../src/core/task";
import { WorkStyle } from "../src/core/workStyle";
import { DockerInstance, DockerRunStatus } from "../src/core/dockerInstance";
import {CLAUDE_CODE_API_KEY, CLAUDE_CODE_API_URL} from "./apiKeySetup";


test("analyzeCodebase generates tasks correctly with claude code agent in real Docker",  async () => {
    const config: Config = {
        agentType: SWEAgentType.CLAUDE_CODE,
        dockerImageRef: "node:latest", // Use a real Docker image
        dockerTimeoutSeconds: 10000, // Increased timeout for real Docker operations
        maxDockerContainers: 5,
        maxParallelDockerContainers: 1,
        maxTasks: 5,
        minTasks: 1,
        dockerMemoryMB: 512,
        dockerCpuCores: 1,
        workStyle: WorkStyle.DEFAULT, // WorkStyle is imported from workStyle.ts in analyzer.ts
        anthropicAPIKeyExportNeeded: true,
        anthropicAPIBaseUrl: CLAUDE_CODE_API_URL,
        anthropicAPIKey: CLAUDE_CODE_API_KEY,
        codingStyleLevel: 0,
    };
    const gitRemoteUrl = "https://github.com/TinyCC/tinycc"; // Real Git repo

    const tasks = await analyzeCodebase(config, gitRemoteUrl, true,);

    // Assertions
    expect(tasks).toBeArray();
    expect(tasks.length).toBeGreaterThan(0); // Expect at least one task
    // Further assertions can be added if the exact output of gemini CLI is predictable
    expect(tasks[0]).toHaveProperty("ID");
    expect(tasks[0]).toHaveProperty("title");
    expect(tasks[0]).toHaveProperty("description");
}, 100000000);
