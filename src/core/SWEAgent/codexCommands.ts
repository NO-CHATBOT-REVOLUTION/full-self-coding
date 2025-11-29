import type { Config } from "../config";

export function getCodexCommand(config: Config, bIsAnalyzer: boolean = true): string {

    let cmd = `codex exec --sandbox danger-full-access "all the task descriptions are located at /app/codeAnalyzerPrompt.txt, please read and execute"`

    let apiKeyExportCommand: string | undefined;

    if (config.openAICodexApiKey && config.openAICodexAPIKeyExportNeeded) {
        apiKeyExportCommand = `export OPENAI_API_KEY=${config.openAICodexApiKey}`;
    }

    if (apiKeyExportCommand) {
        cmd = `${apiKeyExportCommand} && ${cmd}`;
    }
    return cmd
}