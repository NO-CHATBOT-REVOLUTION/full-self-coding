
import { expect, test } from "bun:test";
import { DockerInstance } from "../src/core/dockerInstance";

test("DockerInstance creates a file, copies it from the container, and reads the content", async () => {
    const instance = new DockerInstance();
    const image = "node:20-alpine";
    const commands = [`echo "Hello from a file in the container" > /tmp/testfile.txt`];
    let containerName: string | undefined;

    try {
        containerName = await instance.startContainer(image);
        await instance.runCommands(commands, 30);
        const fileContent = await instance.copyFileFromContainer("/tmp/testfile.txt");
        expect(fileContent).toBe("Hello from a file in the container\n");
    } finally {
        if (containerName) {
            await instance.shutdownContainer();
        }
    }
});
