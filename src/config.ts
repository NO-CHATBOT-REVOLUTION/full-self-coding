import {WorkStyle} from './workStyle';

/**
 * Available types of Software Engineering agents
 */
export enum SWEAgentType {
    GEMINI_CLI = 'gemini-cli',
    CLAUDE_CODE = 'claude-code',
    CODEX = 'codex',
    CURSOR = 'cursor',
}

/**
 * Main configuration interface for the application
 */
export interface Config {
    /**
     * The type of Software Engineering agent to use
     */
    agentType: SWEAgentType;

    /**
     * Optional API key configuration for the agent.
     * Any of the following fields provided, the agent will use it for exporting API keys.
     * For example, if googleGeminiApiKey is provided, the agent will export it as an environment variable.
     * The docker container will have access to these environment variables,
     * and run the commands with the API keys, for example,
     * 
     * export GEMINI_API_KEY=your-google-gemini-api-key
     * 
     * If none are provided, and the APIKeyExportNeeded is set to false,
     * the agent will not import any API keys.
     */
    googleGeminiAPIKeyExportNeeded?: boolean;

    /** 
     * API key for Google Gemini CLI
     * export GEMINI_API_KEY=your-google-gemini-api-key
    */
    googleGeminiApiKey?: string;

    /**
     * API key for Claude Code
     * export export ANTHROPIC_API_KEY='your-api-key-here'
     */
    anthropicAPIKey?: string;
    anthropicAPIKeyExportNeeded?: boolean;
    anthropicAPIBaseUrl?: string;

    /**
     * API key for OpenAI Codex
     * export OPENAI_API_KEY=your-openai-api-key
     */
    openAICodexApiKey?: string;
    openAICodexAPIKeyExportNeeded?: boolean;


    /**
     * API key for Cursor CLI
     */
    cursorAPIKey?: string; 
    cursorAPIKeyExportNeeded?:boolean;

    /**
     * Maximum number of Docker containers that can run locally
     * @default 5 if not specified
     */
    maxDockerContainers?: number;

    /**
     * Docker image reference to use for containers
     * Format: repository/image:tag
     * @example "node:latest"
     */
    dockerImageRef?: string;

    /**
     * Max number of docker containers that can run in parallel
     * @default 2 if not specified
     */
    maxParallelDockerContainers?: number;

    /**
     * Timeout in seconds for Docker container operations
     * @default 300 if not specified
     */
    dockerTimeoutSeconds?: number;

    /**
     * Max number of tasks that analyzer can detect
     * @default 10 if not specified
     */
    maxTasks?: number;

    /**
     * Minimum number of tasks that analyzer must detect
     * @default 1 if not specified
     */
    minTasks?: number;

    /**
     * Max amount of memory (in MB) that each Docker container can use
     * @default 512 if not specified
     */
    dockerMemoryMB?: number;

    /**
     * Number of CPU cores to assign to each Docker container
     * @default 1 if not specified
     */
    dockerCpuCores?: number;

    /**
     * work style of the agent
     * @default 'default' if not specified
     */
    workStyle?: WorkStyle;

    /**
     * customized work style of the agent
     */
    customizedWorkStyle?: string;

    /**
     * coding style of the agent
     * @default 'default' if not specified
     */
    codingStyleLevel?: number;

    /**
     * customized coding style of the agent
     */
    customizedCodingStyle?: string;

    /**
     * 
     * customized message of the agent, including the
     * environment variables, instructions, certain task prompts,
     * document references, and all other customized messages
     * that user want to send to the agent
     */
    customizedMessage?: string;

    /**
     * use Github ssh instead of https.
     * If you want to access to your private repositories, 
     * you must set this to true, and have set up ssh keys for Github.
     * This is the only way to access and git clone your private repositories.
     */
    useGithubSSH?: boolean;

    /**
     * special instructions for task solver
     */
    specialInstructionsForTaskSolver?: string;

    /**
     * special instructions for code analyzer
     */
    specialInstructionsForCodeAnalyzer?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Config = {
    agentType: SWEAgentType.CLAUDE_CODE,
    maxDockerContainers: 10,
    dockerImageRef: 'node:latest',
    maxParallelDockerContainers: 10,
    dockerTimeoutSeconds: 300000,
    maxTasks: 10,
    minTasks: 1,
    dockerMemoryMB: 512,
    dockerCpuCores: 1,
    workStyle: WorkStyle.DEFAULT,
    codingStyleLevel: 0,
};

/**
 * Validates and merges user config with default config
 * @param userConfig Partial configuration provided by the user
 * @returns Complete configuration with defaults applied
 */
export function createConfig(userConfig: Partial<Config>): Config {
    return {
        ...DEFAULT_CONFIG,
        ...userConfig,
    };
}
