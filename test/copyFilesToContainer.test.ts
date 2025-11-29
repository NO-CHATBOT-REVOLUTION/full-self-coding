import { expect, test } from "bun:test";
import { spawnSync } from "bun";
import { DockerInstance } from "../src/core/dockerInstance";

test("DockerInstance copyFilesToContainer basic functionality", async () => {
    const instance = new DockerInstance();
    const image = "node:20-alpine";

    // Create a simple test directory structure
    const testDir = "/tmp/basic-copy-test";
    const testFile = testDir + "/test.txt";

    let containerName: string | undefined;

    try {
        // Create directory and file
        spawnSync(["mkdir", "-p", testDir]);
        await Bun.write(testFile, "Hello, this is a test file!");

        // Verify file exists locally
        const localFileExists = await Bun.file(testFile).exists();
        expect(localFileExists).toBe(true);

        // Start container
        containerName = await instance.startContainer(image);

        // Copy directory to container
        await instance.copyFilesToContainer(testDir, "/workspace");

        // Verify file was copied and has correct content
        const result = await instance.runCommands(["cat /workspace/test.txt"], 30);

        expect(result.status).toBe("success");
        expect(result.output).toContain("Hello, this is a test file!");

        console.log("✅ Basic copyFilesToContainer test passed!");

    } finally {
        // Cleanup
        spawnSync(["rm", "-rf", testDir]);

        if (containerName) {
            await instance.shutdownContainer();
        }
    }
}, 60000);