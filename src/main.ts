#!/usr/bin/env bun

import analyzeCodebase from "./analyzer";
import { TaskSolverManager } from "./taskSolverManager";
import { createConfig, type Config } from './config';
import { readConfigWithEnv } from './configReader';
import { getGitRemoteUrls } from './utils/git';
import { CodeCommitter } from './codeCommitter';
import fs from 'fs';
import { getYYMMDDHHMMSS } from './utils/getDateAndTime';
import { startServer } from './server/index';

import type { Task } from './task';

// Global configuration accessible throughout the application
export let appConfig: Config;

export async function main(): Promise<void> {
    // Check if --server argument is provided
    const serverIndex = process.argv.indexOf('--server');
    if (serverIndex > -1) {
        const port = parseInt(process.argv[serverIndex + 1]) || 3000;
        console.log(`🚀 Starting Full Self-Coding Server in server mode on port ${port}`);
        startServer(port);
        return;
    }

    // Load configuration from standard location with environment variable overrides
    let config: Config;

    const configFilePathIndex = process.argv.indexOf('--config');
    if (configFilePathIndex > -1) {
        // Support legacy --config argument for backwards compatibility
        const configFilePath = process.argv[configFilePathIndex + 1];
        if (configFilePath) {
            try {
                const configFileContent = await Bun.file(configFilePath).text();
                const userConfig = JSON.parse(configFileContent);
                config = createConfig(userConfig);
                console.log(`Loaded configuration from ${configFilePath}`);
            } catch (error) {
                console.error(`Error loading or parsing config file at ${configFilePath}:`, error);
                process.exit(1);
            }
        } else {
            console.error('Error: --config argument requires a path to a configuration file.');
            process.exit(1);
        }
    } else {
        // Use ConfigReader to load from standard location with env var support
        try {
            config = readConfigWithEnv();
            console.log('Loaded configuration from ~/.config/full-self-coding/config.json');
        } catch (error) {
            console.error('Error loading configuration:', error);
            process.exit(1);
        }
    }

    // Store configuration globally for later use
    appConfig = config;

    // Log key configuration details
    console.log('Configuration loaded:');

    console.log(`  Agent Type: ${config.agentType}`);
    console.log(`  Max Docker Containers: ${config.maxDockerContainers}`);
    console.log(`  Docker Image: ${config.dockerImageRef}`);
    console.log(`  Work Style: ${config.workStyle}`);
    console.log(`The full config body:`);
    console.log(JSON.stringify(config, null, 2));

    let gitRemoteUrl: string;
    try {
        const { fetchUrl } = await getGitRemoteUrls(config.useGithubSSH);
        gitRemoteUrl = fetchUrl || ''; // Use fetchUrl, or empty string if not found
        //console.log(`fetchUrl: ${fetchUrl}`);
        if (!gitRemoteUrl) {
            throw new Error("Could not determine git remote URL.");
        }
        console.log(`Detected Git remote URL: ${gitRemoteUrl}`);
    } catch (error) {
        console.error("Error getting git remote URL:", error);
        process.exit(1);
    }

    // // Step 1: analyze the codebase and get tasks
    const tasks: Task[] = await analyzeCodebase(config, gitRemoteUrl);
    // for (const task of tasks) {
    //     console.log(`Task: ${task.description}`);
    // }

    // Step 2: execute tasks based on analysis
    
    const taskSolverManager = new TaskSolverManager(config, gitRemoteUrl);
    for (const task of tasks) {
        taskSolverManager.addTask(task);
    }
    await taskSolverManager.start();

    const allTaskReports = taskSolverManager.getReports();

    // step 4. do code commit
    const codeCommitter = new CodeCommitter(allTaskReports);
    await codeCommitter.commitAllChanges();

    // step 5. save the final report to "./.fsc/finalReport.txt"
    const yymmddhhmmss = getYYMMDDHHMMSS();


    // Save final report to ~/Library/Logs/full-self-coding directory
    const logDir = process.env.HOME + "/Library/Logs/full-self-coding";

    // Create the directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Write the final report
    const reportPath = logDir + "/finalReport_" + yymmddhhmmss + ".txt";
    fs.writeFileSync(reportPath, JSON.stringify(allTaskReports, null, 2));

    console.log(`Final report saved to "${reportPath}"`);
}

// Call the main function if this file is run directly
if (import.meta.main) {
    main().catch(console.error);
}