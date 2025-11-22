import type { Task } from './task';
import { type Config, SWEAgentType } from './config';
import { DockerInstance, DockerRunStatus } from './dockerInstance';
import { analyzerPrompt } from './prompts/analyzerPrompt';
import { getCodingStyle } from './codingStyle';
import { getWorkStyleDescription, WorkStyle } from './workStyle';
import { trimJSONObjectArray } from './utils/trimJSON';
import { getClaudeCommand } from './SWEAgent/claudeCodeCommands';
import { getGeminiCommand } from './SWEAgent/geminiCodeCommands';
import { CursorInstallationWrapper, getCursorCommand } from './SWEAgent/cursorCommands';
import { getCodexCommand } from './SWEAgent/codexCommands';

/**
 * Analyzes the codebase and generates a list of tasks to be executed
 * @returns Promise<Task[]> Array of tasks identified from the codebase analysis
 */
export async function analyzeCodebase(
    config: Config, 
    gitRemoteUrl: string, 
    shutdownContainer: boolean = true,
    extraComandsBeforeAnalysis?: string
): Promise<Task[]> {

    const docker = new DockerInstance();
    let containerName: string | undefined;
    let tasks: Task[] = [];

    try {
        const dockerImageRef = config.dockerImageRef || 'node:latest';

        // the name of container = "analyzer-container" + date-and-time-in-yymmddhhmmss
        const containerName = `analyzer-container-${Date.now().toString().substring(2, 14)}`;
        await docker.startContainer(dockerImageRef, containerName);

        const allCommands: string[] = [];

        // 0. Create the fsc directory and prompt.txt
        // 0.1 run docker command that create /app folder
        await docker.runCommands(['mkdir', '-p', '/app']);

        // 0.2 get the prompt
        const workStyleDescription = await getWorkStyleDescription(config.workStyle || WorkStyle.DEFAULT, { customLabel: config.customizedWorkStyle });
        const codingStyleDescription = getCodingStyle(config.codingStyleLevel || 0);
        const prompt = analyzerPrompt(workStyleDescription, codingStyleDescription, config);

        // 0.3 send the file to /app/codeAnalyzerPrompt.txt
        await docker.copyFileToContainer(prompt, '/app/codeAnalyzerPrompt.txt');
        // step 0 done

        // 0.4 copy all files related to git to the container
        const os = await import('os');
        const fs = await import('fs');
        const path = await import('path');

        // 0.4.1 create ~/.ssh folder in the container
        await docker.runCommands(['mkdir', '-p', '/root/.ssh']);

        // 0.4.2 copy all files in ~/.ssh to ~/.ssh (/root/.ssh) in the container
        const sshPath = path.join(os.homedir(), '.ssh');
        if (fs.existsSync(sshPath)) {
            console.log(`Copying SSH files from ${sshPath} to container...`);
            await docker.copyFilesToContainer(sshPath, '/root/.ssh');
        } else {
            console.warn(`SSH directory not found at ${sshPath}, skipping SSH file copy`);
        }

        // 0.4.3 read ~/.gitconfig on local machine using fs
        const gitConfigPath = path.join(os.homedir(), '.gitconfig');
        if (fs.existsSync(gitConfigPath)) {
            console.log(`Reading git config from ${gitConfigPath}...`);
            const dotGitConfigFileText = await fs.promises.readFile(gitConfigPath, 'utf8');
            // 0.4.4 copy ~/.gitconfig to ~/.gitconfig (/root/.gitconfig) in the container
            await docker.copyFileToContainer(dotGitConfigFileText, '/root/.gitconfig');
        } else {
            console.warn(`Git config file not found at ${gitConfigPath}, skipping git config copy`);
        }

        // 0.4.4 remove the ~/.ssh/config from the docker container if it exists
        await docker.runCommands(['rm -f /root/.ssh/config']);


        // 1. Clone the source code repository
        allCommands.push(`git clone ${gitRemoteUrl} /app/repo`);

        // 2. Setup necessary tools (curl, nodejs, npm)
        allCommands.push("apt-get update");
        allCommands.push("apt-get install -y curl");
        allCommands.push("curl -fsSL https://deb.nodesource.com/setup_20.x | bash -");
        allCommands.push("apt-get install -y nodejs");

        // 3. Install gemini-cli globally if agent type is GEMINI_CLI
        switch (config.agentType) {
            case SWEAgentType.GEMINI_CLI:
                allCommands.push(`npm install -g @google/gemini-cli`);
                break;
            case SWEAgentType.CLAUDE_CODE:
                allCommands.push(`npm install -g @anthropic-ai/claude-code`);
                break;
            case SWEAgentType.CODEX:
                allCommands.push(`npm install -g @openai/codex`);
                break;
            case SWEAgentType.CURSOR:
                allCommands.push(...CursorInstallationWrapper());
                break;
            default:
                throw new Error(`Unsupported agent type: ${config.agentType}`);
        }



        switch (config.agentType) {
            case SWEAgentType.GEMINI_CLI:
                if (extraComandsBeforeAnalysis) {
                    allCommands.push(extraComandsBeforeAnalysis);
                }
                allCommands.push(getGeminiCommand(config, true));
                break;
            case SWEAgentType.CLAUDE_CODE:
                allCommands.push(getClaudeCommand(config, true));
                break;
            case SWEAgentType.CODEX:
                allCommands.push(getCodexCommand(config , true))
                break;
            case SWEAgentType.CURSOR:
                allCommands.push(getCursorCommand(config, true));
                break;
            default:
                throw new Error(`Unsupported agent type: ${config.agentType}`);
        }

        // console.log("Commands to run in Docker:");
        // for (const command of allCommands) {
        //     console.log(command);
        // }
        console.log("Start to run commands to analyze codebase in Docker...");

        // Execute all commands in a single run
        const dockerResult = await docker.runCommands(
            allCommands,
            config.dockerTimeoutSeconds? config.dockerTimeoutSeconds : 0
        );

        if (dockerResult.status !== DockerRunStatus.SUCCESS) {
            console.error("Docker command execution failed:", dockerResult.error);
            throw new Error(`Docker command execution failed: ${dockerResult.error || dockerResult.output}`);
        }

        // 6. Read the generated tasks.json
        const readTasksCommand = `cat /app/tasks.json`;
        const readTasksResult = await docker.runCommands(
            [readTasksCommand],
            config.dockerTimeoutSeconds? config.dockerTimeoutSeconds : 0
        );

        if (readTasksResult.status !== DockerRunStatus.SUCCESS) {
            console.error("Failed to read tasks.json from Docker:", readTasksResult.error);
            throw new Error(`Failed to read tasks.json from Docker: ${readTasksResult.error || readTasksResult.output}`);
        }

        try {
            const outputTasksInString = trimJSONObjectArray(readTasksResult.output);
            console.log("***Output tasks in string:\n\n", outputTasksInString);
            tasks = JSON.parse(outputTasksInString);
        } catch (error) {
            console.error("Error parsing tasks.json:", error);
            throw new Error(`Error parsing tasks.json: ${error}`);
        }
    } finally {
        if (shutdownContainer) {
            await docker.shutdownContainer();
        }
    }
    return tasks;
}
export default analyzeCodebase;
