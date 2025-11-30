
import { codingStyles } from './prompts/codingStylePrompt';

export function getCodingStyle(
    level: number,
): string {
    if (level === 0) {
        return "There is no specific coding style, please keep using the original coding style.";
    }
    const levelIndex = level - 1;
    if (levelIndex >= 0 && levelIndex < codingStyles.length) {
        return codingStyles[levelIndex].content;
    }

    return `Coding style for level ${level} not found.`;
}

export { codingStyles } from './prompts/codingStylePrompt';
