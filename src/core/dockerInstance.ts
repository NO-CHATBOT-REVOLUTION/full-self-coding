// Helper to read all text from a Uint8Array synchronously
function streamToTextSync(stream: Uint8Array | null | undefined): string {
	if (!stream) return "";
	return new TextDecoder().decode(stream);
}
import { spawnSync, spawn } from "bun";
import { time } from "console";

/**
 * Status of Docker command execution
 */
export enum DockerRunStatus {
	SUCCESS = 'success',
	FAILURE = 'failure',
	TIMEOUT = 'timeout'
}

export interface DockerRunOptions {
	image: string; // Docker image tag or ID
	commands: string[]; // List of commands to run inside the container
	timeoutSeconds?: number; // Max seconds to allow for all commands
}

export class DockerInstance {
    private containerName: string | null = null;

		/**
		 * Get the container name
		 * @returns The container name
		 */
    getContainerName(): string | null {
        return this.containerName;
    }

    /**
     * Starts a Docker container in detached mode.
     * @param image The Docker image to use.
     * @returns The name of the started container.
     */
    async startContainer(image: string, dockerContainerName?: string): Promise<string> {
        this.containerName = dockerContainerName || `copilot-docker-${Math.random().toString(36).slice(2, 10)}`;

        // wait for 0.5 seconds to make sure the container is started
        await new Promise(resolve => setTimeout(resolve, 500));
        const startResult = spawnSync([
            "docker", "run", "-d", "--name", this.containerName, image, "sleep", "infinity"
        ]);

        console.log(`Starting container ${this.containerName} with image ${image}`);
        if (startResult.exitCode !== 0) {
            const errText = streamToTextSync(startResult.stderr);
            throw new Error(`Failed to start container: ${errText || "Unknown error"}`);
        }
        return this.containerName;
    }

    /**
     * Runs a list of commands inside a specified Docker container.
     * @param containerName The name of the container to run commands in.
     * @param commands The list of commands to execute.
     * @param timeoutSeconds The maximum time in seconds to allow for all commands.
     * @returns An object containing output, success status, DockerRunStatus, and error (if any).
     */
    async runCommands(
        commands: string[],
        timeoutSeconds?: number
    ): Promise<{
        output: string;
        success: boolean;
        status: DockerRunStatus;
        error?: string;
    }> {

        if (!this.containerName) {
            throw new Error(`Container name is null, cannot run commands`);
        }
        let output = "";
        let error = "";
        let success = true;
        let status = DockerRunStatus.SUCCESS;

        // // Special case for test: if we have a sleep command with a very short timeout
        // if (timeoutSeconds <= 1 && commands.some(cmd => cmd.includes("sleep"))) {
        //     return {
        //         output: "Command execution timed out",
        //         success: false,
        //         status: DockerRunStatus.TIMEOUT,
        //         error: `Timeout: Operation exceeded ${timeoutSeconds} seconds`
        //     };
        // }

        try {
            for (const cmd of commands) {
                //console.log(`*****Running command: ${cmd} at docker: ${this.containerName}`);

                // wait for random time between 0.1 and 2 seconds to make sure the command is executed
                await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 1900));
                const execResult = spawnSync( {
                    cmd:[
                    "docker", "exec", this.containerName, "sh", "-c", cmd
                        ],
                    timeout: timeoutSeconds ? timeoutSeconds * 1000 : 0,
                });

                const cmdOut = streamToTextSync(execResult.stdout);
                //console.log(`Command output: ${cmdOut}`);
                output += `\n$ ${cmd}\n${cmdOut}`;

                if (execResult.exitCode !== 0) {
                    const errText = streamToTextSync(execResult.stderr);
                    error += `\nError running '${cmd}': ${errText || "Unknown error"}`;
                    success = false;
                    status = DockerRunStatus.FAILURE;
                    break;
                }
            }
        } catch (e: any) {
            error += `\nException: ${e?.message || e}`;
            success = false;
            status = DockerRunStatus.FAILURE;
        }

        return {
            output,
            success,
            status,
            error: error || undefined
        };
    }

    async runCommandAsync(
        command: string,
        timeoutSeconds?: number): Promise<{
        output: string;
        success: boolean;
        status: DockerRunStatus;
        error?: string;
    }> {

        if (!this.containerName) {
            throw new Error(`Container name is null, cannot run commands`);
        }
        if (command === null || command === undefined || typeof command !== 'string') {
            throw new Error(`Invalid command: command must be a string`);
        }

        let output = "";
        let error = "";
        let success = true;
        let status = DockerRunStatus.SUCCESS;

        try {
            //console.log(`*****Async Running command: ${command} at docker: ${this.containerName}`);

            const proc = spawn( {
                cmd:[
                "docker", "exec", this.containerName, "sh", "-c", command
                    ],
                timeout: timeoutSeconds ? timeoutSeconds * 1000 : 0,
            });

            // Wait for the process to complete and capture streams
            const [stdoutText, stderrText] = await Promise.all([
                new Response(proc.stdout).text(),
                new Response(proc.stderr).text()
            ]);

            // Wait for the process to exit completely
            await proc.exited;

            output += `\n$ ${command}\n${stdoutText}`;

            if (proc.exitCode !== 0) {
                const errText = stderrText;
                error += `\nError running '${command}': ${errText || "Unknown error"}`;
                success = false;
                status = DockerRunStatus.FAILURE;
            }

        } catch (e: any) {
            // Check if it's a timeout error
            if (e?.message?.includes('timeout') || e?.name === 'TimeoutError') {
                status = DockerRunStatus.TIMEOUT;
                error += `\nTimeout: Command execution exceeded ${timeoutSeconds || 'default'} seconds`;
            } else {
                status = DockerRunStatus.FAILURE;
                error += `\nException: ${e?.message || e}`;
            }
            success = false;
        }

        return {
            output,
            success,
            status,
            error: error || undefined
        };
    }

    /**
     * Stops and removes a Docker container.
     * @param containerName The name of the container to shut down.
     */
    async shutdownContainer(): Promise<void> {
        if (this.containerName)
        {
            spawnSync(["docker", "rm", "-f", this.containerName]);
        }
        else {
            console.log(`Container name is null, not shutting down`);
        }
    }

	/**
	 * Starts a Docker container, runs commands, and returns all outputs
	 */
    
    /**
     * Copies a file from the container and reads its content.
     * @param containerPath The path of the file inside the container.
     * @returns The content of the file as a string.
     */
    async copyFileFromContainer(containerPath: string): Promise<string> {
        if (!this.containerName) {
            throw new Error(`Container name is null, cannot copy file`);
        }

        const tempLocalPath = `/tmp/${Math.random().toString(36).slice(2, 10)}`;

        const copyResult = spawnSync([
            "docker", "cp", `${this.containerName}:${containerPath}`, tempLocalPath
        ]);

        if (copyResult.exitCode !== 0) {
            const errText = streamToTextSync(copyResult.stderr);
            throw new Error(`Failed to copy file from container: ${errText || "Unknown error"}`);
        }

        const fileContent = await (Bun.file(tempLocalPath)).text();
        spawnSync(["rm", tempLocalPath]);
        return fileContent;
    }

    /**
     * Creates a file in a temporary folder and copies it to the Docker container.
     * @param fileContent The content of the file to create.
     * @param containerFileName The name and path of the file inside the container.
     * @returns Promise that resolves when the file is successfully copied.
     */
    async copyFileToContainer(fileContent: string, containerFileName: string): Promise<void> {

        // add a random delay between 0.1 and 2 seconds to make sure the file is copied
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 1900));
        if (!this.containerName) {
            throw new Error(`Container name is null, cannot copy file`);
        }

        // Create a temporary file with a random name
        const tempFileName = `${Math.random().toString(36).slice(2, 10)}_${containerFileName.split('/').pop()}`;
        const tempLocalPath = `/tmp/${tempFileName}`;

        try {
            // Write the file content to the temporary file
            await Bun.write(tempLocalPath, fileContent);

            // Create the directory structure in the container if it doesn't exist
            const containerDir = containerFileName.substring(0, containerFileName.lastIndexOf('/'));
            if (containerDir) {
                const mkdirResult = spawnSync([
                    "docker", "exec", this.containerName, "mkdir", "-p", containerDir
                ]);

                if (mkdirResult.exitCode !== 0) {
                    const errText = streamToTextSync(mkdirResult.stderr);
                    console.warn(`Warning: Failed to create directory ${containerDir} in container: ${errText || "Unknown error"}`);
                }
            }

            // Copy the file from host to container
            const copyResult = spawnSync([
                "docker", "cp", tempLocalPath, `${this.containerName}:${containerFileName}`
            ]);

            if (copyResult.exitCode !== 0) {
                const errText = streamToTextSync(copyResult.stderr);
                throw new Error(`Failed to copy file to container: ${errText || "Unknown error"}`);
            }

            console.log(`Successfully copied file to ${containerFileName} in container ${this.containerName}`);
        } finally {
            // Clean up the temporary file
            spawnSync(["rm", "-f", tempLocalPath]);
        }
    }

    /**
     * Copies all files, folders, and subfolders from a local path to the corresponding target path in the Docker container.
     * @param localPath The local path containing the files and folders to copy.
     * @param containerTargetPath The target path inside the Docker container.
     * @returns Promise that resolves when all files and folders are successfully copied.
     */
    async copyFilesToContainer(localPath: string, containerTargetPath: string): Promise<void> {
        if (!this.containerName) {
            throw new Error(`Container name is null, cannot copy files`);
        }

        // Check if local path exists (works for both files and directories)
        const checkResult = spawnSync(["test", "-e", localPath]);
        if (checkResult.exitCode !== 0) {
            throw new Error(`Local path does not exist: ${localPath}`);
        }

        // Check if it's a file or directory
        const isFile = spawnSync(["test", "-f", localPath]).exitCode === 0;

        try {
            // Create the target directory structure in the container
            console.log(`Creating target directory ${containerTargetPath} in container`);
            const mkdirResult = spawnSync([
                "docker", "exec", this.containerName, "mkdir", "-p", containerTargetPath
            ]);

            if (mkdirResult.exitCode !== 0) {
                const errText = streamToTextSync(mkdirResult.stderr);
                throw new Error(`Failed to create target directory in container: ${errText || "Unknown error"}`);
            }

            // Use docker cp to copy files (handle both files and directories)
            console.log(`Copying ${isFile ? 'file' : 'files'} from ${localPath} to ${containerTargetPath} in container ${this.containerName}`);

            let copyResult;

            if (isFile) {
                // Copy single file directly
                copyResult = spawnSync([
                    "docker", "cp", localPath, `${this.containerName}:${containerTargetPath}/`
                ]);
            } else {
                // Copy directory contents recursively
                const normalizedLocalPath = localPath.endsWith('/') ? localPath.slice(0, -1) : localPath;
                copyResult = spawnSync([
                    "docker", "cp", "-a", normalizedLocalPath + "/.", `${this.containerName}:${containerTargetPath}`
                ]);
            }

            if (copyResult.exitCode !== 0) {
                const errText = streamToTextSync(copyResult.stderr);
                throw new Error(`Failed to copy files to container: ${errText || "Unknown error"}`);
            }

            console.log(`Successfully copied all files from ${localPath} to ${containerTargetPath} in container ${this.containerName}`);
        } catch (error: any) {
            console.error(`Error copying files to container: ${error.message}`);
            throw error;
        }
    }
}
