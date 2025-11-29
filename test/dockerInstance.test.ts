import { expect, test } from "bun:test";
import { spawnSync } from "bun"; // Added this line
import { DockerInstance, DockerRunStatus } from "../src/core/dockerInstance";

test("DockerInstance runs echo and captures output using separate functions", async () => {
    const instance = new DockerInstance();
    const image = "node:20-alpine";
    const commands = ["echo HelloDocker"];
    let containerName: string | undefined;
    let result: any;

    try {
        containerName = await instance.startContainer(image);
        result = await instance.runCommands(commands, 300);
        if (result.status !== DockerRunStatus.SUCCESS) {
            console.error('Docker error output:', result.error);
        }
        expect(result.status).toBe(DockerRunStatus.SUCCESS);
        expect(result.output).toMatch(/HelloDocker/);
    } finally {
        if (containerName) {
            await instance.shutdownContainer();
        }
    }
});


test("DockerInstance creates and runs hello world Node.js script using separate functions", async () => {
    const instance = new DockerInstance();
    const image = "node:20-alpine";
    const commands = [
        `echo "console.log('Hello, World!')" > /tmp/hello.js`,
        "node /tmp/hello.js"
    ];
    let containerName: string | undefined;
    let result: any;

    try {
        containerName = await instance.startContainer(image);
        result = await instance.runCommands(commands, 30);
        if (result.status !== DockerRunStatus.SUCCESS) {
            console.error('Docker error output:', result.error);
        }
        expect(result.status).toBe(DockerRunStatus.SUCCESS);
        expect(result.output).toMatch(/Hello, World!/);
    } finally {
        if (containerName) {
            await instance.shutdownContainer();
        }
    }
});

// test("DockerInstance handles timeout correctly using separate functions", async () => {
//     const instance = new DockerInstance();
//     const image = "node:20-alpine";
//     const commands = ["sleep 10"]; // Command that will definitely take longer than the timeout
//     let containerName: string | undefined;
//     let result: any;

//     try {
//         containerName = await instance.startContainer(image);
//         result = await instance.runCommands( commands, 1); // Very short timeout to trigger timeout status
        
//         // Check both status and success flag
//         expect(result.status).toBe(DockerRunStatus.TIMEOUT);
//         expect(result.success).toBe(false);
//         expect(result.error).toContain("Timeout");
//     } finally {
//         if (containerName) {
//             await instance.shutdownContainer();
//         }
//     }
// });

test("DockerInstance handles command failure correctly using separate functions", async () => {
    const instance = new DockerInstance();
    const image = "node:20-alpine";
    const commands = ["nonexistentcommand"]; // Command that doesn't exist
    let containerName: string | undefined;
    let result: any;

    try {
        containerName = await instance.startContainer(image);
        result = await instance.runCommands(commands, 10);
        expect(result.status).toBe(DockerRunStatus.FAILURE);
    } finally {
        if (containerName) {
            await instance.shutdownContainer();
        }
    }
});

test("DockerInstance shuts down container correctly", async () => {
    const instance = new DockerInstance();
    const image = "node:20-alpine";
    let containerName: string | undefined;

    try {
        containerName = await instance.startContainer(image);
        expect(containerName).toBeString();

        await instance.shutdownContainer();

        // Attempt to inspect the container to ensure it's stopped and removed
        const inspectResult = spawnSync(["docker", "inspect", containerName!]);
        expect(inspectResult.exitCode).not.toBe(0); // Expecting a non-zero exit code if container is not found
    } catch (error) {
        // If an error occurs during startContainer or shutdownContainer, the test should fail
        throw error;
    }
});

test("DockerInstance creates and runs hello world Node.js script in node:latest:latest using separate functions", async () => {
    const instance = new DockerInstance();
    const image = "node:latest";
    const commands = [
        "apt-get update",
        "apt-get install -y nodejs",
        "echo 'console.log(\"Hello, World!\");' > index.js",
        "node index.js"
    ];
    let containerName: string | undefined;
    let result: any;

    try {
        containerName = await instance.startContainer(image);
        result = await instance.runCommands(commands, 300); // Increased timeout to allow for package installation
        if (result.status !== DockerRunStatus.SUCCESS) {
            console.error('Docker error output:', result.error);
        }
        expect(result.status).toBe(DockerRunStatus.SUCCESS);
        expect(result.output).toMatch(/Hello, World!/);
    } finally {
        if (containerName) {
            await instance.shutdownContainer();
        }
    }
}, 300000);



test("DockerInstance runs hello world on node:latest", async () => {
    const instance = new DockerInstance();
    const image = "node:latest";
    const commands = [
        "apt-get update && apt-get install -y nodejs",
        `echo "console.log('Hello, World!')" > /tmp/hello.js`,
        "node /tmp/hello.js"
    ];
    let containerName: string | undefined;
    let result: any;

    try {
        containerName = await instance.startContainer(image);
        result = await instance.runCommands(commands, 300);
        if (result.status !== DockerRunStatus.SUCCESS) {
            console.error('Docker error output:', result.error);
        }
        expect(result.status).toBe(DockerRunStatus.SUCCESS);
        expect(result.output).toMatch(/Hello, World!/);
    } finally {
        if (containerName) {
            await instance.shutdownContainer();
        }
    }
}, 300000);

test("DockerInstance runs multiple commands in sequence", async () => {
    const instance = new DockerInstance();
    const image = "node:20-alpine";
    let containerName: string | undefined;

    try {
        containerName = await instance.startContainer(image);

        const commands1 = ["echo 'command set 1'", "ls -l"];
        const result1 = await instance.runCommands(commands1, 30);
        if (result1.status !== DockerRunStatus.SUCCESS) {
            console.error("Test error output:", result1.error);
        }
        expect(result1.status).toBe(DockerRunStatus.SUCCESS);
        expect(result1.output).toMatch(/command set 1/);

        const commands2 = ["echo 'command set 2'", "date"];
        const result2 = await instance.runCommands(commands2, 30);
        expect(result2.status).toBe(DockerRunStatus.SUCCESS);
        expect(result2.output).toMatch(/command set 2/);

    } finally {
        if (containerName) {
            await instance.shutdownContainer();
        }
    }
}, 3000000);

        
        test("DockerInstance copies file from container", async () => {
            const instance = new DockerInstance();
            const image = "node:20-alpine";
            const commands = [`echo "Hello from container file" > /tmp/testfile.txt`];
            let containerName: string | undefined;

            try {
                containerName = await instance.startContainer(image);
                await instance.runCommands(commands, 30);
                const fileContent = await instance.copyFileFromContainer("/tmp/testfile.txt");
                expect(fileContent).toBe("Hello from container file\n");
            } finally {
                if (containerName) {
                    await instance.shutdownContainer();
                }
            }
        });

test("DockerInstance copies file to container", async () => {
    const instance = new DockerInstance();
    const image = "node:20-alpine";
    const fileContent = "console.log('Hello from copied file!');";
    const containerFilePath = "/tmp/test-script.js";
    let containerName: string | undefined;

    try {
        // Start container
        containerName = await instance.startContainer(image);

        // Copy file to container
        await instance.copyFileToContainer(fileContent, containerFilePath);

        // Verify file was copied by running it
        const result = await instance.runCommands(["node " + containerFilePath], 30);

        expect(result.status).toBe(DockerRunStatus.SUCCESS);
        expect(result.output).toMatch(/Hello from copied file!/);
    } finally {
        if (containerName) {
            await instance.shutdownContainer();
        }
    }
});

test("DockerInstance copies file to container with nested directory", async () => {
    const instance = new DockerInstance();
    const image = "node:20-alpine";
    const fileContent = '{"name": "test-app", "version": "1.0.0"}';
    const containerFilePath = "/app/nested/config/package.json";
    let containerName: string | undefined;

    try {
        // Start container
        containerName = await instance.startContainer(image);

        // Copy file to container with nested path
        await instance.copyFileToContainer(fileContent, containerFilePath);

        // Verify file was copied by reading its content
        const result = await instance.runCommands(["cat " + containerFilePath], 30);

        expect(result.status).toBe(DockerRunStatus.SUCCESS);
        expect(result.output).toContain("test-app");
        expect(result.output).toContain("1.0.0");
    } finally {
        if (containerName) {
            await instance.shutdownContainer();
        }
    }
});

test("DockerInstance handles copyFileToContainer with null container name", async () => {
    const instance = new DockerInstance();
    const fileContent = "test content";
    const containerFilePath = "/tmp/test.txt";

    // Try to copy file without starting container (containerName will be null)
    await expect(instance.copyFileToContainer(fileContent, containerFilePath)).rejects.toThrow("Container name is null, cannot copy file");
});

test("DockerInstance copies multiple files and folders to container", async () => {
    const instance = new DockerInstance();
    const image = "node:20-alpine";

    // Create a temporary directory structure for testing
    const testDir = "/tmp/test-copy-" + Math.random().toString(36).slice(2, 10);
    const subDir1 = testDir + "/subdir1";
    const subDir2 = testDir + "/subdir2/deep";

    let containerName: string | undefined;

    try {
        // Create test directory structure - ensure directories exist first
        spawnSync(["mkdir", "-p", testDir, subDir1, subDir2]);

        await Bun.write(testDir + "/index.js", "console.log('Hello from index.js');");
        await Bun.write(testDir + "/package.json", '{"name": "test-app", "version": "1.0.0"}');
        await Bun.write(testDir + "/README.md", "# Test Project\n\nThis is a test project.");

        // Create subdirectories with files
        await Bun.write(subDir1 + "/helper.js", "module.exports = { help: 'This is a helper function' };");
        await Bun.write(subDir1 + "/config.txt", "debug=true\nport=3000");
        await Bun.write(subDir2 + "/nested.js", "console.log('Deep nested file');");
        await Bun.write(subDir2 + "/data.json", '{"key": "value", "nested": {"item": true}}');

        // Verify the directory exists before proceeding
        const dirCheck = spawnSync(["ls", "-la", testDir]);
        if (dirCheck.exitCode !== 0) {
            throw new Error(`Test directory creation failed: ${testDir}`);
        }

        // Start container
        containerName = await instance.startContainer(image);

        // Copy all files and folders to container
        await instance.copyFilesToContainer(testDir, "/workspace/test-project");

        // Verify files were copied correctly by checking their contents
        const checkResults = await instance.runCommands([
            "cat /workspace/test-project/index.js",
            "cat /workspace/test-project/package.json",
            "cat /workspace/test-project/README.md",
            "cat /workspace/test-project/subdir1/helper.js",
            "cat /workspace/test-project/subdir1/config.txt",
            "cat /workspace/test-project/subdir2/deep/nested.js",
            "cat /workspace/test-project/subdir2/deep/data.json",
            "ls -la /workspace/test-project/",
            "find /workspace/test-project -type f | sort"
        ], 60);

        expect(checkResults.status).toBe(DockerRunStatus.SUCCESS);

        // Verify each file content
        expect(checkResults.output).toContain("console.log('Hello from index.js');");
        expect(checkResults.output).toContain("test-app");
        expect(checkResults.output).toContain("1.0.0");
        expect(checkResults.output).toContain("Test Project");
        expect(checkResults.output).toContain("This is a helper function");
        expect(checkResults.output).toContain("debug=true");
        expect(checkResults.output).toContain("Deep nested file");
        expect(checkResults.output).toContain("key");
        expect(checkResults.output).toContain("value");

        // Verify directory structure was preserved
        expect(checkResults.output).toContain("index.js");
        expect(checkResults.output).toContain("package.json");
        expect(checkResults.output).toContain("README.md");
        expect(checkResults.output).toContain("subdir1");
        expect(checkResults.output).toContain("subdir2");
        expect(checkResults.output).toContain("/workspace/test-project/subdir1/helper.js");
        expect(checkResults.output).toContain("/workspace/test-project/subdir2/deep/nested.js");

        console.log("✅ All files and directories copied successfully!");
    } finally {
        // Cleanup: remove test directory
        await spawnSync(["rm", "-rf", testDir]);

        if (containerName) {
            await instance.shutdownContainer();
        }
    }
}, 120000);

test("DockerInstance handles copyFilesToContainer with null container name", async () => {
    const instance = new DockerInstance();
    const testDir = "/tmp";

    // Try to copy files without starting container (containerName will be null)
    await expect(instance.copyFilesToContainer(testDir, "/tmp")).rejects.toThrow("Container name is null, cannot copy files");
});

test("DockerInstance handles copyFilesToContainer with non-existent path", async () => {
    const instance = new DockerInstance();
    const image = "node:20-alpine";
    const nonExistentPath = "/tmp/non-existent-path-" + Math.random().toString(36).slice(2, 10);

    let containerName: string | undefined;

    try {
        containerName = await instance.startContainer(image);

        // Try to copy from a non-existent path
        await expect(instance.copyFilesToContainer(nonExistentPath, "/tmp")).rejects.toThrow("Local path does not exist");
    } finally {
        if (containerName) {
            await instance.shutdownContainer();
        }
    }
});

test("DockerInstance copies single file using copyFilesToContainer", async () => {
    const instance = new DockerInstance();
    const image = "node:20-alpine";

    // Create a single test file
    const testFile = "/tmp/test-single-file-" + Math.random().toString(36).slice(2, 10) + ".js";
    const testContent = "console.log('Single file test successful!');";

    let containerName: string | undefined;

    try {
        await Bun.write(testFile, testContent);
        containerName = await instance.startContainer(image);

        // Copy single file (the directory containing the file)
        await instance.copyFilesToContainer(testFile, "/workspace");

        // Get just the filename without the path
        const fileName = testFile.split('/').pop();

        // Verify file was copied and is executable
        const result = await instance.runCommands([
            `node /workspace/${fileName}`,
            `cat /workspace/${fileName}`
        ], 30);

        expect(result.status).toBe(DockerRunStatus.SUCCESS);
        expect(result.output).toContain("Single file test successful!");
        expect(result.output).toContain("console.log('Single file test successful!');");
    } finally {
        // Cleanup
        await spawnSync(["rm", "-f", testFile]);

        if (containerName) {
            await instance.shutdownContainer();
        }
    }
});