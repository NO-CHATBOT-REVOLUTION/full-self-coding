#!/usr/bin/env bun

import { Command } from 'commander';
import {
  analyzeCodebase,
  TaskSolverManager,
  createConfig,
  type Config,
  readConfigWithEnv,
  getGitRemoteUrls,
  CodeCommitter,
  getYYMMDDHHMMSS,
  type Task
} from '../core';
import fs from 'fs';

// Global configuration accessible throughout the application
export let appConfig: Config;

export async function runFullAnalysis(): Promise<void> {
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
  console.log(JSON.stringify(config, null, 2));

  let gitRemoteUrl: string;
  try {
    const { fetchUrl } = await getGitRemoteUrls(config.useGithubSSH);
    gitRemoteUrl = fetchUrl || ''; // Use fetchUrl, or empty string if not found
    if (!gitRemoteUrl) {
      throw new Error("Could not determine git remote URL.");
    }
    console.log(`Detected Git remote URL: ${gitRemoteUrl}`);
  } catch (error) {
    console.error("Error getting git remote URL:", error);
    process.exit(1);
  }

  // Step 1: analyze the codebase and get tasks
  const tasks: Task[] = await analyzeCodebase(config, gitRemoteUrl);

  // Step 2: execute tasks based on analysis
  const taskSolverManager = new TaskSolverManager(config, gitRemoteUrl);
  for (const task of tasks) {
    taskSolverManager.addTask(task);
  }
  await taskSolverManager.start();

  const allTaskReports = taskSolverManager.getReports();

  // Step 3: do code commit
  const codeCommitter = new CodeCommitter(allTaskReports);
  await codeCommitter.commitAllChanges();

  // Step 4: save the final report
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

export function createCLI(): Command {
  const program = new Command();

  program
    .name('full-self-coding')
    .description('CLI tool for automated code analysis and task execution')
    .version('1.0.1');

  program
    .command('run')
    .description('Run the full self-coding analysis and task execution')
    .option('-c, --config <path>', 'Path to configuration file')
    .action(async (options) => {
      try {
        // If config option is provided, add it to process.argv for the main function to pick up
        if (options.config) {
          process.argv.push('--config', options.config);
        }
        await runFullAnalysis();
      } catch (error) {
        console.error('Error running full analysis:', error);
        process.exit(1);
      }
    });

  // Default action - run full analysis if no command is provided
  program.action(async () => {
    try {
      await runFullAnalysis();
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

  return program;
}

// Export for use as a library
export { runFullAnalysis as main };