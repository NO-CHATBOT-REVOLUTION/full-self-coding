import { spawnSync } from "bun";

function streamToTextSync(stream: Uint8Array | null | undefined): string {
    if (!stream) return "";
    return new TextDecoder().decode(stream);
}

/**
 * Get the fetch and push URLs of the 'origin' remote.
 * If useSSHInsteadOfHTTPS is true, it will return ssh URLs.
 * If useSSHInsteadOfHTTPS is false, it will return https URLs.
 * 
 * @param useSSHInsteadOfHTTPS Whether to use ssh URLs instead of https URLs.
 * @returns An object containing the fetchUrl and pushUrl.  
 * 
 * Here is an example:
 * Github in URL: https://github.com/user/repo.git
 * SSH URL: git@github.com:user/repo.git
 */

export async function getGitRemoteUrls(useSSHInsteadOfHTTPS: boolean = false): Promise<{ fetchUrl?: string; pushUrl?: string }> {

    try {
        const gitRemoteResult = spawnSync(["git", "remote", "-v"]);

        if (gitRemoteResult.exitCode !== 0) {
            console.error("Failed to run git remote command");
            return {};
        }

        const gitRemoteText = streamToTextSync(gitRemoteResult.stdout);
        const lines = gitRemoteText.split('\n').filter(line => line.trim() !== '');
        let fetchUrl: string | undefined;
        let pushUrl: string | undefined;

        for (const line of lines) {
            const parts = line.split(/\s+/);
            if (parts.length >= 2 && parts[0] === 'origin') {
                const url = parts[1];
                const type = parts[2];
                if (type === '(fetch)') {
                    fetchUrl = url;
                } else if (type === '(push)') {
                    pushUrl = url;
                }
            }
        }
        if (!fetchUrl && !pushUrl) {
            console.warn("No git remote 'origin' found.");
        }

        if (useSSHInsteadOfHTTPS && fetchUrl && fetchUrl.startsWith('https://github.com/')) {
            fetchUrl = fetchUrl.replace('https://github.com/', 'git@github.com:');
        }
        if (useSSHInsteadOfHTTPS && pushUrl && pushUrl.startsWith('https://github.com/')) {
            pushUrl = pushUrl.replace('https://github.com/', 'git@github.com:');
        }

        return { fetchUrl, pushUrl };
    } catch (error) {
        console.error("Error getting git remote URLs:", error);
        return {};
    }
}
