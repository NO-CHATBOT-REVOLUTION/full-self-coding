import { type Config, SWEAgentType } from "../config";



function claudeRunTaskWithAnthropicBaseURLAndAPIKey(baseURL: string, apiKey: string): string {
    const command = `export ANTHROPIC_BASE_URL=${baseURL} && export ANTHROPIC_AUTH_TOKEN=${apiKey} && export IS_SANDBOX=1 && claude -p "all the task descriptions are located at /app/taskSolverPrompt.txt, please read and execute" --allowedTools "Bash,ReadEdit,Glob,Grep,WebFetch,WebSearch,Write,TodoWrite,SlashCommand" --permission-mode bypassPermissions`;
    return command;
}

function claudeRunTaskWithAnthropicAPIKey(apiKey: string): string {
    const command = `export ANTHROPIC_AUTH_TOKEN=${apiKey} && export IS_SANDBOX=1 && claude -p "all the task descriptions are located at /app/taskSolverPrompt.txt, please read and execute" --allowedTools "Bash,ReadEdit,Glob,Grep,WebFetch,WebSearch,Write,TodoWrite,SlashCommand" --permission-mode bypassPermissions`;
    return command;
}

export function claudeRunAnalyzerWithAnthropicBaseURLAndAPIKey(baseURL: string, apiKey: string): string {
    const command = `export ANTHROPIC_BASE_URL=${baseURL} && export ANTHROPIC_AUTH_TOKEN=${apiKey} && export IS_SANDBOX=1 && claude -p "all the task descriptions are located at /app/codeAnalyzerPrompt.txt, please read and execute" --allowedTools "Bash,ReadEdit,Glob,Grep,WebFetch,WebSearch,Write,TodoWrite,SlashCommand" --permission-mode bypassPermissions`;
    return command;
}

function claudeRunAnalyzerWithAnthropicAPIKey(apiKey: string): string {
    const command = `export ANTHROPIC_AUTH_TOKEN=${apiKey} && export IS_SANDBOX=1 && claude -p "all the task descriptions are located at /app/codeAnalyzerPrompt.txt, please read and execute" --allowedTools "Bash,ReadEdit,Glob,Grep,WebFetch,WebSearch,Write,TodoWrite,SlashCommand" --permission-mode bypassPermissions`;
    return command;
}

/**
 * Returns the command to run Claude, either for analysis or task solving.
 * @param config The configuration object.
 * @param bIsAnalyzer Whether to run the analyzer or the task solver. True for analyzer, false for task solver.
 * @returns The command to run Claude.
 */
export function getClaudeCommand(config: Config, bIsAnalyzer: boolean = true): string {
    if (config.agentType !== SWEAgentType.CLAUDE_CODE) {
        throw new Error("getClaudeAnalyzeCommand: config.agentType must be CLAUDE_CODE");
    }

    if (config.anthropicAPIKeyExportNeeded === false) {
      
        if (bIsAnalyzer) {
          return `export IS_SANDBOX=1 && claude -p "all the task descriptions are located at /app/codeAnalyzerPrompt.txt, please read and execute" --allowedTools "Bash,ReadEdit,Glob,Grep,WebFetch,WebSearch,Write,TodoWrite,SlashCommand" --permission-mode bypassPermissions`;
        }
        else {
          return `export IS_SANDBOX=1 && claude -p "all the task descriptions are located at /app/taskSolverPrompt.txt, please read and execute" --allowedTools "Bash,ReadEdit,Glob,Grep,WebFetch,WebSearch,Write,TodoWrite,SlashCommand" --permission-mode bypassPermissions`;
        }
    }

    // below are all the cases when we need to export the API key
    // which means that config.anthropicAPIKeyExportNeeded is true

    // 1. if both API key and base url endpoint are needed
    if (config.anthropicAPIKey && config.anthropicAPIBaseUrl) {
        if (bIsAnalyzer) {
            return claudeRunAnalyzerWithAnthropicBaseURLAndAPIKey(config.anthropicAPIBaseUrl, config.anthropicAPIKey);
        }
        else {
            return claudeRunTaskWithAnthropicBaseURLAndAPIKey(config.anthropicAPIBaseUrl, config.anthropicAPIKey);
        }
    }
    // 2. if only API key is needed
    else if (config.anthropicAPIKey){
        if (bIsAnalyzer) {
            return claudeRunAnalyzerWithAnthropicAPIKey(config.anthropicAPIKey);
        }
        else {
            return claudeRunTaskWithAnthropicAPIKey(config.anthropicAPIKey);
        }
    }

    throw new Error("getClaudeAnalyzeCommand: config.anthropicAPIKey or config.anthropicAPIBaseUrl must be provided");
}

// export function getClaudeTaskSolverCommand(config: Config): string {
//     if (config.agentType !== SWEAgentType.CLAUDE_CODE) {
//         throw new Error("getClaudeTaskSolverCommand: config.agentType must be CLAUDE_CODE");
//     }

//     if (config.anthropicAPIKeyExportNeeded === false) {
//         return `export IS_SANDBOX=1 && claude -p "all the task descriptions are located at /app/codeAnalyzerPrompt.txt, please read and execute" --allowedTools "Bash,ReadEdit,Glob,Grep,WebFetch,WebSearch,Write,TodoWrite,SlashCommand" --permission-mode bypassPermissions`;
//     }

//     // below are all the cases when we need to export the API key
//     // which means that config.anthropicAPIKeyExportNeeded is true

//     // 1. if both API key and base url endpoint are needed
//     if (config.anthropicAPIKey && config.anthropicAPIBaseUrl) {
// export function getClaudeTaskSolverCommand(config: Config): string 