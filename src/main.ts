import analyzeCodebase from "./analyzer";
import executeTasks from "./taskSolver";
import { createConfig, type Config } from './config';

import type { Task } from './task';

export async function main(): Promise<void> {
    let userConfig: Partial<Config> = {};
    const configFilePathIndex = process.argv.indexOf('--config');
    if (configFilePathIndex > -1) {
        const configFilePath = process.argv[configFilePathIndex + 1];
        if (configFilePath) {
            try {
                const configFileContent = await Bun.file(configFilePath).text();
                userConfig = JSON.parse(configFileContent);
                console.log(`Loaded configuration from ${configFilePath}`);
            } catch (error) {
                console.error(`Error loading or parsing config file at ${configFilePath}:`, error);
                process.exit(1);
            }
        } else {
            console.error('Error: --config argument requires a path to a configuration file.');
            process.exit(1);
        }
    }

    const config = createConfig(userConfig);

    // Step 1: analyze the codebase and get tasks
    const tasks: Task[] = await analyzeCodebase(config);

    // Step 2: execute tasks based on analysis
    await executeTasks(tasks, config);
}

if (import.meta && import.meta.main) {
	// When executed directly as a Bun script / terminal tool, run the two steps.
	void main();
}
