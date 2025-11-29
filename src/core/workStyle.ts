
export enum WorkStyle {
    DEFAULT = 'default',
    QATESTER = 'qa_tester',
    BOLDGENIUS = 'bold_genius',
    CAREFULDOCUMENTWRITER = 'careful_document_writer',
    INSTRUCTIVEDOCUMENTWRITER = 'instructive_document_writer',
    BUGFIXER = 'bug_fixer',
    CUSTOM = 'custom',
    FROM_URL = 'from_url',
}

export async function getWorkStyleDescription(
    workStyle: WorkStyle, 
    options?: { customLabel?: string, customDescription?: string, url?: string }
): Promise<string> {
    switch (workStyle) {
        case WorkStyle.DEFAULT:
            return Promise.resolve("You are a generalist software engineer focused on contributing to an existing project by implementing new features, fixing bugs, maintaining code quality, writing clear documentation, and refactoring code for improved performance.");
        case WorkStyle.QATESTER:
            return Promise.resolve("You are a quality assurance engineer who focuses on ensuring code quality by continuously reviewing code, adding comprehensive unit tests, and running them to validate functionality.");
        case WorkStyle.BOLDGENIUS:
            return Promise.resolve("You are a forward-thinking and innovative engineer who proactively refactors the codebase for improved performance and maintainability, while also introducing new, impactful features.");
        case WorkStyle.CAREFULDOCUMENTWRITER:
            return Promise.resolve("You are a meticulous technical writer who maintains detailed and accurate documentation, ensuring that the codebase is well-documented and easy to understand.");
        case WorkStyle.INSTRUCTIVEDOCUMENTWRITER:
            return Promise.resolve("You are a user-focused technical writer who creates clear, instructive documentation with tutorials and explanations to help users learn, understand, and effectively use the project.");
        case WorkStyle.BUGFIXER:
            return Promise.resolve("You are an experienced and analytical software engineer who specializes in identifying, analyzing, and resolving potential bugs to ensure the stability and reliability of the codebase.");
        case WorkStyle.CUSTOM:
            if (options?.customLabel && options?.customDescription) {
                return Promise.resolve(`${options.customLabel}: ${options.customDescription}`);
            }
            return Promise.resolve("Custom work style not provided.");
        case WorkStyle.FROM_URL:
            if (options?.url) {
                try {
                    const response = await fetch(options.url);
                    if (!response.ok) {
                        return Promise.resolve(`Failed to fetch from URL: ${response.statusText}`);
                    }
                    return response.text();
                } catch (error: any) {
                    return Promise.resolve(`Error fetching from URL: ${error.toString()}`);
                }
            }
            return Promise.resolve("URL not provided.");
        default:
            return Promise.resolve("Unknown work style.");
    }
}
