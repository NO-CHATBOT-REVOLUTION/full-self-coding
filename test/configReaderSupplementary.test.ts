import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import * as fs from 'fs';
import * as path from 'path';
import { ConfigReader, readConfig } from '../src/core/configReader';
import { SWEAgentType } from '../src/core/config';
import { WorkStyle } from '../src/core/workStyle';

describe('ConfigReader with Supplementary Configuration', () => {
    const testDir = process.cwd(); // Should be the project root
    const supplementaryConfigPath = path.join(testDir, '.fsc', 'config.json');

    // Test configuration data
    const testConfig = {
        agentType: "claude-code",
        maxDockerContainers: 10,
        maxParallelDockerContainers: 3,
        dockerTimeoutSeconds: 600,
        dockerMemoryMB: 1024,
        anthropicAPIKey: "supplementary-anthropic-key-from-project-config",
        workStyle: "bold_genius",
        customizedWorkStyle: "Focus on speed and efficiency while maintaining code quality"
    };

    beforeAll(() => {
        // Create .fsc directory if it doesn't exist
        const fscDir = path.join(testDir, '.fsc');
        if (!fs.existsSync(fscDir)) {
            fs.mkdirSync(fscDir, { recursive: true });
        }

        // Create test config.json
        fs.writeFileSync(supplementaryConfigPath, JSON.stringify(testConfig, null, 2));
        console.log(`Created test config at: ${supplementaryConfigPath}`);
    });

    afterAll(() => {
        // Clean up: remove test config.json and .fsc directory if empty
        try {
            if (fs.existsSync(supplementaryConfigPath)) {
                fs.unlinkSync(supplementaryConfigPath);
                console.log(`Removed test config at: ${supplementaryConfigPath}`);
            }

            // Try to remove .fsc directory if it's empty
            const fscDir = path.join(testDir, '.fsc');
            try {
                const files = fs.readdirSync(fscDir);
                if (files.length === 0) {
                    fs.rmdirSync(fscDir);
                    console.log(`Removed empty .fsc directory`);
                }
            } catch (error) {
                console.log(`Could not remove .fsc directory (may contain other files)`);
            }
        } catch (error) {
            console.warn(`Warning: Could not clean up test config files: ${error}`);
        }
    });

    test('should load supplementary configuration when main config does not exist', () => {
        const reader = new ConfigReader({
            configDir: '/tmp/non-existent-config-dir',
            throwOnMissing: false
        });

        const config = reader.readConfig();

        // Should load from supplementary config
        expect(config.agentType).toBe(SWEAgentType.CLAUDE_CODE);
        expect(config.maxDockerContainers).toBe(10);
        expect(config.maxParallelDockerContainers).toBe(3);
        expect(config.dockerTimeoutSeconds).toBe(600);
        expect(config.dockerMemoryMB).toBe(1024);
        expect(config.anthropicAPIKey).toBe('supplementary-anthropic-key-from-project-config');
        expect(config.workStyle).toBe(WorkStyle.BOLDGENIUS);
        expect(config.customizedWorkStyle).toBe('Focus on speed and efficiency while maintaining code quality');
    });

    test('should merge main config with supplementary config (supplementary takes precedence)', () => {
        // Create a temporary main config file
        const tempConfigDir = '/tmp/test-config-main';
        const tempConfigPath = path.join(tempConfigDir, 'config.json');

        fs.mkdirSync(tempConfigDir, { recursive: true });

        const mainConfig = {
            agentType: 'gemini-cli',
            maxDockerContainers: 5,
            dockerMemoryMB: 512,
            googleGeminiApiKey: 'main-config-key'
        };

        fs.writeFileSync(tempConfigPath, JSON.stringify(mainConfig, null, 2));

        try {
            const reader = new ConfigReader({
                configDir: tempConfigDir,
                throwOnMissing: false
            });

            const config = reader.readConfig();

            // Supplementary config should override main config
            expect(config.agentType).toBe(SWEAgentType.CLAUDE_CODE); // From supplementary (overrides main)
            expect(config.maxDockerContainers).toBe(10); // From supplementary (overrides main)
            expect(config.maxParallelDockerContainers).toBe(3); // From supplementary only
            expect(config.dockerMemoryMB).toBe(1024); // From supplementary (overrides main)
            expect(config.dockerTimeoutSeconds).toBe(600); // From supplementary only
            expect(config.googleGeminiApiKey).toBe('main-config-key'); // From main only
            expect(config.anthropicAPIKey).toBe('supplementary-anthropic-key-from-project-config'); // From supplementary only

        } finally {
            // Cleanup
            fs.rmSync(tempConfigDir, { recursive: true, force: true });
        }
    });

    test('should handle invalid supplementary config gracefully', () => {
        // Create an invalid supplementary config temporarily
        const backupContent = fs.readFileSync(supplementaryConfigPath, 'utf8');

        try {
            // Write invalid JSON
            fs.writeFileSync(supplementaryConfigPath, '{ invalid json }');

            const reader = new ConfigReader({
                configDir: '/tmp/non-existent-config-dir',
                throwOnMissing: false
            });

            // Should not crash and should fall back to defaults
            const config = reader.readConfig();
            expect(config).toBeDefined();

        } finally {
            // Restore original config
            fs.writeFileSync(supplementaryConfigPath, backupContent);
        }
    });

    test('should work with convenience functions', () => {
        const config = readConfig({
            configDir: '/tmp/non-existent-config-dir',
            throwOnMissing: false
        });

        expect(config.agentType).toBe(SWEAgentType.CLAUDE_CODE);
        expect(config.maxDockerContainers).toBe(10);
    });

    test('should read supplementary config from correct relative path', () => {
        const reader = new ConfigReader({
            configDir: '/tmp/non-existent-config-dir',
            throwOnMissing: false
        });

        const config = reader.readConfig();

        // Verify it's reading from the project's .fsc/config.json
        const expectedPath = path.resolve(process.cwd(), '.fsc', 'config.json');
        expect(fs.existsSync(expectedPath)).toBe(true);

        // Verify we got the expected values from the supplementary config
        expect(config.customizedWorkStyle).toBe('Focus on speed and efficiency while maintaining code quality');
    });

    test('should be able to disable supplementary config reading', () => {
        const reader = new ConfigReader({
            configDir: '/tmp/non-existent-config-dir',
            throwOnMissing: false,
            readSupplementaryConfig: false
        });

        const config = reader.readConfig();

        // Should get default config when supplementary config is disabled and no main config exists
        expect(config.agentType).toBe(SWEAgentType.CLAUDE_CODE); // From default config
        expect(config.maxDockerContainers).toBe(10); // From default config
        expect(config.customizedWorkStyle).toBe(undefined); // Should not have supplementary config values
    });
});