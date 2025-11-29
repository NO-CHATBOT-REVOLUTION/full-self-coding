import type { Config } from "../config";

// cursor installation requires multiple commands like this:
// cursorinstallationWrapper returns a list of installation commands
export function CursorInstallationWrapper():Array<string>{
    return [
        `curl https://cursor.com/install -fsS | bash`,
        `export PATH="/root/.cursor/bin:$PATH"`,
        `source ~/.bashrc`,
    ]
}

export function getCursorCommand(config: Config, bIsAnalyzer: boolean = true): string {

    let cmd = `cursor-agent -p --force "all the task descriptions are located at /app/codeAnalyzerPrompt.txt, please read and execute"`

    let apiKeyExportCommand: string | undefined;

    if (config.cursorAPIKey && config.cursorAPIKeyExportNeeded) {
        apiKeyExportCommand = `export CURSOR_API_KEY=${config.cursorAPIKey}`;
    }

    if (apiKeyExportCommand) {
        cmd = `${apiKeyExportCommand} && ${cmd}`;
    }
    return cmd

}