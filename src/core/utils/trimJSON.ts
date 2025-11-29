/**
 * Trims a string to extract a valid JSON object.
 * It removes all text before the first '{' and after the last '}'.
 * 
 * @param jsonString The string containing the JSON object.
 * @returns A string containing only the JSON object, or an empty string if no valid JSON object is found.
 */
export function trimJSONObjectArray(jsonString: string): string {
    const firstBrace = jsonString.indexOf('[');
    const lastBrace = jsonString.lastIndexOf(']');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        return '';
    }

    return jsonString.substring(firstBrace, lastBrace + 1);
}

export function trimJSONSingleObject(jsonString: string): string {
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        return '';
    }

    return jsonString.substring(firstBrace, lastBrace + 1);
}