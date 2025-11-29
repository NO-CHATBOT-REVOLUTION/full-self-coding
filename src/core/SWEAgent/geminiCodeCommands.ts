import type { Config } from "../config";


// TODO: Should we remove the bIsAnalyzer argument or keep it here as part of the interface?
export function getGeminiCommand(config:Config , bIsAnalyzer: boolean = true): string {
    let geminiCommand = `gemini -p "all the task descriptions are located at /app/codeAnalyzerPrompt.txt, please read and execute" --yolo`;
    let apiKeyExportCommand: string | undefined;

    if (config.googleGeminiApiKey && config.googleGeminiAPIKeyExportNeeded) {
        apiKeyExportCommand = `export GEMINI_API_KEY=${config.googleGeminiApiKey}`;
    } else if (config.anthropicAPIKey && config.anthropicAPIKeyExportNeeded) {
        apiKeyExportCommand = `export ANTHROPIC_API_KEY=${config.anthropicAPIKey}`;
    } else if (config.openAICodexApiKey && config.openAICodexAPIKeyExportNeeded) {
        apiKeyExportCommand = `export OPENAI_API_KEY=${config.openAICodexApiKey}`;
    }
    
    if (apiKeyExportCommand) {
        geminiCommand = `${apiKeyExportCommand} && ${geminiCommand}`;
    }

    return geminiCommand;
}